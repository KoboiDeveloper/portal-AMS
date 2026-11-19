import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Spinner } from "reactstrap";
import { Button, Icon } from "../../../../components/Component";
import ErrorState from "../../../../components/admin/common/ErrorState";
import { getMarcommMemberAnalytics } from "../../../../services/marcomm/marcomm.service";
import { extractRow, isSuccess } from "../../../../lib/response";
import { exportStyledXlsx } from "../../../../lib/exportStyledXlsx";
import { BrandCell, SegmentBadge, fDate, fInt, fRpFull, num } from "./maShared";

const PAGE_SIZE = 50;
const EXPORT_PAGE_SIZE = 5000;

const SEGMENT_OPTIONS = [
  { value: "", label: "Semua segmen" },
  { value: "A", label: "A · VIP" },
  { value: "B", label: "B · Loyal aktif" },
  { value: "C", label: "C · Potensial" },
  { value: "D", label: "D · Baru" },
  { value: "E", label: "E · Sekali beli 91–180 hari" },
  { value: "F", label: "F · Berisiko tapi bernilai" },
  { value: "G", label: "G · Sekali beli 181–365 hari" },
  { value: "H", label: "H · Hilang tapi bernilai" },
  { value: "I", label: "I · Hilang sekali beli" },
];

const segmentLabel = (code) => SEGMENT_OPTIONS.find((o) => o.value === code)?.label || code || "";

const fetchPage = async ({ to, segment, brand, page, pageSize }) => {
  const params = { page, page_size: pageSize };
  if (to) params.to_date = to;
  if (segment) params.segment = segment;
  if (brand) params.brand = brand;
  const res = await getMarcommMemberAnalytics("segment-members", params);
  if (!isSuccess(res)) throw new Error(res?.responseMessage || "Gagal memuat daftar member");
  return extractRow(res) || {};
};

const EXPORT_COLUMNS = [
  { key: "segmen", label: "SEGMEN", width: 10, align: "center" },
  { key: "brand_dominan", label: "BRAND DOMINAN", width: 18 },
  { key: "brand_pertama", label: "BRAND PERTAMA", width: 18 },
  { key: "n_brand", label: "JUMLAH BRAND", width: 14, align: "right" },
  { key: "brand_register", label: "BRAND REGISTER", width: 22 },
  { key: "id_member_apps", label: "ID MEMBER", width: 18 },
  { key: "nama", label: "NAMA", width: 28 },
  { key: "no_telpon", label: "NO TELEPON", width: 18 },
  { key: "email", label: "EMAIL", width: 30 },
  { key: "jenis_kelamin", label: "GENDER", width: 10, align: "center" },
  { key: "trx", label: "TRANSAKSI", width: 12, align: "right" },
  { key: "hari_belanja", label: "HARI BELANJA", width: 14, align: "right" },
  { key: "stores", label: "STORE", width: 10, align: "right" },
  { key: "total", label: "TOTAL BELANJA", width: 18, align: "right", numFmt: "#,##0" },
  { key: "first_tgl", label: "BELANJA PERTAMA", width: 16 },
  { key: "last_tgl", label: "BELANJA TERAKHIR", width: 16 },
  { key: "hari", label: "HARI SEJAK TERAKHIR", width: 20, align: "right" },
];

/**
 * Daftar member satu segmen (dan brand dominan), 50 baris per halaman, dengan ekspor Excel.
 * `to` = tanggal akhir filter; segmen dihitung dari seluruh riwayat sampai tanggal itu.
 */
const MaSegmentMembers = ({ to, nonce, brands, colors, picked, onPick, canExport }) => {
  const segment = picked?.segment || "";
  const brand = picked?.brand || "";
  // halaman terikat ke pilihan: ganti segmen, brand, atau tanggal → otomatis kembali ke halaman 1
  const pickedKey = `${segment}|${brand}|${to}`;
  const [pager, setPager] = useState({ key: pickedKey, page: 1 });
  const page = pager.key === pickedKey ? pager.page : 1;
  const setPage = (next) => setPager({ key: pickedKey, page: next });
  const [state, setState] = useState({ data: null, loading: false, error: "" });
  const [exporting, setExporting] = useState(false);
  const seq = useRef(0);

  const load = useCallback(async () => {
    const mySeq = ++seq.current;
    setState((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const data = await fetchPage({ to, segment, brand, page, pageSize: PAGE_SIZE });
      if (mySeq !== seq.current) return;
      setState({ data, loading: false, error: "" });
    } catch (err) {
      if (mySeq !== seq.current) return;
      setState({ data: null, loading: false, error: err?.responseMessage || err?.message || "Gagal memuat daftar member" });
    }
  }, [to, segment, brand, page]);

  useEffect(() => {
    load();
  }, [load, nonce]);

  const data = state.data;
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const totalRows = num(data?.total_rows);
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const firstNo = (page - 1) * PAGE_SIZE;

  const onExport = async () => {
    setExporting(true);
    try {
      const all = [];
      let p = 1;
      let total = Infinity;
      while (all.length < total) {
        const chunk = await fetchPage({ to, segment, brand, page: p, pageSize: EXPORT_PAGE_SIZE });
        const list = Array.isArray(chunk.rows) ? chunk.rows : [];
        total = num(chunk.total_rows);
        all.push(...list);
        if (!list.length) break;
        p += 1;
      }
      if (!all.length) {
        toast.warning("Tidak ada member untuk pilihan ini");
        return;
      }
      const name = ["analisa_member", segment ? `segmen_${segment}` : "semua_segmen", brand || "semua_brand", to || ""]
        .filter(Boolean)
        .join("_")
        .replace(/\s+/g, "_")
        .toLowerCase();
      const ok = await exportStyledXlsx({
        fileName: `${name}.xlsx`,
        sheetName: segment ? `Segmen ${segment}` : "Member",
        columns: EXPORT_COLUMNS,
        rows: all.map((r) => ({ ...r, total: num(r.total) })),
      });
      if (ok) toast.success(`Excel diunduh · ${all.length.toLocaleString("id-ID")} member`);
    } catch (err) {
      toast.error(err?.responseMessage || err?.message || "Gagal export daftar member");
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="ma-panel">
      <div className="ma-panel__head">
        <div>
          <h5 className="ma-panel__title">Daftar member per segmen dan brand</h5>
          <div className="ma-panel__basis">
            Dasar hitung: seluruh riwayat transaksi member sampai {fDate(to)}; brand = brand dengan belanja terbesar tiap
            member; urut dari total belanja terbesar
          </div>
        </div>
        <div className="ma-panel__tools">{state.loading && data ? <Spinner size="sm" color="primary" /> : null}</div>
      </div>

      <div className="ma-toolbar">
        <select
          className="form-select form-select-sm ma-select"
          value={segment}
          onChange={(e) => onPick(e.target.value, brand)}
          aria-label="Segmen"
        >
          {SEGMENT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          className="form-select form-select-sm ma-select"
          value={brand}
          onChange={(e) => onPick(segment, e.target.value)}
          aria-label="Brand dominan"
        >
          <option value="">Semua brand</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <span className="ma-muted">
          {data ? `${fInt(totalRows)} member${segment ? ` · ${segmentLabel(segment)}` : ""}${brand ? ` · ${brand}` : ""}` : ""}
        </span>
        {canExport ? (
          <Button color="primary" size="sm" className="ms-auto" onClick={onExport} disabled={exporting || !totalRows}>
            {exporting ? (
              <>
                <Spinner size="sm" className="me-1" /> Menyiapkan…
              </>
            ) : (
              <>
                <Icon name="download" className="me-1" />
                Export Excel
              </>
            )}
          </Button>
        ) : null}
      </div>

      {state.error && !data ? <ErrorState message={state.error} onRetry={load} /> : null}

      {state.loading && !data ? (
        <div className="ma-panel__loading">
          <Spinner color="primary" />
          <span>Memuat daftar member…</span>
        </div>
      ) : null}

      {data ? (
        <div className={state.loading ? "ma-panel__body is-stale" : "ma-panel__body"}>
          <div className="table-responsive ma-table-wrap">
            <table className="table table-sm ma-table mb-0">
              <thead>
                <tr>
                  <th className="text-end">No</th>
                  <th>Segmen</th>
                  <th>Brand register</th>
                  <th>ID member</th>
                  <th>Nama</th>
                  <th>No. telepon</th>
                  <th>Email</th>
                  <th>Brand dominan</th>
                  <th>Brand pertama</th>
                  <th className="text-end">Jumlah brand</th>
                  <th className="text-end">Transaksi</th>
                  <th className="text-end">Hari belanja</th>
                  <th className="text-end">Store</th>
                  <th className="text-end">Total belanja</th>
                  <th>Belanja pertama</th>
                  <th>Belanja terakhir</th>
                  <th className="text-end">Hari sejak terakhir</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={17} className="text-soft text-center py-4">
                      Tidak ada member untuk pilihan ini
                    </td>
                  </tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={`${r.id_member}-${i}`}>
                      <td className="text-end">{fInt(firstNo + i + 1)}</td>
                      <td>
                        <SegmentBadge code={r.segmen} />
                      </td>
                      <td>{r.brand_register || "—"}</td>
                      <td>{r.id_member_apps || r.id_member || "—"}</td>
                      <td>{r.nama || "—"}</td>
                      <td>{r.no_telpon || "—"}</td>
                      <td>{r.email || "—"}</td>
                      <td>
                        <BrandCell name={r.brand_dominan} colors={colors} />
                      </td>
                      <td>{r.brand_pertama || "—"}</td>
                      <td className="text-end">{fInt(r.n_brand)}</td>
                      <td className="text-end">{fInt(r.trx)}</td>
                      <td className="text-end">{fInt(r.hari_belanja)}</td>
                      <td className="text-end">{fInt(r.stores)}</td>
                      <td className="text-end">{fRpFull(r.total)}</td>
                      <td>{fDate(r.first_tgl)}</td>
                      <td>{fDate(r.last_tgl)}</td>
                      <td className="text-end">{fInt(r.hari)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="ma-pager">
            <span className="ma-muted">
              {totalRows
                ? `Baris ${fInt(firstNo + 1)}–${fInt(Math.min(firstNo + PAGE_SIZE, totalRows))} dari ${fInt(totalRows)}`
                : "0 baris"}
            </span>
            <div className="ma-pager__nav">
              <button
                type="button"
                className="btn btn-sm btn-light"
                disabled={page <= 1 || state.loading}
                onClick={() => setPage(1)}
              >
                « Awal
              </button>
              <button
                type="button"
                className="btn btn-sm btn-light"
                disabled={page <= 1 || state.loading}
                onClick={() => setPage(Math.max(1, page - 1))}
              >
                ‹ Sebelumnya
              </button>
              <span className="ma-pager__page">
                Halaman {fInt(page)} dari {fInt(totalPages)}
              </span>
              <button
                type="button"
                className="btn btn-sm btn-light"
                disabled={page >= totalPages || state.loading}
                onClick={() => setPage(Math.min(totalPages, page + 1))}
              >
                Berikutnya ›
              </button>
              <button
                type="button"
                className="btn btn-sm btn-light"
                disabled={page >= totalPages || state.loading}
                onClick={() => setPage(totalPages)}
              >
                Akhir »
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default MaSegmentMembers;
