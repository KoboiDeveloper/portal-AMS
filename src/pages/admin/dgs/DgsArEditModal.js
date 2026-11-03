import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, ModalBody } from "reactstrap";
import { toast } from "react-toastify";
import { Icon } from "../../../components/Component";
import { getDgsAr, postDgsArSave } from "../../../services/dgs/dgs.service";
import { isSuccess } from "../../../lib/response";
import { calcItem, cellOf, errMsg, fmtDec, fmtNum, fmtYmd } from "./dgsUtils";
import "./dgs.css";

const FEE_FIELDS = [
  ["ONGKIR", "Ongkir"],
  ["PAYMENT_GATEWAY", "Payment Gateway"],
  ["BIAYA_LAYANAN", "Biaya Layanan"],
  ["PREMI", "Premi"],
  ["BIAYA_PROGRAM", "Biaya Program"],
  ["KOMISI_AFFILIATE", "Komisi Affiliate"],
  ["BIAYA_TRANSAKSI", "Biaya Transaksi"],
  ["BIAYA_PROSES_PESANAN", "Biaya Proses Pesanan"],
  ["KOMISI_DINAMIS", "Komisi Dinamis"],
];

const toNum = (v) => {
  if (v === "" || v == null) return 0;
  const n = Number(String(v).replace(/,/g, "."));
  return Number.isFinite(n) ? n : 0;
};

const truthy = (v) => v === true || v === 1 || String(v).toLowerCase() === "true" || String(v) === "1";

/** AR header + item grid (legacy cart.aspx). `trId` = ID_TR_SALES_HEADER. */
const DgsArEditModal = ({ isOpen, trId, onClose, onSaved }) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState({});
  const [exists, setExists] = useState(false);
  const [form, setForm] = useState({});
  const [items, setItems] = useState([]);

  const load = useCallback(async () => {
    if (!trId) return;
    setLoading(true);
    setError("");
    try {
      const res = await getDgsAr(trId);
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal memuat AR");
        return;
      }
      const d = res.data || {};
      const h = d.header || {};
      const pre = d.prasales || {};
      setMeta(pre);
      setExists(Boolean(d.exists));
      const f = {
        NO_ORDER: cellOf(h, "NO_ORDER") || cellOf(pre, "NO_INVOICE") || "",
        NOMOR_RESI: cellOf(h, "NOMOR_RESI") || cellOf(pre, "NO_RESI") || "",
        TGL_PO: fmtYmd(cellOf(h, "TGL_PO")),
        TGL_KIRIM: fmtYmd(cellOf(h, "TGL_KIRIM")),
        TGL_SAMPAI: fmtYmd(cellOf(h, "TGL_SAMPAI")),
        TIPE_ONGKIR: String(cellOf(h, "TIPE_ONGKIR") || "NORMAL").toUpperCase(),
        DPP_CHECK: truthy(cellOf(h, "DPP_CHECK")),
        PPN_CHECK: truthy(cellOf(h, "PPN_CHECK")),
        TOTALAR: cellOf(h, "TOTALAR"),
        STATUS_CHECKING: cellOf(h, "STATUS_CHECKING"),
      };
      FEE_FIELDS.forEach(([k]) => {
        f[k] = cellOf(h, k) === "" ? "" : String(Number(cellOf(h, k)));
      });
      setForm(f);
      setItems(
        (d.items || []).map((it) => ({
          ...it,
          HARGA_JUAL: Number(it.HARGA_JUAL || 0),
          DISKON: Number(it.DISKON || 0),
          SUBSIDI: Number(it.SUBSIDI || 0),
          KOMISI: Number(it.KOMISI || 0),
        }))
      );
    } catch (e) {
      setError(errMsg(e, "Gagal memuat AR"));
    } finally {
      setLoading(false);
    }
  }, [trId]);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  const mp = String(cellOf(meta, "NAMA_MP") || "").toUpperCase();
  const setF = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const setItem = (idx, k, v) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [k]: v } : it)));

  const computed = useMemo(
    () =>
      items.map((it) => {
        const c = calcItem(mp, it.QTY, toNum(it.HARGA_JUAL), toNum(it.DISKON), toNum(it.SUBSIDI), toNum(it.KOMISI));
        return c || { ...it };
      }),
    [items, mp]
  );
  const hasFormula = items.length > 0 && calcItem(mp, 1, 0, 0, 0, 0) != null;
  const sums = useMemo(
    () =>
      computed.reduce(
        (a, c) => ({
          TOTAL_SALES: a.TOTAL_SALES + Number(c.TOTAL_SALES || 0),
          KOMISI_AWAL: a.KOMISI_AWAL + Number(c.KOMISI_AWAL || 0),
          KOMISI_NILAI: a.KOMISI_NILAI + Number(c.KOMISI_NILAI || 0),
          PPN: a.PPN + Number(c.PPN || 0),
          PPH23: a.PPH23 + Number(c.PPH23 || 0),
          TOTAL: a.TOTAL + Number(c.TOTAL || 0),
        }),
        { TOTAL_SALES: 0, KOMISI_AWAL: 0, KOMISI_NILAI: 0, PPN: 0, PPH23: 0, TOTAL: 0 }
      ),
    [computed]
  );

  const save = async () => {
    if (!String(form.NO_ORDER || "").trim()) {
      toast.warn("No order wajib diisi");
      return;
    }
    const payload = {
      id_tr_sales_header: trId,
      no_order: String(form.NO_ORDER).trim(),
      nomor_resi: String(form.NOMOR_RESI || "").trim(),
      tgl_po: form.TGL_PO || "",
      tgl_kirim: form.TGL_KIRIM || "",
      tgl_sampai: form.TGL_SAMPAI || "",
      tipe_ongkir: form.TIPE_ONGKIR,
      ongkir: toNum(form.ONGKIR),
      payment_gateway: toNum(form.PAYMENT_GATEWAY),
      biaya_layanan: toNum(form.BIAYA_LAYANAN),
      premi: toNum(form.PREMI),
      biaya_program: toNum(form.BIAYA_PROGRAM),
      komisi_affiliate: toNum(form.KOMISI_AFFILIATE),
      biaya_transaksi: toNum(form.BIAYA_TRANSAKSI),
      biaya_proses_pesanan: toNum(form.BIAYA_PROSES_PESANAN),
      komisi_dinamis: toNum(form.KOMISI_DINAMIS),
      check_dpp: Boolean(form.DPP_CHECK),
      check_ppn: Boolean(form.PPN_CHECK),
      items: items
        .filter((it) => Number(it.ID) > 0)
        .map((it) => ({
          id: Number(it.ID),
          harga_jual: toNum(it.HARGA_JUAL),
          diskon: toNum(it.DISKON),
          subsidi: toNum(it.SUBSIDI),
          komisi: toNum(it.KOMISI),
        })),
    };
    setSaving(true);
    try {
      const res = await postDgsArSave(payload);
      if (!isSuccess(res)) {
        toast.error(res?.responseMessage || "Gagal menyimpan");
        return;
      }
      toast.success(res.data?.mode === "INSERT" ? "AR dibuat" : "AR disimpan");
      onSaved?.();
      onClose?.();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  const numInput = (k, label) => (
    <div className="dgs-field" key={k}>
      <label>{label}</label>
      <input
        type="number"
        step="any"
        className="form-control form-control-sm"
        value={form[k] ?? ""}
        onChange={(e) => setF(k, e.target.value)}
      />
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      toggle={onClose}
      size="xl"
      className="modal-dialog-centered rsd-detail-modal dgs-modal-xl"
      contentClassName="dgs-modal-content"
    >
      <div className="rsd-detail-hero">
        <div>
          <h5 className="rsd-detail-title">{exists ? "Edit AR" : "Input AR"}</h5>
          <p className="rsd-detail-sub">
            {[cellOf(meta, "NO_INVOICE"), mp, cellOf(meta, "ID_STORE")].filter(Boolean).join(" · ")}
            {form.STATUS_CHECKING ? ` · ${form.STATUS_CHECKING}` : ""}
          </p>
        </div>
        <button type="button" className="btn btn-icon btn-trigger" onClick={onClose} aria-label="Tutup">
          <Icon name="cross" />
        </button>
      </div>
      <ModalBody className="rsd-detail-body dgs-modal-body">
        {error ? <div className="reg-ar-err">{error}</div> : null}
        {loading ? <div className="text-soft small mb-2">Memuat…</div> : null}

        {!loading && !error ? (
          <>
            <div className="dgs-mini-kpis">
              <div>
                <span>Total Sales</span>
                <strong>{fmtDec(sums.TOTAL_SALES)}</strong>
              </div>
              <div>
                <span>Komisi</span>
                <strong>{fmtNum(sums.KOMISI_AWAL)}</strong>
              </div>
              <div>
                <span>DPP Komisi</span>
                <strong>{fmtNum(sums.KOMISI_NILAI)}</strong>
              </div>
              <div>
                <span>PPN</span>
                <strong>{fmtNum(sums.PPN)}</strong>
              </div>
              <div>
                <span>PPh23</span>
                <strong>{fmtNum(sums.PPH23)}</strong>
              </div>
              <div>
                <span>Total Item</span>
                <strong>{fmtNum(sums.TOTAL)}</strong>
              </div>
              <div className="is-main">
                <span>Total AR (tersimpan)</span>
                <strong>{form.TOTALAR === "" || form.TOTALAR == null ? "—" : fmtNum(form.TOTALAR)}</strong>
              </div>
            </div>

            <section className="dgs-sec">
              <h6 className="dgs-sec-title">Pengiriman</h6>
              <div className="dgs-sec-grid">
                <div className="dgs-field">
                  <label>No Order</label>
                  <input
                    className="form-control form-control-sm"
                    value={form.NO_ORDER || ""}
                    maxLength={64}
                    onChange={(e) => setF("NO_ORDER", e.target.value)}
                  />
                </div>
                <div className="dgs-field">
                  <label>No Resi</label>
                  <input
                    className="form-control form-control-sm"
                    value={form.NOMOR_RESI || ""}
                    maxLength={50}
                    onChange={(e) => setF("NOMOR_RESI", e.target.value)}
                  />
                </div>
                {[
                  ["TGL_PO", "Tgl PO"],
                  ["TGL_KIRIM", "Tgl Kirim"],
                  ["TGL_SAMPAI", "Tgl Sampai"],
                ].map(([k, label]) => (
                  <div className="dgs-field" key={k}>
                    <label>{label}</label>
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={form[k] || ""}
                      onChange={(e) => setF(k, e.target.value)}
                    />
                  </div>
                ))}
                <div className="dgs-field">
                  <label>Tipe Ongkir</label>
                  <select
                    className="form-control form-control-sm"
                    value={form.TIPE_ONGKIR || "NORMAL"}
                    onChange={(e) => setF("TIPE_ONGKIR", e.target.value)}
                  >
                    <option value="NORMAL">NORMAL</option>
                    <option value="SUBSIDI">SUBSIDI</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="dgs-sec">
              <h6 className="dgs-sec-title">
                Biaya
                <span className="dgs-sec-checks">
                  <label>
                    <input
                      type="checkbox"
                      checked={Boolean(form.DPP_CHECK)}
                      onChange={(e) => setF("DPP_CHECK", e.target.checked)}
                    />{" "}
                    DPP
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={Boolean(form.PPN_CHECK)}
                      onChange={(e) => setF("PPN_CHECK", e.target.checked)}
                    />{" "}
                    PPN
                  </label>
                </span>
              </h6>
              <div className="dgs-sec-grid">{FEE_FIELDS.map(([k, label]) => numInput(k, label))}</div>
            </section>

            <section className="dgs-sec dgs-sec--flush">
              <h6 className="dgs-sec-title dgs-sec-title--pad">
                Item
                <small>
                  {hasFormula ? `rumus komisi ${mp}` : `${mp || "marketplace"} tanpa rumus otomatis`}
                </small>
              </h6>
              <div className="dgs-table-wrap">
                <table className="dgs-table dgs-table--items">
                  <thead>
                    <tr>
                      <th>PLU</th>
                      <th>Deskripsi</th>
                      <th className="num">Qty</th>
                      <th className="num">Harga POS</th>
                      <th className="num">Harga MP</th>
                      <th className="num">Diskon</th>
                      <th className="num">Subsidi</th>
                      <th className="num">Komisi %</th>
                      <th className="num">Total Sales</th>
                      <th className="num">Komisi</th>
                      <th className="num">DPP</th>
                      <th className="num">PPN</th>
                      <th className="num">PPh23</th>
                      <th className="num">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, i) => {
                      const c = computed[i];
                      const editable = Number(it.ID) > 0;
                      const inp = (k) => (
                        <input
                          type="number"
                          step="any"
                          className="form-control form-control-sm dgs-cell-input"
                          disabled={!editable}
                          value={it[k]}
                          onChange={(e) => setItem(i, k, e.target.value)}
                        />
                      );
                      return (
                        <tr key={cellOf(it, "ID_TR_SALES_DETAIL") || i}>
                          <td>{cellOf(it, "PLU")}</td>
                          <td className="dgs-desc">{cellOf(it, "DESKRIPSI")}</td>
                          <td className="num">{fmtNum(it.QTY)}</td>
                          <td className="num">{fmtNum(it.PRICE_POS)}</td>
                          <td className="num">{inp("HARGA_JUAL")}</td>
                          <td className="num">{inp("DISKON")}</td>
                          <td className="num">{inp("SUBSIDI")}</td>
                          <td className="num">{inp("KOMISI")}</td>
                          <td className="num">{fmtDec(c.TOTAL_SALES)}</td>
                          <td className="num">{fmtNum(c.KOMISI_AWAL)}</td>
                          <td className="num">{fmtNum(c.KOMISI_NILAI)}</td>
                          <td className="num">{fmtNum(c.PPN)}</td>
                          <td className="num">{fmtNum(c.PPH23)}</td>
                          <td className="num">{fmtNum(c.TOTAL)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={8}>TOTAL</td>
                      <td className="num">{fmtDec(sums.TOTAL_SALES)}</td>
                      <td className="num">{fmtNum(sums.KOMISI_AWAL)}</td>
                      <td className="num">{fmtNum(sums.KOMISI_NILAI)}</td>
                      <td className="num">{fmtNum(sums.PPN)}</td>
                      <td className="num">{fmtNum(sums.PPH23)}</td>
                      <td className="num">{fmtNum(sums.TOTAL)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </ModalBody>
      <div className="dgs-modal-foot">
        <span className="dgs-hint">Total AR dihitung ulang server dari item &amp; biaya saat disimpan.</span>
        <span className="dgs-spacer" />
        <button type="button" className="reg-ar-btn reg-ar-btn--ghost" onClick={onClose}>
          Batal
        </button>
        <button type="button" className="reg-ar-btn" disabled={saving || loading || Boolean(error)} onClick={save}>
          <Icon name="save" /> {saving ? "Menyimpan…" : exists ? "Simpan" : "Buat AR"}
        </button>
      </div>
    </Modal>
  );
};

export default DgsArEditModal;