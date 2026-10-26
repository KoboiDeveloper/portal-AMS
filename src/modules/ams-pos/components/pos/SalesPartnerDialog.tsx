import { useEffect, useMemo, useState } from "react";
import { Search, UserRound, UserRoundX, X } from "lucide-react";
import { Dialog, DialogContent } from "../ui/dialog";
import { useStoreScope } from "../../../../hooks/useStoreScope";
import { getActiveSalesPartners } from "../../lib/sales-partner-api";
import type { SalesPartner } from "../../types/pos";

type SalesPartnerDialogProps = {
  selected: SalesPartner | null;
  onSelect: (partner: SalesPartner | null) => void;
  required?: boolean;
};

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function PartnerAvatar({
  partner,
  size = "sm",
}: {
  partner: Pick<SalesPartner, "name" | "photoUrl">;
  size?: "sm" | "md";
}) {
  const [failed, setFailed] = useState(!partner.photoUrl);
  useEffect(() => {
    setFailed(!partner.photoUrl);
  }, [partner.photoUrl]);

  return (
    <div className={`pos-sp-avatar${size === "md" ? " is-md" : ""}`}>
      {!failed && partner.photoUrl ? (
        <img src={partner.photoUrl} alt="" onError={() => setFailed(true)} />
      ) : (
        <span>{initials(partner.name)}</span>
      )}
    </div>
  );
}

export function SalesPartnerDialog({
  selected,
  onSelect,
  required = false,
}: SalesPartnerDialogProps) {
  const { storeId } = useStoreScope();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [partners, setPartners] = useState<SalesPartner[]>([]);

  useEffect(() => {
    if (!open) return;
    const id = storeId || "";
    if (!id) {
      setError("Store belum dipilih");
      setPartners([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    getActiveSalesPartners(id)
      .then((items) => {
        if (!cancelled) setPartners(items);
      })
      .catch((err: { message?: string }) => {
        if (!cancelled) {
          setPartners([]);
          setError(err?.message || "Gagal memuat sales partner");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, storeId]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return partners;
    return partners.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.nik.toLowerCase().includes(q) ||
        item.jabatan.toLowerCase().includes(q)
    );
  }, [partners, query]);

  const pick = (partner: SalesPartner) => {
    onSelect(partner);
    setOpen(false);
  };

  return (
    <>
      {selected ? (
        <div className="pos-member-chip is-sp">
          <PartnerAvatar partner={selected} />
          <button type="button" className="pos-member-chip__name" onClick={() => setOpen(true)}>
            <span className="pos-member-chip__kicker">Sales partner</span>
            <span className="pos-member-chip__label">{selected.name}</span>
            <span className="pos-member-chip__meta">{selected.nik}</span>
          </button>
          <button
            type="button"
            className="pos-member-chip__clear"
            title="Hapus sales partner"
            onClick={() => onSelect(null)}
          >
            <UserRoundX size={16} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={`pos-member-trigger is-sp${required ? " is-required" : ""}`}
          onClick={() => setOpen(true)}
        >
          <UserRound size={16} />
          {required ? "Pilih sales partner (wajib)" : "Pilih sales partner"}
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="pos-member-dialog pos-sp-dialog"
          hideCloseButton
          accessibleTitle="Pilih sales partner"
        >
          <div className="pos-member-dialog__header">
            <div className="pos-member-dialog__title">
              <UserRound size={18} />
              Pilih Sales Partner
            </div>
            <button
              type="button"
              className="pos-member-dialog__close"
              onClick={() => setOpen(false)}
              aria-label="Tutup"
            >
              <X size={16} />
            </button>
          </div>

          <div className="pos-member-dialog__search">
            <div className="pos-member-dialog__search-wrap">
              <Search size={16} className="pos-member-dialog__search-icon" />
              <input
                className="pos-member-dialog__input"
                placeholder="Cari nama atau NIK"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                autoFocus
              />
            </div>
            <p className="pos-member-dialog__count">
              {loading
                ? "Memuat karyawan aktif…"
                : `${filtered.length} karyawan aktif`}
            </p>
          </div>

          <div className="pos-member-dialog__list">
            {error ? (
              <div className="pos-member-dialog__empty">
                <p>{error}</p>
              </div>
            ) : loading ? (
              <div className="pos-member-dialog__empty">
                <p>Memuat data karyawan…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="pos-member-dialog__empty">
                <p>{query ? "Karyawan tidak ditemukan" : "Tidak ada karyawan aktif"}</p>
              </div>
            ) : (
              filtered.map((item) => {
                const isActive = selected?.nik === item.nik;
                return (
                  <button
                    key={item.nik}
                    type="button"
                    className={`pos-member-dialog__item${isActive ? " is-active" : ""}`}
                    onClick={() => pick(item)}
                  >
                    <PartnerAvatar partner={item} size="md" />
                    <div className="pos-member-dialog__item-body">
                      <div className="pos-member-dialog__item-top">
                        <strong className="pos-member-dialog__item-name">{item.name}</strong>
                      </div>
                      <div className="pos-member-dialog__item-addr">
                        {item.nik}
                        {item.jabatan ? ` · ${item.jabatan}` : ""}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
