import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import { Icon } from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import ConfirmDialog from "../../../components/admin/common/ConfirmDialog";
import { PageSmoothScroll } from "../../../components/PageSmoothScroll";
import { extractRows, notifyResponse } from "../../../lib/response";
import { useActionPermissions } from "../../../hooks/useActionPermissions";
import { createHrdService } from "../../../services/hrd/hrd.service";
import { ScBtn, ScEmptyState, ScError, ScPageHeader, ScSkeletonBlock } from "../dgs/sc";
import { RivStickyThead } from "../regional/RivStickyThead";
import "../dgs/dgs.css";
import "../regional/reg-mp-ar-list.css";
import "./hrd-personel.css";
import "./hrd-kontrak.css";

const MODULE = "HRD_PAR_SM_DEPT";
const service = createHrdService("par/sm-dept", { crud: true });
const PAGE_SIZE = 20;

/** List SM — click row → sm_dept_info detail (ASP parity). */
const HrdSmDeptListPage = () => {
  const navigate = useNavigate();
  const perms = useActionPermissions(MODULE);
  const tableRef = useRef(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState({ open: false, row: null });
  const [saving, setSaving] = useState(false);

  const canCreate = !perms.loading && perms.CREATE;
  const canEdit = !perms.loading && perms.UPDATE;
  const canDelete = !perms.loading && perms.DELETE;

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await service.list({
        ...(search.trim() ? { search: search.trim() } : {}),
      });
      setRows(extractRows(res));
      setPage(1);
    } catch (err) {
      setError(err?.responseMessage || err?.message || "Gagal memuat SM Department");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, page]);

  const openDetail = (row) => {
    if (!row?.id) return;
    navigate(`/admin/hrd/par/sm-dept/${encodeURIComponent(row.id)}`);
  };

  const handleDelete = async () => {
    if (!confirm.row?.id) return;
    setSaving(true);
    try {
      const res = await service.remove(confirm.row.id);
      if (notifyResponse(res, "Data dihapus")) {
        setConfirm({ open: false, row: null });
        loadData();
      }
    } catch (err) {
      notifyResponse(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AccessGuard moduleCode={MODULE} permission="VIEW">
      <Head title="SM Department List" />
      <Content>
        <PageSmoothScroll
          revision={`${loading ? 1 : 0}-${page}-${rows.length}`}
          className="riv-page-scroll"
        >
          <div className="hrd-sc hrd-kontrak dgs-dash sc-scope">
            <ScPageHeader
              title="SM Department List"
              description="Senior Manager & department assignment (legacy: sm_dept_list.aspx)."
              actions={
                <div className="hrd-toolbar-actions">
                  <div className="sc-page-search">
                    <input
                      className="form-control"
                      placeholder="Cari NIK / nama…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && loadData()}
                    />
                    <ScBtn variant="soft" disabled={loading} onClick={loadData}>
                      <Icon name="search" /> Cari
                    </ScBtn>
                  </div>
                  {canCreate ? (
                    <ScBtn onClick={() => navigate("/admin/hrd/par/sm-dept/new")}>
                      <Icon name="plus" /> Create
                    </ScBtn>
                  ) : null}
                </div>
              }
            />

            {loading ? (
              <div className="sc-panel sc-panel--flush" aria-busy="true">
                {Array.from({ length: 8 }).map((_, i) => (
                  <ScSkeletonBlock key={i} style={{ height: 40, margin: "6px 12px" }} />
                ))}
              </div>
            ) : null}

            {error ? <ScError message={error} onRetry={loadData} /> : null}

            {!loading && !error ? (
              rows.length === 0 ? (
                <ScEmptyState
                  icon="users"
                  title="Belum ada Senior Manager"
                  hint="Tambah SM lalu assign department."
                  action={
                    canCreate ? (
                      <ScBtn onClick={() => navigate("/admin/hrd/par/sm-dept/new")}>
                        Create
                      </ScBtn>
                    ) : null
                  }
                />
              ) : (
                <>
                  <div className="hrd-att__summary" aria-live="polite">
                    <span>
                      <strong>{rows.length.toLocaleString("id-ID")}</strong> senior manager
                    </span>
                  </div>
                  <div className="sc-panel sc-panel--flush">
                    <div className="dgs-table-wrap" style={{ maxHeight: "none", border: 0 }}>
                      <table ref={tableRef} className="dgs-table">
                        <thead>
                          <tr>
                            <th>NIK</th>
                            <th>NAMA</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {pageRows.map((row) => (
                            <tr
                              key={row.id || row.nik}
                              className="dgs-row-click"
                              onClick={() => openDetail(row)}
                            >
                              <td>
                                <span className="sc-td-main">{row.nik || "—"}</span>
                              </td>
                              <td>
                                <span className="sc-td-main">{row.nama || "—"}</span>
                              </td>
                              <td onClick={(e) => e.stopPropagation()}>
                                <div className="hrd-kontrak-row-actions">
                                  {canEdit ? (
                                    <button
                                      type="button"
                                      className="hrd-kontrak-icon-btn"
                                      title="Detail"
                                      onClick={() => openDetail(row)}
                                    >
                                      <Icon name="eye" />
                                    </button>
                                  ) : null}
                                  {canDelete ? (
                                    <button
                                      type="button"
                                      className="hrd-kontrak-icon-btn is-danger"
                                      title="Hapus"
                                      onClick={() => setConfirm({ open: true, row })}
                                    >
                                      <Icon name="trash" />
                                    </button>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {rows.length > PAGE_SIZE ? (
                    <div className="reg-ar-pager">
                      <button
                        type="button"
                        className="reg-ar-pager-btn"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        Prev
                      </button>
                      <span className="reg-ar-record-info">
                        Hal {page} / {pageCount}
                      </span>
                      <button
                        type="button"
                        className="reg-ar-pager-btn"
                        disabled={page >= pageCount}
                        onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                      >
                        Next
                      </button>
                    </div>
                  ) : null}

                  <RivStickyThead
                    tableRef={tableRef}
                    enabled={!loading && rows.length > 0}
                    tableClassName="dgs-table"
                    interactive
                  />
                </>
              )
            ) : null}

            <ConfirmDialog
              isOpen={confirm.open}
              variant="sc"
              title="Hapus Senior Manager"
              message={`Hapus ${confirm.row?.nama || confirm.row?.nik || "item"} beserta department-nya?`}
              confirmLabel="Hapus"
              onConfirm={handleDelete}
              onCancel={() => setConfirm({ open: false, row: null })}
              loading={saving}
            />
          </div>
        </PageSmoothScroll>
      </Content>
    </AccessGuard>
  );
};

export default HrdSmDeptListPage;
