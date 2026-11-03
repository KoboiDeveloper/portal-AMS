import React, { useEffect, useState } from "react";
import { Modal, ModalBody } from "reactstrap";
import { toast } from "react-toastify";
import { Icon } from "../../../components/Component";
import { getDgsReturImageLink, getDgsReturItem, postDgsReturConfirm } from "../../../services/dgs/dgs.service";
import { isSuccess } from "../../../lib/response";
import { cellOf, errMsg, fmtYmd, todayYmd } from "./dgsUtils";
import "./dgs.css";

const KATEGORI = [
  { value: "Barang Layak Jual", label: "Barang Layak Jual (siap dijual kembali)" },
  { value: "Barang Tidak Layak Jual", label: "Barang Tidak Layak Jual" },
  { value: "Barang Tidak Sesuai", label: "Barang Tidak Sesuai" },
  { value: "Barang Tidak Kembali", label: "Barang Tidak Kembali" },
  { value: "Batal Retur", label: "Batal Retur" },
];

const IDX = [1, 2, 3, 4, 5];

/** Konfirmasi retur gudang per item (invoice + PLU), foto ke Dropbox. */
const DgsReturConfirmModal = ({ isOpen, invoice, plu, deskripsi, onClose, onSaved }) => {
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tgl, setTgl] = useState("");
  const [kategori, setKategori] = useState("Barang Layak Jual");
  const [ket, setKet] = useState("");
  const [files, setFiles] = useState({});
  const [existing, setExisting] = useState({}); // idx -> {name, url}

  useEffect(() => {
    if (!isOpen || !invoice || !plu) return undefined;
    let alive = true;
    setLoading(true);
    setError("");
    setFiles({});
    setExisting({});
    getDgsReturItem({ invoice, plu })
      .then(async (res) => {
        if (!alive) return;
        if (!isSuccess(res)) {
          setError(res?.responseMessage || "Gagal memuat item retur");
          return;
        }
        const r = res.data || {};
        setTgl(fmtYmd(cellOf(r, "TANGGAL_KEMBALI")) || todayYmd());
        const k = String(cellOf(r, "KATEGORI_BARANG_KEMBALI") || "");
        setKategori(KATEGORI.some((o) => o.value === k) ? k : "Barang Layak Jual");
        setKet(String(cellOf(r, "KETERANGAN_GUDANG") || ""));
        const ex = {};
        await Promise.all(
          IDX.map(async (i) => {
            const name = String(cellOf(r, `IMAGE${i}`) || "");
            if (!name || name === "no_image.png") return;
            ex[i] = { name, url: "" };
            if (name.startsWith("/uploads/dgs-retur/")) {
              try {
                const lk = await getDgsReturImageLink(name);
                if (isSuccess(lk)) ex[i].url = lk.data?.link || "";
              } catch (e) {
                /* preview optional */
              }
            }
          })
        );
        if (alive) setExisting(ex);
      })
      .catch((e) => alive && setError(errMsg(e, "Gagal memuat item retur")))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [isOpen, invoice, plu]);

  const isBatal = kategori === "Batal Retur";
  const showImages = kategori !== "Barang Layak Jual" && !isBatal;

  const submit = async () => {
    if (!isBatal && !tgl) {
      setError("Tanggal kembali wajib diisi");
      return;
    }
    if (ket.length > 200) {
      setError("Keterangan maksimal 200 karakter");
      return;
    }
    for (const i of IDX) {
      if (files[i] && files[i].size > 10 * 1024 * 1024) {
        setError(`Foto ${i} melebihi 10MB`);
        return;
      }
    }
    const fd = new FormData();
    fd.append("invoice", invoice);
    fd.append("plu", plu);
    fd.append("tanggal_kembali", tgl || "");
    fd.append("kategori", kategori);
    fd.append("keterangan", ket.trim());
    if (showImages) IDX.forEach((i) => files[i] && fd.append(`image${i}`, files[i]));
    setBusy(true);
    setError("");
    try {
      const res = await postDgsReturConfirm(fd);
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal menyimpan konfirmasi retur");
        return;
      }
      toast.success("Konfirmasi retur tersimpan");
      onSaved?.();
      onClose?.();
    } catch (e) {
      setError(errMsg(e, "Gagal menyimpan konfirmasi retur"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={onClose} className="modal-dialog-centered rsd-detail-modal" size="lg" contentClassName="dgs-modal-content">
      <div className="rsd-detail-hero">
        <div>
          <h5 className="rsd-detail-title">Konfirmasi Retur</h5>
          <p className="rsd-detail-sub">
            {invoice} · PLU {plu}
            {deskripsi ? ` · ${deskripsi}` : ""}
          </p>
        </div>
        <button type="button" className="btn btn-icon btn-trigger" onClick={onClose} aria-label="Tutup">
          <Icon name="cross" />
        </button>
      </div>
      <ModalBody className="rsd-detail-body dgs-modal-body">
        {error ? <div className="reg-ar-err">{error}</div> : null}
        {loading ? (
          <div className="dgs-hint">Memuat…</div>
        ) : (
          <>
            <div className="dgs-form-grid">
              <div className="dgs-field">
                <label>Kategori Barang</label>
                <select className="form-control" value={kategori} onChange={(e) => setKategori(e.target.value)}>
                  {KATEGORI.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              {!isBatal ? (
                <div className="dgs-field">
                  <label>Tanggal Kembali</label>
                  <input type="date" className="form-control" value={tgl} onChange={(e) => setTgl(e.target.value)} />
                </div>
              ) : null}
            </div>
            <div className="dgs-field">
              <label>Keterangan ({ket.length}/200)</label>
              <textarea
                className="form-control"
                rows={2}
                maxLength={200}
                value={ket}
                onChange={(e) => setKet(e.target.value)}
              />
            </div>

            {showImages ? (
              <>
                <div className="dgs-section-title mt-3">
                  Foto Retur <small>(opsional, maks 10MB per foto)</small>
                </div>
                <div className="dgs-img-row">
                  {IDX.map((i) => (
                    <div key={i} className="dgs-img-slot">
                      {files[i] ? (
                        <img src={URL.createObjectURL(files[i])} alt={`Foto ${i}`} />
                      ) : existing[i]?.url ? (
                        <a href={existing[i].url} target="_blank" rel="noreferrer">
                          <img src={existing[i].url} alt={`Foto ${i}`} />
                        </a>
                      ) : (
                        <div className="ph">{existing[i] ? existing[i].name.split("/").pop() : "Belum ada"}</div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          setFiles((s) => ({ ...s, [i]: f || undefined }));
                        }}
                      />
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </>
        )}
      </ModalBody>
      <div className="dgs-modal-foot">
          <span className="dgs-spacer" />
          <button type="button" className="dgs-btn dgs-btn--ghost" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="dgs-btn" disabled={busy || loading} onClick={submit}>
            {busy ? "Menyimpan…" : "Simpan"}
          </button>
      </div>
    </Modal>
  );
};

export default DgsReturConfirmModal;
