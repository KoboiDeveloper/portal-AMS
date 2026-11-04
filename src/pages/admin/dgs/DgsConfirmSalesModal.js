import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, ModalBody } from "reactstrap";
import { toast } from "react-toastify";
import { Icon } from "../../../components/Component";
import {
  getDgsPrasalesItems,
  postDgsPrasalesItemAction,
  postDgsPrasalesProses,
} from "../../../services/dgs/dgs.service";
import { isSuccess } from "../../../lib/response";
import { cellOf, errMsg, fmtNum } from "./dgsUtils";
import "./dgs.css";

const STATUS_TONE = { NEW: "is-new", APPROVED: "is-ok", RETUR: "is-warn" };

/**
 * Confirm Sales popup (legacy Confirm_sales): approve / retur items, then PROSES.
 * `idPrasales` = TR_PRASALES_HEADER.ID_PRASALES_HEADER
 * `returOnly` = akun DIGITAL_SALES_RETUR: hanya retur item, tanpa approve / PROSES.
 */
const DgsConfirmSalesModal = ({ isOpen, idPrasales, onClose, onChanged, returOnly = false }) => {
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [header, setHeader] = useState({});
  const [info, setInfo] = useState({});
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [returMode, setReturMode] = useState(false);
  const [returNote, setReturNote] = useState("");
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    if (!idPrasales) return;
    setLoading(true);
    setError("");
    try {
      const res = await getDgsPrasalesItems(idPrasales);
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal memuat item");
        return;
      }
      setHeader(res.data?.header || {});
      setInfo(res.data?.info || {});
      setItems(res.data?.items || []);
      setSelected(new Set());
    } catch (e) {
      setError(errMsg(e, "Gagal memuat item"));
    } finally {
      setLoading(false);
    }
  }, [idPrasales]);

  useEffect(() => {
    if (isOpen) {
      setDirty(false);
      setReturMode(Boolean(returOnly));
      setReturNote("");
      load();
    }
  }, [isOpen, load, returOnly]);

  const isNew = String(cellOf(header, "STATUS_TRANSAKSI")) === "0";
  const totalRow = Number(info.total_row || 0);
  const totalChecked = Number(info.total_checked || 0);
  const canProses = isNew && totalRow > 0 && totalRow === totalChecked;

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allIds = useMemo(() => items.map((i) => Number(cellOf(i, "NO_URUT"))), [items]);
  const allChecked = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(allIds));

  const runAction = async (action) => {
    const ids = Array.from(selected);
    if (!ids.length) {
      toast.warn("Pilih item dulu");
      return;
    }
    if (action === "retur" && !returNote.trim()) {
      toast.warn("Isi keterangan retur");
      return;
    }
    setBusy(true);
    try {
      const res = await postDgsPrasalesItemAction({ action, ids, keterangan: returNote.trim() });
      if (!isSuccess(res)) {
        toast.error(res?.responseMessage || "Gagal");
        return;
      }
      toast.success(
        `${action === "approve" ? "Approve" : "Retur"} ${res.data?.done ?? ids.length} item${
          res.data?.skipped ? ` (${res.data.skipped} dilewati)` : ""
        }`
      );
      setReturMode(false);
      setReturNote("");
      setDirty(true);
      await load();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const proses = async () => {
    if (!window.confirm("PROSES transaksi ini? Sales & AR akan dibuat dan tidak bisa dibatalkan dari sini.")) {
      return;
    }
    setBusy(true);
    try {
      const res = await postDgsPrasalesProses({ id_prasales_header: idPrasales });
      if (!isSuccess(res)) {
        toast.error(res?.responseMessage || "Gagal memproses");
        return;
      }
      toast.success("Transaksi berhasil diproses");
      setDirty(true);
      await load();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    onClose?.();
    if (dirty) onChanged?.();
  };

  return (
    <Modal isOpen={isOpen} toggle={close} size="lg" className="modal-dialog-centered rsd-detail-modal" contentClassName="dgs-modal-content">
      <div className="rsd-detail-hero">
        <div>
          <h5 className="rsd-detail-title">{returOnly ? "Retur Item" : "Confirm Sales"}</h5>
          <p className="rsd-detail-sub">
            {[cellOf(header, "NO_INVOICE"), cellOf(header, "NAMA_MP"), cellOf(header, "ID_STORE")]
              .filter(Boolean)
              .join(" · ")}
            {returOnly ? " · hanya retur (tanpa approve / proses)" : ""}
          </p>
        </div>
        <button type="button" className="btn btn-icon btn-trigger" onClick={close} aria-label="Tutup">
          <Icon name="cross" />
        </button>
      </div>
      <ModalBody className="rsd-detail-body dgs-modal-body">
        {error ? <div className="reg-ar-err">{error}</div> : null}
        {loading ? <div className="text-soft small mb-2">Memuat…</div> : null}

        <div className="dgs-cs-head">
          <span className={`dgs-pill ${isNew ? "is-new" : "is-ok"}`}>
            {isNew ? "NEW — belum diproses" : "Sudah diproses"}
          </span>
          <span className="dgs-cs-count">
            Dicek {totalChecked}/{totalRow} item · Retur {Number(info.total_retur || 0)}
          </span>
          <span className="dgs-cs-total">Total {fmtNum(cellOf(header, "GRAND_TOTAL"))}</span>
        </div>

        <div className="dgs-table-wrap">
          <table className={`dgs-table${returOnly ? " dgs-table--retur-item" : ""}`}>
            <thead>
              <tr>
                <th style={{ width: 34 }}>
                  {isNew ? <input type="checkbox" checked={allChecked} onChange={toggleAll} /> : null}
                </th>
                <th>PLU</th>
                <th>Deskripsi</th>
                <th className="num">Qty</th>
                <th className="num">Net</th>
                <th>Status</th>
                {!returOnly ? <th>Catatan</th> : null}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && !loading ? (
                <tr>
                  <td colSpan={returOnly ? 6 : 7} className="dgs-empty">
                    Tidak ada item.
                  </td>
                </tr>
              ) : (
                items.map((it) => {
                  const id = Number(cellOf(it, "NO_URUT"));
                  const st = String(cellOf(it, "STATUS") || "NEW");
                  const note = String(cellOf(it, "KETERANGAN_ADMIN") || "").trim();
                  const returBy = String(cellOf(it, "RETUR_BY") || "").trim();
                  return (
                    <tr key={id}>
                      <td>
                        {isNew ? (
                          <input type="checkbox" checked={selected.has(id)} onChange={() => toggle(id)} />
                        ) : null}
                      </td>
                      <td>{cellOf(it, "PLU")}</td>
                      <td className={returOnly || returBy || note ? "dgs-item-main" : undefined}>
                        <div className="dgs-item-desc">{cellOf(it, "DESKRIPSI") || "—"}</div>
                        {returOnly && note ? <div className="dgs-item-note">{note}</div> : null}
                        {returBy ? <div className="dgs-item-by">Retur oleh {returBy}</div> : null}
                      </td>
                      <td className="num">{fmtNum(cellOf(it, "QTY"))}</td>
                      <td className="num">{fmtNum(cellOf(it, "NET"))}</td>
                      <td>
                        <span className={`dgs-pill ${STATUS_TONE[st] || ""}`}>{st}</span>
                      </td>
                      {!returOnly ? (
                        <td className="dgs-note">
                          {note || "—"}
                          {returBy ? <div className="dgs-item-by">Retur oleh {returBy}</div> : null}
                        </td>
                      ) : null}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </ModalBody>
      <div className="dgs-modal-foot">
        {isNew ? (
          <>
            {returOnly || returMode ? (
              <div className="dgs-retur-box">
                <input
                  className="form-control form-control-sm"
                  maxLength={100}
                  placeholder="Keterangan retur (wajib, maks 100 karakter)"
                  value={returNote}
                  onChange={(e) => setReturNote(e.target.value)}
                  autoFocus
                />
                <button type="button" className="dgs-btn" disabled={busy || !selected.size} onClick={() => runAction("retur")}>
                  Simpan Retur ({selected.size})
                </button>
                {!returOnly ? (
                  <button
                    type="button"
                    className="dgs-btn dgs-btn--ghost"
                    onClick={() => {
                      setReturMode(false);
                      setReturNote("");
                    }}
                  >
                    Batal
                  </button>
                ) : null}
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className="dgs-btn"
                  disabled={busy || !selected.size}
                  onClick={() => runAction("approve")}
                >
                  <Icon name="check" /> Approve ({selected.size})
                </button>
                <button
                  type="button"
                  className="dgs-btn dgs-btn--ghost"
                  disabled={busy || !selected.size}
                  onClick={() => setReturMode(true)}
                >
                  <Icon name="undo" /> Retur ({selected.size})
                </button>
                <button
                  type="button"
                  className="dgs-btn dgs-btn--ok"
                  disabled={busy || !canProses}
                  title={canProses ? "Proses transaksi" : "Semua item harus di-approve / diretur dulu"}
                  onClick={proses}
                >
                  <Icon name="send" /> PROSES
                </button>
              </>
            )}
          </>
        ) : null}
        {!isNew ? <span className="dgs-hint">Transaksi sudah diproses — tidak ada aksi.</span> : null}
        <span className="dgs-spacer" />
        <button type="button" className="dgs-btn dgs-btn--ghost" onClick={close}>
          Tutup
        </button>
      </div>
    </Modal>
  );
};

export default DgsConfirmSalesModal;
