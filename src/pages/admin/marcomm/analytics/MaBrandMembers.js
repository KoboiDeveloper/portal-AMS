import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Spinner } from "reactstrap";
import { Button, Icon } from "../../../../components/Component";
import ErrorState from "../../../../components/admin/common/ErrorState";
import { getMarcommMemberAnalytics } from "../../../../services/marcomm/marcomm.service";
import { extractRow, isSuccess } from "../../../../lib/response";
import { exportStyledXlsx } from "../../../../lib/exportStyledXlsx";
import { BrandCell, fDate, fInt, fRpFull, num } from "./maShared";

const PAGE_SIZE = 50;
const EXPORT_PAGE_SIZE = 5000;

const STATUS_OPTIONS = [
  { value: "", label: "Member baru dan lama" },
  { value: "1", label: "Member baru saja" },
  { value: "0", label: "Member lama saja" },
];

const statusLabel = (r) => (num(r.is_baru) === 1 ? "Baru" : "Lama");

const fetchPage = async ({ from, to, first, main, baru, page, pageSize }) => {
  const params = { page, page_size: pageSize };
  if (from) params.from_date = from;
  if (to) params.to_date = to;
  if (first) params.first = first;
  if (main) params.main = main;
  if (baru) params.baru = baru;
  const res = await getMarcommMemberAnalytics("brandhome-members", params);
  if (!isSuccess(res)) throw new Error(res?.responseMessage || "Gagal memuat daftar member");
  return extractRow(res) || {};
};

const EXPORT_COLUMNS = [
  { key: "brand_pertama", label: "BRAND PERTAMA", width: 18 },
  { key: "brand_utama", label: "BRAND UTAMA", width: 18 },
  { key: "status", label: "STATUS", width: 10, align: "center" },
  { key: "brand_register", label: "BRAND REGISTER", width: 22 },
  { key: "id_member_apps", label: "ID MEMBER", width: 18 },
  { key: "nama", label: "NAMA", width: 28 },
  { key: "no_telpon", label: "NO TELEPON", width: 18 },
  { key: "email", label: "EMAIL", width: 30 },
  { key: "jenis_kelamin", label: "GENDER", width: 10, align: "center" },
  { key: "trx", label: "TRANSAKSI", width: 12, align: "right" },
  { key: "trx_di_utama", label: "TRX DI BRAND UTAMA", width: 20, align: "right" },
  { key: "n_brand", label: "JUMLAH BRAND", width: 14, align: "right" },
  { key: "total", label: "TOTAL BELANJA", width: 18, align: "right", numFmt: "#,##0" },
  { key: "first_tgl", label: "TRANSAKSI PERTAMA", width: 18 },
  { key: "last_tgl", label: "TRANSAKSI TERAKHIR", width: 18 },
];

const ymd = (v) => String(v || "").slice(0, 10);

/**
 * Daftar member tab "Brand member": saring menurut brand pertama, brand utama, dan baru/lama.
 * 50 baris per halaman, dengan ekspor Excel. `picked` = { first, main, baru }.
 */
const MaBrandMembers = ({ from, to, nonce, brands, colors, picked, onPick, canExport }) => {
  const first = picked?.first || "";
  const main = picked?.main || "";
  const baru = picked?.baru || "";
  // halaman terikat ke pilihan: ganti filter atau periode → otomatis kembali ke halaman 1
  const pickedKey = `${first}|${main}|${baru}|${from}|${to}`;
  const [pager, setPager] = useState({ key: pickedKey, page: 1 });
  const page = pager.key === pickedKey ? pager.page : 1;
  const setPage = (next) => setPager({ key: pickedKey, page: next });
  const [state, setState] = useState({ data: null, loading: false, error: "" });
  const [exporting, setExporting] = useState(false);
  const seq = useRef(0);
  const panelRef = useRef(null);

  const load = useCallback(async () => {
    const mySeq = ++seq.current;
    setState((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const data = await fetchPage({ from, to, first, main, baru, page, pageSize: PAGE_SIZE });
      if (mySeq !== seq.current) return;
      setState({ data, loading: false, error: "" });
    } catch (err) {
      if (mySeq !== seq.current) return;
      setState({ data: null, loading: false, error: err?.responseMessage || err?.message || "Gagal memuat daftar member" });
    }
  }, [from, to, first, main, baru, page]);

  useEffect(() => {
    load();
  }, [load, nonce]);

  // angka yang diklik di tabel atas mengisi `picked.at`; daftar ini lalu digulir ke layar
  const pickedAt = picked?.at || 0;
  const seenAt = useRef(pickedAt); // klik lama tidak menggulir lagi saat tab dibuka ulang
  useEffect(() => {
    if (!pickedAt || pickedAt === seenAt.current) return;
    seenAt.current = pickedAt;
    if (panelRef.current) panelRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [pickedAt]);

  const set = (patch) => onPick({ first, main, baru, ...patch });

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
        const chunk = await fetchPage({ from, to, first, main, baru, page: p, pageSize: EXPORT_PAGE_SIZE });
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
      const name = [
        "brand_member",
        first ? `pertama_${first}` : "",
        main ? `utama_${main}` : "",
        baru === "1" ? "baru" : baru === "0" ? "lama" : "",
        from || "",
        to || "",
      ]
        .filter(Boolean)
        .join("_")
        .replace(/\s+/g, "_")
        .toLowerCase();
      const ok = await exportStyledXlsx({
        fileName: `${name}.xlsx`,
        sheetName: "Member",
        columns: EXPORT_COLUMNS,
        rows: all.map((r) => ({
          ...r,
          status: statusLabel(r),
          total: num(r.total),
          first_tgl: ymd(r.first_tgl),
          last_tgl: ymd(r.last_tgl),
        })),
      });
      if (ok) toast.success(`Excel diunduh · ${all.length.toLocaleString("id-ID")} member`);
    } catch (err) {
      toast.error(err?.responseMessage || err?.message || "Gagal export daftar member");
    } finally {
      setExporting(false);
    }
  };

  // ringkasan mengikuti saringan yang dipakai data di layar, bukan pilihan yang masih dimuat
  const summary = [
    `${fInt(totalRows)} member`,
    data?.first ? `brand pertama ${data.first}` : "",
    data?.main ? `brand utama ${data.main}` : "",
    data?.baru === "1" ? "member baru" : data?.baru === "0" ? "member lama" : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="ma-panel ma-panel--anchor" ref={panelRef}>
      <div className="ma-panel__head">
        <div>
          <h5 className="ma-panel__title">Daftar member per brand</h5>
          <div className="ma-panel__basis">
            Dasar hitung: member yang bertransaksi {fDate(from)} – {fDate(to)}; brand pertama dari transaksi pertama
            sepanjang riwayat, brand utama dari transaksi terbanyak di periode ini; urut dari total belanja terbesar
          </div>
        </div>
        <div className="ma-panel__tools">{state.loading && data ? <Spinner size="sm" color="primary" /> : null}</div>
      </div>

      <div className="ma-toolbar">
        <select
          className="form-select form-select-sm ma-select"
          value={first}
          onChange={(e) => set({ first: e.target.value })}
          aria-label="Brand pertama"
        >
          <option value="">Brand pertama: semua</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              Brand pertama: {b}
            </option>
          ))}
        </select>
        <select
          className="form-select form-select-sm ma-select"
          value={main}
          onChange={(e) => set({ main: e.target.value })}
          aria-label="Brand utama"
        >
          <option value="">Brand utama: semua</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              Brand utama: {b}
            </option>
          ))}
        </select>
        <select
          className="form-select form-select-sm ma-select"
          value={baru}
          onChange={(e) => set({ baru: e.target.value })}
          aria-label="Member baru atau lama"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="ma-muted">{data ? summary : ""}</span>
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
                  <th>Brand register</th>
                  <th>ID member</th>
                  <th>Nama</th>
                  <th>No. telepon</th>
                  <th>Email</th>
                  <th>Brand pertama</th>
                  <th>Brand utama</th>
                  <th>Status</th>
                  <th className="text-end">Transaksi</th>
                  <th className="text-end" title="Jumlah transaksi member di brand utamanya">
                    Trx di brand utama
                  </th>
                  <th className="text-end">Jumlah brand</th>
                  <th className="text-end">Total belanja</th>
                  <th>Transaksi pertama</th>
                  <th>Transaksi terakhir</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="text-soft text-center py-4">
                      Tidak ada member untuk pilihan ini
                    </td>
                  </tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={`${r.id_member}-${i}`}>
                      <td className="text-end">{fInt(firstNo + i + 1)}</td>
                      <td>{r.brand_register || "—"}</td>
                      <td>{r.id_member_apps || r.id_member || "—"}</td>
                      <td>{r.nama || "—"}</td>
                      <td>{r.no_telpon || "—"}</td>
                      <td>{r.email || "—"}</td>
                      <td>
                        <BrandCell name={r.brand_pertama} colors={colors} />
                      </td>
                      <td>
                        <BrandCell name={r.brand_utama} colors={colors} />
                        {num(r.n_teratas) >= 2 ? (
                          <span className="ma-tag" title="Jumlah transaksi terbanyak sama di dua brand atau lebih; dipilih yang omzetnya lebih besar">
                            seri
                          </span>
                        ) : null}
                      </td>
                      <td>{statusLabel(r)}</td>
                      <td className="text-end">{fInt(r.trx)}</td>
                      <td className="text-end">{fInt(r.trx_di_utama)}</td>
                      <td className="text-end">{fInt(r.n_brand)}</td>
                      <td className="text-end">{fRpFull(r.total)}</td>
                      <td>{fDate(r.first_tgl)}</td>
                      <td>{fDate(r.last_tgl)}</td>
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
              <button type="button" className="btn btn-sm btn-light" disabled={page <= 1 || state.loading} onClick={() => setPage(1)}>
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

export default MaBrandMembers;
