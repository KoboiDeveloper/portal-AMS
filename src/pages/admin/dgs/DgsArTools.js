import React, { useCallback, useEffect, useRef, useState } from "react";
import { Modal, ModalBody } from "reactstrap";
import { toast } from "react-toastify";
import { Icon } from "../../../components/Component";
import { getDgsKomisiInfo, postDgsArTemplate, postDgsArUpload07E } from "../../../services/dgs/dgs.service";
import { isSuccess } from "../../../lib/response";
import {
  buildArTemplateWorkbook,
  downloadWorkbook,
  errMsg,
  fmtNum,
  parseArUploadFile,
  parseInvoiceFile,
  parseInvoiceText,
  todayYmd,
} from "./dgsUtils";
import "./dgs.css";

const KOMISI_LABELS = [
  ["shopee", "Shopee"],
  ["tokopedia", "Tokopedia"],
  ["tiktok", "TikTok"],
  ["lazada", "Lazada"],
  ["zalora", "Zalora"],
  ["blibli", "Blibli"],
  ["bukalapak", "Bukalapak"],
  ["jd_id", "JD.ID"],
  ["zilingo", "Zilingo"],
  ["direct_selling", "Direct Selling"],
  ["blanja_com", "Blanja"],
];

/** Komisi terbaru per marketplace (legacy info strip on Ar_List). */
export const DgsKomisiStrip = () => {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    let alive = true;
    getDgsKomisiInfo()
      .then((res) => {
        if (alive && isSuccess(res)) setInfo(res.data || {});
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  if (!info) return null;
  return (
    <div className="dgs-komisi-strip" title="Komisi terbaru per marketplace (%)">
      <span className="dgs-komisi-strip-title">Komisi</span>
      {KOMISI_LABELS.map(([k, label]) =>
        info[k] != null && info[k] !== "" ? (
          <span key={k} className="dgs-komisi-chip">
            {label} <strong>{Number(info[k])}%</strong>
          </span>
        ) : null
      )}
    </div>
  );
};

/** AR TEMPLATE: paste/upload invoice list → xlsx with sheets AR + DETAIL. */
export const DgsArTemplateModal = ({ isOpen, onClose }) => {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (isOpen) setText("");
  }, [isOpen]);

  const invoices = parseInvoiceText(text);

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const list = await parseInvoiceFile(f);
      setText(list.join("\n"));
      toast.info(`${list.length} invoice dibaca dari file`);
    } catch (err) {
      toast.error(errMsg(err, "Gagal membaca file"));
    }
  };

  const generate = async () => {
    if (!invoices.length) {
      toast.warn("Isi daftar invoice dulu");
      return;
    }
    setBusy(true);
    try {
      const res = await postDgsArTemplate(invoices);
      if (!isSuccess(res)) {
        toast.error(res?.responseMessage || "Gagal membuat template");
        return;
      }
      const ar = res.data?.ar || [];
      const detail = res.data?.detail || [];
      if (!ar.length) {
        toast.warn("Tidak ada AR yang cocok dengan invoice tersebut");
        return;
      }
      const wb = buildArTemplateWorkbook({ ar, detail });
      await downloadWorkbook(wb, `AR_TEMPLATE_${todayYmd()}.xlsx`);
      const found = new Set(detail.map((d) => String(d.NO_INVOICE).toUpperCase()));
      const miss = invoices.filter((i) => !found.has(i)).length;
      toast.success(`Template: ${detail.length} invoice, ${ar.length} item${miss ? ` · ${miss} invoice tidak ditemukan` : ""}`);
      onClose?.();
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} toggle={onClose} className="modal-dialog-centered rsd-detail-modal">
      <div className="rsd-detail-hero">
        <div>
          <h5 className="rsd-detail-title">AR Template</h5>
          <p className="rsd-detail-sub">Daftar No. Invoice → file Excel (sheet AR + DETAIL)</p>
        </div>
        <button type="button" className="btn btn-icon btn-trigger" onClick={onClose} aria-label="Tutup">
          <Icon name="cross" />
        </button>
      </div>
      <ModalBody className="rsd-detail-body">
        <textarea
          className="form-control dgs-textarea"
          rows={8}
          placeholder={"Tempel No. Invoice, satu per baris\n(atau pisahkan dengan koma / spasi)"}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="dgs-actions">
          <span className="dgs-hint">{invoices.length.toLocaleString("id-ID")} invoice unik (maks 1.500)</span>
          <span className="dgs-spacer" />
          <input ref={fileRef} type="file" accept=".xlsx,.csv,.txt" hidden onChange={onFile} />
          <button type="button" className="reg-ar-btn reg-ar-btn--ghost" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" /> Dari File
          </button>
          <button type="button" className="reg-ar-btn" disabled={busy || !invoices.length} onClick={generate}>
            <Icon name="download" /> {busy ? "Membuat…" : "Download Template"}
          </button>
        </div>
      </ModalBody>
    </Modal>
  );
};

/** Upload AR (07E only): parse xlsx in browser, preview, then send JSON to API. */
export const DgsArUploadModal = ({ isOpen, onClose, onDone }) => {
  const [parsed, setParsed] = useState(null);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setParsed(null);
      setFileName("");
      setError("");
    }
  }, [isOpen]);

  const onFile = useCallback(async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setError("");
    setParsed(null);
    setFileName(f.name);
    try {
      if (!/\.xlsx$/i.test(f.name)) throw new Error("Gunakan file .xlsx (hasil AR Template)");
      setParsed(await parseArUploadFile(f));
    } catch (err) {
      setError(errMsg(err, "Gagal membaca file"));
    }
  }, []);

  const send = async () => {
    if (!parsed) return;
    if (!window.confirm(`Upload ${parsed.ar.length} item AR & ${parsed.detail.length} invoice ke toko 07E? Data AR akan diperbarui.`)) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await postDgsArUpload07E({ ar: parsed.ar, detail: parsed.detail });
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Upload gagal");
        return;
      }
      toast.success("BERHASIL, JANGAN LUPA CEK LAGI!");
      onDone?.();
      onClose?.();
    } catch (err) {
      setError(errMsg(err, "Upload gagal"));
    } finally {
      setBusy(false);
    }
  };

  const invoices = parsed ? new Set(parsed.detail.map((d) => d.NO_INVOICE)).size : 0;
  const totalAr = parsed ? parsed.detail.reduce((s, d) => s + Number(d.TOTAL_AR_PLUS_ONGKIR || 0), 0) : 0;

  return (
    <Modal isOpen={isOpen} toggle={onClose} className="modal-dialog-centered rsd-detail-modal">
      <div className="rsd-detail-hero">
        <div>
          <h5 className="rsd-detail-title">Upload AR · 07E</h5>
          <p className="rsd-detail-sub">File template (sheet AR + DETAIL) — hanya baris toko 07E yang diterima</p>
        </div>
        <button type="button" className="btn btn-icon btn-trigger" onClick={onClose} aria-label="Tutup">
          <Icon name="cross" />
        </button>
      </div>
      <ModalBody className="rsd-detail-body">
        {error ? <div className="reg-ar-err">{error}</div> : null}
        <input ref={fileRef} type="file" accept=".xlsx" hidden onChange={onFile} />
        <button type="button" className="reg-ar-btn reg-ar-btn--ghost" onClick={() => fileRef.current?.click()}>
          <Icon name="upload" /> Pilih File .xlsx
        </button>
        {fileName ? <span className="dgs-hint ml-2"> {fileName}</span> : null}

        {parsed ? (
          <div className="dgs-preview">
            <div>
              <span>Item AR</span>
              <strong>{fmtNum(parsed.ar.length)}</strong>
            </div>
            <div>
              <span>Invoice (DETAIL)</span>
              <strong>{fmtNum(invoices)}</strong>
            </div>
            <div>
              <span>Total AR + Ongkir</span>
              <strong>{fmtNum(totalAr)}</strong>
            </div>
          </div>
        ) : null}

        <div className="dgs-actions">
          <span className="dgs-spacer" />
          <button type="button" className="reg-ar-btn reg-ar-btn--ghost" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="reg-ar-btn" disabled={!parsed || busy} onClick={send}>
            <Icon name="upload-cloud" /> {busy ? "Mengupload…" : "Upload"}
          </button>
        </div>
      </ModalBody>
    </Modal>
  );
};
