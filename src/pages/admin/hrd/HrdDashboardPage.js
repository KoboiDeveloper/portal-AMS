import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Spinner } from "reactstrap";
import { Line } from "react-chartjs-2";
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
  Legend,
} from "chart.js";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import {
  Block,
  BlockBetween,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Button,
  Col,
  Icon,
  PreviewAltCard,
  Row,
} from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import { getHrdDashboardSummary } from "../../../services/hrd/hrd.service";
import { extractRow, isSuccess } from "../../../lib/response";
import { appPath } from "../../../lib/paths";

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler, Legend);

const fmt = (n) =>
  Number(n || 0).toLocaleString("id-ID", { maximumFractionDigits: 0 });

const KpiCard = ({ to, icon, premiumIcon, label, value, hint, tone = "primary" }) => (
  <Link to={appPath(to)} className={`hrd-dash-kpi hrd-dash-kpi--${tone}`}>
    <PreviewAltCard className="card-full h-100">
      <div className="card-inner">
        <div className="card-title-group align-start mb-2">
          <div className="card-title">
            <h6 className="title">{label}</h6>
          </div>
          {premiumIcon ? (
            <Icon pack="premium" name={premiumIcon} size={28} />
          ) : (
            <Icon name={icon} />
          )}
        </div>
        <div className="nk-sale-data">
          <span className="amount">{fmt(value)}</span>
          {hint ? <span className="sub-title">{hint}</span> : null}
        </div>
      </div>
    </PreviewAltCard>
  </Link>
);

const PENDING_ITEMS = [
  { key: "izin", label: "Izin", to: "/admin/hrd/par/izin", premiumIcon: "izin" },
  { key: "cuti", label: "Cuti", to: "/admin/hrd/par/cuti", premiumIcon: "cuti" },
  { key: "sakit", label: "Sakit", to: "/admin/hrd/par/sakit", premiumIcon: "peringatan" },
  { key: "dinas", label: "Dinas", to: "/admin/hrd/par/dinas", premiumIcon: "lokasi" },
  { key: "overtime", label: "Overtime", to: "/admin/hrd/par/overtime", premiumIcon: "lembur" },
];

const HrdDashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getHrdDashboardSummary({ days_kontrak: 30 });
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal memuat dashboard");
        setData(null);
        return;
      }
      setData(extractRow(res) || {});
    } catch (err) {
      setError(err?.responseMessage || err?.message || "Gagal memuat dashboard");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const attToday = data?.attendance_today || {};
  const pending = data?.pending || {};
  const series7 = Array.isArray(data?.attendance_7d) ? data.attendance_7d : [];
  const kontrakRows = Array.isArray(data?.kontrak_expiring) ? data.kontrak_expiring : [];

  const chartData = useMemo(
    () => ({
      labels: series7.map((r) => {
        const d = String(r.date || "").slice(5);
        return d || r.date;
      }),
      datasets: [
        {
          label: "Hadir",
          data: series7.map((r) => Number(r.present_count || 0)),
          borderColor: "#0ea5e9",
          backgroundColor: "rgba(14, 165, 233, 0.12)",
          borderWidth: 2.5,
          pointRadius: 3,
          pointBackgroundColor: "#0ea5e9",
          tension: 0.35,
          fill: true,
        },
      ],
    }),
    [series7]
  );

  const chartOptions = useMemo(
    () => ({
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#0f172a",
          titleFont: { size: 11 },
          bodyFont: { size: 12 },
          padding: 10,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: "rgba(148, 163, 184, 0.2)" },
          ticks: { color: "#64748b", precision: 0 },
        },
        x: {
          grid: { display: false },
          ticks: { color: "#64748b" },
        },
      },
      maintainAspectRatio: false,
    }),
    []
  );

  return (
    <AccessGuard moduleCode="HRD_DASHBOARD" permission="VIEW">
      <Head title="HRD Dashboard" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page tag="h3">
                HRD Dashboard
              </BlockTitle>
              <BlockDes className="text-soft">
                Ringkasan operasional HRD
                {data?.as_of ? ` · per ${data.as_of}` : ""}
              </BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <Button color="light" size="sm" className="btn-icon" onClick={load} disabled={loading}>
                <Icon name="reload" />
              </Button>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        {loading && (
          <Block>
            <div className="hrd-dash-loading">
              <Spinner size="sm" /> Memuat ringkasan…
            </div>
          </Block>
        )}

        {!loading && error && (
          <Block>
            <PreviewAltCard>
              <div className="card-inner text-center py-4">
                <p className="text-danger mb-3">{error}</p>
                <Button color="primary" size="sm" onClick={load}>
                  Coba lagi
                </Button>
              </div>
            </PreviewAltCard>
          </Block>
        )}

        {!loading && !error && data && (
          <>
            <Block>
              <Row className="g-gs">
                <Col sm="6" xxl="3">
                  <KpiCard
                    to="/admin/hrd/abs/personel"
                    premiumIcon="karyawan"
                    label="Karyawan aktif"
                    value={data.active_headcount}
                    hint={`+${fmt(data.join_this_month)} masuk · ${fmt(data.resign_this_month)} resign bulan ini`}
                    tone="primary"
                  />
                </Col>
                <Col sm="6" xxl="3">
                  <KpiCard
                    to="/admin/hrd/abs/online-attendance"
                    premiumIcon="absensi"
                    label="Hadir hari ini"
                    value={attToday.present}
                    hint={`${fmt(attToday.late)} terlambat · ${fmt(attToday.absent_or_missing)} belum absen`}
                    tone="success"
                  />
                </Col>
                <Col sm="6" xxl="3">
                  <KpiCard
                    to="/admin/hrd/par/izin"
                    premiumIcon="approval"
                    label="Pending approval"
                    value={pending.total}
                    hint="Izin / cuti / sakit / dinas / OT"
                    tone="warning"
                  />
                </Col>
                <Col sm="6" xxl="3">
                  <KpiCard
                    to="/admin/hrd/abs/personel-kontrak"
                    premiumIcon="dokumen"
                    label="Kontrak expiring"
                    value={data.kontrak_expiring_count}
                    hint={`${data.kontrak_expiring_days || 30} hari ke depan`}
                    tone="danger"
                  />
                </Col>
              </Row>
            </Block>

            <Block>
              <Row className="g-gs">
                <Col lg="8">
                  <PreviewAltCard className="card-full h-100">
                    <div className="card-inner border-bottom">
                      <div className="card-title-group">
                        <div className="card-title">
                          <h6 className="title">Kehadiran 7 hari</h6>
                        </div>
                      </div>
                    </div>
                    <div className="card-inner">
                      <div className="hrd-dash-chart">
                        {series7.length ? (
                          <Line data={chartData} options={chartOptions} />
                        ) : (
                          <div className="text-soft text-center py-5">Belum ada data absensi</div>
                        )}
                      </div>
                    </div>
                  </PreviewAltCard>
                </Col>
                <Col lg="4">
                  <PreviewAltCard className="card-full h-100">
                    <div className="card-inner border-bottom">
                      <div className="card-title-group">
                        <div className="card-title">
                          <h6 className="title">Pending approval</h6>
                        </div>
                        <Badge color="warning" className="badge-dim">
                          {fmt(pending.total)}
                        </Badge>
                      </div>
                    </div>
                    <ul className="hrd-dash-pending">
                      {PENDING_ITEMS.map((item) => (
                        <li key={item.key}>
                          <Link to={appPath(item.to)} className="hrd-dash-pending-link">
                            <span className="hrd-dash-pending-left">
                              <Icon pack="premium" name={item.premiumIcon} size={22} />
                              {item.label}
                            </span>
                            <Badge
                              color={Number(pending[item.key] || 0) > 0 ? "warning" : "light"}
                              className="badge-dim"
                            >
                              {fmt(pending[item.key])}
                            </Badge>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </PreviewAltCard>
                </Col>
              </Row>
            </Block>

            <Block>
              <Row className="g-gs">
                <Col lg="8">
                  <PreviewAltCard className="card-full">
                    <div className="card-inner border-bottom">
                      <div className="card-title-group">
                        <div className="card-title">
                          <h6 className="title">Kontrak akan berakhir</h6>
                        </div>
                        <Link to={appPath("/admin/hrd/abs/personel-kontrak")} className="link link-sm">
                          Lihat semua
                        </Link>
                      </div>
                    </div>
                    <div className="card-inner p-0">
                      <div className="nk-tb-list nk-tb-ulist is-compact">
                        <div className="nk-tb-item nk-tb-head">
                          <div className="nk-tb-col">
                            <span>Pegawai</span>
                          </div>
                          <div className="nk-tb-col tb-col-md">
                            <span>Brand / Cabang</span>
                          </div>
                          <div className="nk-tb-col tb-col-sm">
                            <span>Berakhir</span>
                          </div>
                        </div>
                        {kontrakRows.length === 0 && (
                          <div className="nk-tb-item">
                            <div className="nk-tb-col">
                              <span className="text-soft">Tidak ada kontrak dalam window ini</span>
                            </div>
                          </div>
                        )}
                        {kontrakRows.map((row) => (
                          <div className="nk-tb-item" key={row.id || `${row.nik}-${row.tanggal_berakhir}`}>
                            <div className="nk-tb-col">
                              <Link
                                to={appPath("/admin/hrd/abs/personel-kontrak")}
                                className="project-title"
                              >
                                <div className="project-info">
                                  <h6 className="title">{row.employee_name || "—"}</h6>
                                  <span className="sub-text">{row.nik || ""}</span>
                                </div>
                              </Link>
                            </div>
                            <div className="nk-tb-col tb-col-md">
                              <span>
                                {row.brand || "—"}
                                {row.branch_name ? ` · ${row.branch_name}` : ""}
                              </span>
                            </div>
                            <div className="nk-tb-col tb-col-sm">
                              <span className="badge badge-dim bg-danger">{row.tanggal_berakhir}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PreviewAltCard>
                </Col>
                <Col lg="4">
                  <PreviewAltCard className="card-full">
                    <div className="card-inner border-bottom">
                      <div className="card-title">
                        <h6 className="title">Shortcut</h6>
                      </div>
                    </div>
                    <div className="card-inner">
                      <div className="hrd-dash-shortcuts">
                        <Link
                          to={appPath("/admin/hrd/abs/personel/new?vType=HO")}
                          className="btn btn-primary btn-block"
                        >
                          <Icon pack="premium" name="tambah" size={18} />
                          <span>Add karyawan</span>
                        </Link>
                        <Link
                          to={appPath("/admin/hrd/abs/generate-store")}
                          className="btn btn-outline-primary btn-block"
                        >
                          <Icon pack="premium" name="refresh" size={18} />
                          <span>Generate absen</span>
                        </Link>
                        <Link
                          to={appPath("/admin/hrd/rpt/slip-gaji")}
                          className="btn btn-outline-light btn-block"
                        >
                          <Icon pack="premium" name="cetak" size={18} />
                          <span>Slip gaji</span>
                        </Link>
                        <Link
                          to={appPath("/admin/hrd/rpt/export-employee")}
                          className="btn btn-outline-light btn-block"
                        >
                          <Icon pack="premium" name="unduh" size={18} />
                          <span>Export karyawan</span>
                        </Link>
                      </div>
                    </div>
                  </PreviewAltCard>
                </Col>
              </Row>
            </Block>
          </>
        )}
      </Content>
    </AccessGuard>
  );
};

export default HrdDashboardPage;
