import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Icon } from "../../../components/Component";
import { getDgsKomisiInfo, postDgsArTemplate, postDgsArUpload } from "../../../services/dgs/dgs.service";
import { isSuccess } from "../../../lib/response";
import {
  buildArTemplateWorkbook,
  downloadWorkbook,
  errMsg,
  fmtNum,
  parseArUploadFile,
  parseInvoiceFile,
  todayYmd,
} from "./dgsUtils";
import { mpLogo } from "./mpLogos";
import "./dgs.css";

const KOMISI_LABELS = [
  ["blibli", "Blibli"],
  ["lazada", "Lazada"],
  ["shopee", "Shopee"],
  ["zilingo", "Zilingo"],
  ["tokopedia", "Tokopedia"],
  ["tiktok", "TikTok"],
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
      {KOMISI_LABELS.map(([k, label]) => {
        const has = info[k] != null && info[k] !== "";
        const logo = mpLogo(label);
        return (
          <span key={k} className="dgs-komisi-chip">
            {logo ? <img src={logo} alt="" className="dgs-komisi-logo" /> : null}
            {label} <strong>{has ? `${Number(info[k])}%` : "-"}</strong>
          </span>
        );
      })}
    </div>
  );
};

/** Toko yang punya section UPLOAD INVOICE / UPLOAD AR di Ar_List.aspx. */
export const AR_UPLOAD_STORES = ["01E", "02E", "03E", "04E", "05E", "06E", "07E", "08E", "09E", "10E", "11E"];

/**
 * Parity Ar_List.aspx (per tab toko): section "UPLOAD INVOICE" (+ AR TEMPLATE) dan "UPLOAD AR".
 * - AR TEMPLATE: file kolom 1 = INVOICE → xlsx sheet AR + DETAIL.
 * - UPLOAD AR: file template yang sudah diisi → temp table toko → xsp_export_ar_market_place_<store>.
 */
export const DgsArUploadPanel = ({ store, onDone }) => {
  const invRef = useRef(null);
  const arRef = useRef(null);
  const [invFile, setInvFile] = useState(null);
  const [arFile, setArFile] = useState(null);
  const [tplBusy, setTplBusy] = useState(false);
  const [upBusy, setUpBusy] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [error, setError] = useState("");

  // ganti toko → bersihkan pilihan file
  useEffect(() => {
    setInvFile(null);
    setArFile(null);
    setParsed(null);
    setError("");
    if (invRef.current) invRef.current.value = "";
    if (arRef.current) arRef.current.value = "";
  }, [store]);

  const onArFile = useCallback(async (e) => {
    const f = e.target.files?.[0] || null;
    setArFile(f);
    setParsed(null);
    setError("");
    if (!f) return;
    try {
      if (!/\.xlsx$/i.test(f.name)) throw new Error("Gunakan file .xlsx (hasil AR Template)");
      setParsed(await parseArUploadFile(f));
    } catch (err) {
      setError(errMsg(err, "Gagal membaca file"));
    }
  }, []);

  const makeTemplate = async () => {
    if (!invFile) {
      toast.warn("Pilih file invoice dulu");
      return;
    }
    setTplBusy(true);
    setError("");
    try {
      const invoices = await parseInvoiceFile(invFile);
      if (!invoices.length) {
        toast.warn("Kolom 1 file tidak berisi INVOICE");
        return;
      }
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
      await downloadWorkbook(wb, `AR_TEMPLATE_${store}_${todayYmd()}.xlsx`);
      const found = new Set(detail.map((d) => String(d.NO_INVOICE).toUpperCase()));
      const miss = invoices.filter((i) => !found.has(i)).length;
      toast.success(`Template: ${detail.length} invoice, ${ar.length} item${miss ? ` · ${miss} invoice tidak ditemukan` : ""}`);
    } catch (err) {
      toast.error(errMsg(err, "Gagal membaca file invoice"));
    } finally {
      setTplBusy(false);
    }
  };

  const sendAr = async () => {
    if (!arFile || !parsed) {
      toast.warn("Pilih file AR dulu");
      return;
    }
    if (!window.confirm(`Upload ${parsed.ar.length} item AR & ${parsed.detail.length} invoice ke toko ${store}? Data AR akan diperbarui.`)) {
      return;
    }
    setUpBusy(true);
    setError("");
    try {
      const res = await postDgsArUpload({ store, ar: parsed.ar, detail: parsed.detail });
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Upload gagal");
        return;
      }
      toast.success("BERHASIL, JANGAN LUPA CEK LAGI!");
      setArFile(null);
      setParsed(null);
      if (arRef.current) arRef.current.value = "";
      onDone?.();
    } catch (err) {
      setError(errMsg(err, "Upload gagal"));
    } finally {
      setUpBusy(false);
    }
  };

  const invoices = parsed ? new Set(parsed.detail.map((d) => d.NO_INVOICE)).size : 0;
  const totalAr = parsed ? parsed.detail.reduce((s, d) => s + Number(d.TOTAL_AR_PLUS_ONGKIR || 0), 0) : 0;

  return (
    <div className="dgs-upl">
      {error ? <div className="reg-ar-err">{error}</div> : null}
      <div className="dgs-upl-grid">
        <section className="dgs-upl-card">
          <div className="dgs-upl-top">
            <span className="dgs-upl-ic">
              <Icon name="file-docs" />
            </span>
            <div>
              <h6 className="dgs-upl-title">Upload Invoice</h6>
              <p className="dgs-upl-sub">Kolom 1 berisi INVOICE → unduh AR Template ({store})</p>
            </div>
          </div>
          <div className="dgs-upl-pick">
            <input
              ref={invRef}
              id="dgs-upl-inv"
              type="file"
              hidden
              accept=".xlsx,.csv,.txt"
              onChange={(e) => setInvFile(e.target.files?.[0] || null)}
            />
            <label htmlFor="dgs-upl-inv" className="dgs-upl-drop">
              <Icon name="upload" />
              <span className={invFile ? "has-file" : ""}>{invFile ? invFile.name : "Pilih file .xlsx / .csv"}</span>
            </label>
            <button type="button" className="reg-ar-btn" disabled={tplBusy} onClick={makeTemplate}>
              <Icon name="download" /> {tplBusy ? "Membuat…" : "AR Template"}
            </button>
          </div>
        </section>

        <section className="dgs-upl-card">
          <div className="dgs-upl-top">
            <span className="dgs-upl-ic dgs-upl-ic--ar">
              <Icon name="upload-cloud" />
            </span>
            <div>
              <h6 className="dgs-upl-title">Upload AR</h6>
              <p className="dgs-upl-sub">File template yang sudah diisi — pastikan data sudah benar ({store})</p>
            </div>
          </div>
          <div className="dgs-upl-pick">
            <input ref={arRef} id="dgs-upl-ar" type="file" hidden accept=".xlsx" onChange={onArFile} />
            <label htmlFor="dgs-upl-ar" className="dgs-upl-drop">
              <Icon name="upload" />
              <span className={arFile ? "has-file" : ""}>{arFile ? arFile.name : "Pilih file .xlsx"}</span>
            </label>
            <button type="button" className="reg-ar-btn" disabled={upBusy} onClick={sendAr}>
              <Icon name="upload-cloud" /> {upBusy ? "Mengupload…" : "Upload AR"}
            </button>
          </div>
          {parsed ? (
            <div className="dgs-upl-sum">
              <span>
                Item AR <strong>{fmtNum(parsed.ar.length)}</strong>
              </span>
              <span>
                Invoice <strong>{fmtNum(invoices)}</strong>
              </span>
              <span>
                Total AR + Ongkir <strong>{fmtNum(totalAr)}</strong>
              </span>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
};