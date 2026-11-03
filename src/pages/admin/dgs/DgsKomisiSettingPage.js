import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Modal, ModalBody } from "reactstrap";
import { toast } from "react-toastify";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import {
  BlockBetween,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Icon,
  RSelect,
} from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import { PageSmoothScroll } from "../../../components/PageSmoothScroll";
import {
  getDgsKomisi,
  getDgsMarketplaces,
  postDgsKomisi,
  postDgsKomisiDelete,
  putDgsKomisi,
} from "../../../services/dgs/dgs.service";
import { isSuccess } from "../../../lib/response";
import { cellOf, errMsg, fmtDec, fmtYmd } from "./dgsUtils";
import "../regional/reg-mp-ar-list.css";
import "./dgs.css";

const PAGE_SIZE = 50;

const selectStyles = {
  control: (base) => ({ ...base, minHeight: 38, height: 38, fontSize: "0.8125rem", borderColor: "#dbdfea", borderRadius: 0, background: "#eef2f8" }),
  valueContainer: (base) => ({ ...base, padding: "0 10px", height: 36 }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorsContainer: (base) => ({ ...base, height: 36 }),
  menu: (base) => ({ ...base, zIndex: 30, fontSize: "0.8125rem", borderRadius: 0 }),
};

const DgsKomisiSettingPage = () => {
  const [mps, setMps] = useState([]);
  const [mp, setMp] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState(() => new Set());
  const [form, setForm] = useState(null); // {id?, mp, komisi}
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState("");

  useEffect(() => {
    getDgsMarketplaces()
      .then((res) => {
        if (isSuccess(res)) setMps((res.data || []).map((r) => String(cellOf(r, "MARKETPLACE"))).filter(Boolean));
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setSel(new Set());
    try {
      const res = await getDgsKomisi({ marketplace: mp });
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal memuat komisi");
        setRows([]);
        return;
      }
      setRows(res.data || []);
      setPage(1);
    } catch (e) {
      setError(errMsg(e, "Gagal memuat komisi"));
    } finally {
      setLoading(false);
    }
  }, [mp]);

  useEffect(() => {
    load();
  }, [load]);

  const options = useMemo(
    () => [{ value: "", label: "Semua Marketplace" }, ...mps.map((m) => ({ value: m, label: m }))],
    [mps]
  );

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const offset = (safePage - 1) * PAGE_SIZE;
  const shown = rows.slice(offset, offset + PAGE_SIZE);
  const idOf = (r) => Number(cellOf(r, "ID"));
  const allShown = shown.length > 0 && shown.every((r) => sel.has(idOf(r)));

  const toggleAll = () =>
    setSel((s) => {
      const n = new Set(s);
      if (allShown) shown.forEach((r) => n.delete(idOf(r)));
      else shown.forEach((r) => n.add(idOf(r)));
      return n;
    });
  const toggleOne = (id) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const save = async () => {
    const k = Number(String(form.komisi).replace(",", "."));
    if (!form.mp) return setFormErr("Marketplace wajib dipilih");
    if (String(form.komisi).trim() === "" || Number.isNaN(k) || k < 0 || k > 100) {
      return setFormErr("Komisi harus angka 0–100");
    }
    setBusy(true);
    setFormErr("");
    try {
      const res = form.id
        ? await putDgsKomisi(form.id, { mp_name: form.mp, komisi: k })
        : await postDgsKomisi({ mp_name: form.mp, komisi: k });
      if (!isSuccess(res)) {
        setFormErr(res?.responseMessage || "Gagal menyimpan");
        return;
      }
      toast.success("Komisi tersimpan");
      setForm(null);
      load();
    } catch (e) {
      setFormErr(errMsg(e, "Gagal menyimpan"));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    const ids = [...sel];
    if (!ids.length) return;
    if (!window.confirm(`Hapus ${ids.length} baris komisi?`)) return;
    try {
      const res = await postDgsKomisiDelete(ids);
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal menghapus");
        return;
      }
      toast.success(`${ids.length} baris dihapus`);
      load();
    } catch (e) {
      setError(errMsg(e, "Gagal menghapus"));
    }
  };

  return (
    <AccessGuard moduleCode="DGS_KOMISI">
      <Head title="Setting Komisi" />
      <Content>
        <PageSmoothScroll revision={`${loading}-${rows.length}-${safePage}`} className="riv-page-scroll">
          <div className="reg-ar-wrap">
            <BlockHead size="sm">
              <BlockBetween>
                <BlockHeadContent>
                  <BlockTitle page tag="h3">
                    Setting Komisi
                  </BlockTitle>
                  <BlockDes className="text-soft">Persentase komisi marketplace (dipakai rumus AR)</BlockDes>
                </BlockHeadContent>
              </BlockBetween>
            </BlockHead>

            <div className="dgs-filters">
              <div className="reg-ar-f-item">
                <label>Marketplace</label>
                <RSelect
                  styles={selectStyles}
                  options={options}
                  value={options.find((o) => o.value === mp) || options[0]}
                  onChange={(o) => setMp(o?.value || "")}
                  isSearchable
                />
              </div>
              <button type="button" className="dgs-btn" disabled={loading} onClick={load}>
                <Icon name="search" /> Search
              </button>
              <button
                type="button"
                className="dgs-btn dgs-btn--ghost"
                disabled={!mp}
                title={mp ? "Tambah komisi baru" : "Pilih marketplace dulu"}
                onClick={() => {
                  setFormErr("");
                  setForm({ mp, komisi: "" });
                }}
              >
                <Icon name="plus" /> Add
              </button>
              <button type="button" className="dgs-btn dgs-btn--ghost" disabled={!sel.size} onClick={remove}>
                <Icon name="trash" /> Delete{sel.size ? ` (${sel.size})` : ""}
              </button>
            </div>

            {error ? <div className="reg-ar-error">{error}</div> : null}

            <div className="dgs-table-wrap" style={{ maxHeight: "none" }}>
              <table className="dgs-table">
                <thead>
                  <tr>
                    <th style={{ width: 36 }}>
                      <input type="checkbox" checked={allShown} onChange={toggleAll} aria-label="Pilih semua" />
                    </th>
                    <th>Tgl Input</th>
                    <th>Marketplace</th>
                    <th className="num">% Komisi</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.length === 0 ? (
                    <tr>
                      <td className="dgs-empty" colSpan={5}>
                        {loading ? "Memuat…" : "Tidak ada data."}
                      </td>
                    </tr>
                  ) : (
                    shown.map((r) => {
                      const id = idOf(r);
                      return (
                        <tr key={id}>
                          <td>
                            <input type="checkbox" checked={sel.has(id)} onChange={() => toggleOne(id)} />
                          </td>
                          <td>{fmtYmd(cellOf(r, "tgl_input"))}</td>
                          <td>{cellOf(r, "mp_name")}</td>
                          <td className="num">{fmtDec(cellOf(r, "komisi"), 2)}</td>
                          <td>
                            <button
                              type="button"
                              className="dgs-link"
                              onClick={() => {
                                setFormErr("");
                                setForm({ id, mp: String(cellOf(r, "mp_name")), komisi: String(cellOf(r, "komisi")) });
                              }}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {rows.length > PAGE_SIZE ? (
              <div className="reg-ar-pager">
                <span className="reg-ar-pager-info">
                  Halaman {safePage} / {totalPages} · {rows.length} baris
                </span>
                <div className="reg-ar-pager-btns">
                  <button type="button" className="reg-ar-pager-btn" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                    Sebelumnya
                  </button>
                  <button
                    type="button"
                    className="reg-ar-pager-btn"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage(safePage + 1)}
                  >
                    Berikutnya
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </PageSmoothScroll>

        <Modal
          isOpen={Boolean(form)}
          toggle={() => setForm(null)}
          className="modal-dialog-centered rsd-detail-modal"
          size="sm"
          contentClassName="dgs-modal-content"
        >
          <div className="rsd-detail-hero">
            <div>
              <h5 className="rsd-detail-title">{form?.id ? "Edit Komisi" : "Tambah Komisi"}</h5>
              <p className="rsd-detail-sub">{form?.mp}</p>
            </div>
            <button type="button" className="btn btn-icon btn-trigger" onClick={() => setForm(null)} aria-label="Tutup">
              <Icon name="cross" />
            </button>
          </div>
          <ModalBody className="rsd-detail-body dgs-modal-body">
            {formErr ? <div className="reg-ar-err">{formErr}</div> : null}
            <div className="dgs-field">
              <label>% Komisi (0–100)</label>
              <input
                className="form-control"
                inputMode="decimal"
                autoFocus
                value={form?.komisi ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, komisi: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && save()}
              />
            </div>
          </ModalBody>
          <div className="dgs-modal-foot">
            <span className="dgs-spacer" />
            <button type="button" className="dgs-btn dgs-btn--ghost" onClick={() => setForm(null)}>
              Batal
            </button>
            <button type="button" className="dgs-btn" disabled={busy} onClick={save}>
              {busy ? "Menyimpan…" : "Simpan"}
            </button>
          </div>
        </Modal>
      </Content>
    </AccessGuard>
  );
};

export default DgsKomisiSettingPage;
