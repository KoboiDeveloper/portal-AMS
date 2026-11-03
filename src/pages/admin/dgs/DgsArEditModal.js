import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, ModalBody } from "reactstrap";
import { toast } from "react-toastify";
import { NumericFormat } from "react-number-format";
import { Icon } from "../../../components/Component";
import AppDatePicker from "../../../components/AppDatePicker";
import { parseAppDate, formatAppDateYmd } from "../../../components/AppDateRangePicker";
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

  const moneyInput = (value, onValue, opts = {}) => (
    <NumericFormat
      className={`form-control form-control-sm ${opts.className || ""}`}
      value={value === "" || value == null ? "" : value}
      thousandSeparator="."
      decimalSeparator=","
      decimalScale={opts.decimalScale ?? 0}
      allowNegative={false}
      disabled={opts.disabled}
      placeholder="0"
      onValueChange={(v) => onValue(v.value === "" ? "" : v.value)}
    />
  );

  const feeRow = (k, label) => (
    <div className="dgs-cart-row" key={k}>
      <label className="form-label">{label}</label>
      <div className="form-control-wrap">{moneyInput(form[k], (v) => setF(k, v))}</div>
    </div>
  );

  const dateRow = (k, label) => (
    <div className="dgs-cart-row" key={k}>
      <label className="form-label">{label}</label>
      <div className="form-control-wrap">
        <AppDatePicker
          selected={parseAppDate(form[k])}
          onChange={(d) => setF(k, formatAppDateYmd(d))}
          dateFormat="dd/MM/yyyy"
          className="form-control form-control-sm date-picker"
          isClearable
          placeholderText="dd/mm/yyyy"
          portalId="dgs-ar-datepicker-portal"
        />
      </div>
    </div>
  );

  const liveTotalAr = useMemo(() => {
    const sgn = String(form.TIPE_ONGKIR || "NORMAL").toUpperCase() === "NORMAL" ? 1 : -1;
    // perkiraan UI: total item + (ongkir+pg dengan tanda) − biaya lain (mirror formula DETAIL template sederhana)
    return (
      sums.TOTAL +
      sgn * (toNum(form.ONGKIR) + toNum(form.PAYMENT_GATEWAY)) -
      toNum(form.BIAYA_LAYANAN) -
      toNum(form.PREMI) -
      toNum(form.BIAYA_PROGRAM) -
      toNum(form.KOMISI_AFFILIATE) -
      toNum(form.BIAYA_TRANSAKSI) -
      toNum(form.BIAYA_PROSES_PESANAN) -
      toNum(form.KOMISI_DINAMIS)
    );
  }, [form, sums.TOTAL]);

  return (
    <Modal
      isOpen={isOpen}
      toggle={onClose}
      size="xl"
      className="modal-dialog-centered rsd-detail-modal dgs-modal-xl"
      contentClassName="dgs-modal-content"
    >
      <div className="dgs-cart-hero">
        <div className="dgs-cart-meta">
          <div>
            <span>No. Struk</span>
            <strong>{trId || "—"}</strong>
          </div>
          <div>
            <span>Marketplace</span>
            <strong>{mp || "—"}</strong>
          </div>
          <div>
            <span>Invoice</span>
            <strong title={form.NO_ORDER || ""}>{form.NO_ORDER || "—"}</strong>
          </div>
        </div>
        <div className="dgs-cart-hero-actions">
          <button type="button" className="btn btn-icon btn-trigger" onClick={onClose} aria-label="Tutup">
            <Icon name="cross" />
          </button>
        </div>
      </div>

      <ModalBody className="rsd-detail-body dgs-modal-body dgs-cart-body">
        {error ? <div className="reg-ar-err">{error}</div> : null}
        {loading ? <div className="text-soft small mb-2">Memuat…</div> : null}

        {!loading && !error ? (
          <>
            <div className="dgs-cart-table-wrap">
              <table className="dgs-cart-table">
                <thead>
                  <tr>
                    <th>PLU</th>
                    <th>Deskripsi</th>
                    <th className="num">QTY</th>
                    <th className="num">Price POS</th>
                    <th className="num">Price MP</th>
                    <th className="num">DISC</th>
                    <th className="num">Subsidi</th>
                    <th className="num">NET</th>
                    <th className="num">K %</th>
                    <th className="num">Komisi</th>
                    <th className="num">DPP Komisi</th>
                    <th className="num">PPN</th>
                    <th className="num">PPH23</th>
                    <th className="num">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => {
                    const c = computed[i];
                    const editable = Number(it.ID) > 0;
                    const moneyCell = (k, scale = 0) =>
                      moneyInput(it[k], (v) => setItem(i, k, v), {
                        className: "dgs-cart-cell",
                        disabled: !editable,
                        decimalScale: scale,
                      });
                    return (
                      <tr key={cellOf(it, "ID_TR_SALES_DETAIL") || i}>
                        <td>{cellOf(it, "PLU")}</td>
                        <td className="dgs-desc">{cellOf(it, "DESKRIPSI")}</td>
                        <td className="num">{fmtNum(it.QTY)}</td>
                        <td className="num">{fmtNum(it.PRICE_POS)}</td>
                        <td className="num">{moneyCell("HARGA_JUAL")}</td>
                        <td className="num">{moneyCell("DISKON")}</td>
                        <td className="num">{moneyCell("SUBSIDI")}</td>
                        <td className="num">{fmtDec(c.TOTAL_SALES)}</td>
                        <td className="num">{moneyCell("KOMISI", 2)}</td>
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
                    <td colSpan={7}>TOTAL</td>
                    <td className="num">{fmtDec(sums.TOTAL_SALES)}</td>
                    <td />
                    <td className="num">{fmtNum(sums.KOMISI_AWAL)}</td>
                    <td className="num">{fmtNum(sums.KOMISI_NILAI)}</td>
                    <td className="num">{fmtNum(sums.PPN)}</td>
                    <td className="num">{fmtNum(sums.PPH23)}</td>
                    <td className="num">{fmtNum(sums.TOTAL)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {!hasFormula ? (
              <div className="dgs-cart-note">Marketplace {mp || "—"} tanpa rumus komisi otomatis — isi manual.</div>
            ) : null}

            <div className="dgs-cart-panels">
              <fieldset className="dgs-cart-fs">
                <legend>Detail Pengiriman</legend>
                <div className="dgs-cart-row">
                  <label className="form-label">RESI / AWB</label>
                  <div className="form-control-wrap">
                    <input
                      className="form-control form-control-sm"
                      value={form.NOMOR_RESI || ""}
                      maxLength={50}
                      onChange={(e) => setF("NOMOR_RESI", e.target.value)}
                    />
                  </div>
                </div>
                {dateRow("TGL_PO", "TGL PO")}
                {dateRow("TGL_KIRIM", "TGL KIRIM")}
                {dateRow("TGL_SAMPAI", "TGL SAMPAI")}
              </fieldset>

              <fieldset className="dgs-cart-fs">
                <legend>Detail Biaya</legend>
                <div className="dgs-cart-row dgs-cart-row--radio">
                  <label className="form-label">Tipe Ongkir</label>
                  <div className="dgs-cart-radios">
                    {["NORMAL", "SUBSIDI"].map((t) => (
                      <label key={t} className={form.TIPE_ONGKIR === t ? "is-on" : ""}>
                        <input
                          type="radio"
                          name="tipe_ongkir"
                          checked={form.TIPE_ONGKIR === t}
                          onChange={() => setF("TIPE_ONGKIR", t)}
                        />
                        {t}
                      </label>
                    ))}
                  </div>
                </div>
                {feeRow("ONGKIR", "Nilai Ongkir")}
                {feeRow("PAYMENT_GATEWAY", "Payment Gateway")}
                {feeRow("BIAYA_LAYANAN", "Biaya Layanan")}
                <div className="dgs-cart-row dgs-cart-row--total">
                  <label className="form-label">Total AR + Ongkir</label>
                  <strong>Rp {fmtNum(liveTotalAr)}</strong>
                </div>
              </fieldset>

              <fieldset className="dgs-cart-fs">
                <legend>Biaya Lainnya</legend>
                {feeRow("PREMI", "PREMI")}
                {feeRow("BIAYA_PROGRAM", "BIAYA PROGRAM")}
                {feeRow("KOMISI_AFFILIATE", "KOMISI AFFILIATE")}
                {feeRow("BIAYA_TRANSAKSI", "BIAYA TRANSAKSI")}
                {feeRow("BIAYA_PROSES_PESANAN", "BIAYA PROSES PESANAN")}
                {feeRow("KOMISI_DINAMIS", "KOMISI DINAMIS")}
              </fieldset>

              <fieldset className="dgs-cart-fs">
                <legend>Data Checking</legend>
                <div className="dgs-cart-checks">
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
                </div>
                <div className="dgs-cart-row">
                  <label className="form-label">Total AR (tersimpan)</label>
                  <strong className="dgs-cart-saved">
                    {form.TOTALAR === "" || form.TOTALAR == null ? "—" : `Rp ${fmtNum(form.TOTALAR)}`}
                  </strong>
                </div>
                {form.STATUS_CHECKING ? (
                  <div className="dgs-cart-status">{form.STATUS_CHECKING}</div>
                ) : null}
                <p className="dgs-cart-hint">Total AR dihitung ulang server saat SAVE ALL.</p>
              </fieldset>
            </div>
          </>
        ) : null}
      </ModalBody>

      <div className="dgs-modal-foot">
        <span className="dgs-hint">{exists ? "Edit AR" : "Input AR baru"} · {items.length} item</span>
        <span className="dgs-spacer" />
        <button type="button" className="dgs-btn dgs-btn--ghost" onClick={onClose}>
          Batal
        </button>
        <button type="button" className="dgs-btn dgs-btn--ok" disabled={saving || loading || Boolean(error)} onClick={save}>
          <Icon name="save" /> {saving ? "Menyimpan…" : "SAVE ALL"}
        </button>
      </div>
    </Modal>
  );
};

export default DgsArEditModal;
