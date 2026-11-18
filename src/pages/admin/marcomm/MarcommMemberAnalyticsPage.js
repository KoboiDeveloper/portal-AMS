import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Spinner } from "reactstrap";
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
  Icon,
} from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import AppDateRangePicker from "../../../components/AppDateRangePicker";
import ErrorState from "../../../components/admin/common/ErrorState";
import { accessService } from "../../../services/access.service";
import { getMarcommMemberAnalytics } from "../../../services/marcomm/marcomm.service";
import { getAuthNik, isSuperAdmin } from "../../../lib/auth";
import { extractRow, isSuccess } from "../../../lib/response";
import { brandColorMap, fDate, fDateTime, toYmd } from "./analytics/maShared";
import {
  BirthdaySection,
  CategorySection,
  CrossbrandSection,
  OverviewSection,
  ProfileSection,
  QualitySection,
  RetentionSection,
  SegmentSection,
  TierSection,
  TrendSection,
  VoucherSection,
} from "./analytics/maSections";
import MaSegmentMembers from "./analytics/MaSegmentMembers";
import "./marcomm-analytics.css";

const MODULE_CODE = "MAR_MBR_ANALYTICS";

const TABS = [
  { id: "ringkasan", label: "Ringkasan & tren" },
  { id: "retensi", label: "Retensi" },
  { id: "segmen", label: "Segmen & daftar member" },
  { id: "lintas", label: "Lintas brand" },
  { id: "voucher", label: "Voucher & ulang tahun" },
  { id: "tier", label: "Tier" },
  { id: "profil", label: "Profil & barang" },
  { id: "kualitas", label: "Kualitas data" },
];

const today = () => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
};

/** Sama dengan periode bawaan API: N bulan terakhir sampai hari ini. */
const lastMonths = (n) => {
  const t = today();
  return { from: toYmd(new Date(t.getFullYear(), t.getMonth() - n, t.getDate() + 1)), to: toYmd(t) };
};

const lastDays = (n) => {
  const t = today();
  return { from: toYmd(new Date(t.getFullYear(), t.getMonth(), t.getDate() - (n - 1))), to: toYmd(t) };
};

const buildPresets = (dataFrom) => [
  { id: "30d", label: "30 hari", range: () => lastDays(30) },
  { id: "3m", label: "3 bulan", range: () => lastMonths(3) },
  { id: "6m", label: "6 bulan", range: () => lastMonths(6) },
  { id: "12m", label: "12 bulan", range: () => lastMonths(12) },
  ...(dataFrom ? [{ id: "all", label: "Semua data", range: () => ({ from: dataFrom, to: toYmd(today()) }) }] : []),
];

const allowedFrom = (res) =>
  isSuccess(res) &&
  (res.allowed === true || res.isAllowed === true || res.data?.allowed === true || res.data?.is_allowed === true);

/** Izin EXPORT modul ini (tombol Excel pada daftar member). */
const useCanExport = () => {
  const [can, setCan] = useState(() => isSuperAdmin());
  useEffect(() => {
    if (isSuperAdmin()) return undefined;
    let mounted = true;
    accessService
      .check({ nik: getAuthNik(), module_code: MODULE_CODE, permission_code: "EXPORT" })
      .then((res) => {
        if (mounted) setCan(allowedFrom(res));
      })
      .catch((err) => {
        if (mounted) setCan(allowedFrom(err));
      });
    return () => {
      mounted = false;
    };
  }, []);
  return can;
};

const MarcommMemberAnalyticsPage = () => {
  const [meta, setMeta] = useState(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [metaError, setMetaError] = useState("");
  const [applied, setApplied] = useState(null); // { from, to, brand, nonce }
  const [draftFrom, setDraftFrom] = useState("");
  const [draftTo, setDraftTo] = useState("");
  const [tab, setTab] = useState("ringkasan");
  const [picked, setPicked] = useState(null); // { segment, brand } untuk daftar member
  const canExport = useCanExport();

  const loadMeta = useCallback(async (refresh = false) => {
    setMetaLoading(true);
    setMetaError("");
    try {
      const res = await getMarcommMemberAnalytics("meta", refresh ? { refresh: 1 } : {});
      if (!isSuccess(res)) {
        setMetaError(res?.responseMessage || "Gagal memuat analisa member");
        return;
      }
      const data = extractRow(res) || {};
      setMeta(data);
      // muat pertama: pakai periode bawaan API; "Hitung ulang": filter tetap, nonce naik supaya semua bagian dimuat lagi
      const from = data.default_period?.from || lastMonths(6).from;
      const to = data.default_period?.to || toYmd(today());
      setDraftFrom((prev) => prev || from);
      setDraftTo((prev) => prev || to);
      setApplied((prev) => {
        if (!prev) return { from, to, brand: "", nonce: 0 };
        return refresh ? { ...prev, nonce: prev.nonce + 1 } : prev;
      });
    } catch (err) {
      setMetaError(err?.responseMessage || err?.message || "Gagal memuat analisa member");
    } finally {
      setMetaLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMeta(false);
  }, [loadMeta]);

  const brands = useMemo(() => (meta?.brands || []).map((b) => b.brand).filter(Boolean), [meta]);
  const colors = useMemo(() => brandColorMap(brands), [brands]);
  const presets = useMemo(() => buildPresets(meta?.data_from), [meta]);

  const applyRange = (from, to) => {
    if (!from || !to) return;
    const [f, t] = from <= to ? [from, to] : [to, from];
    setDraftFrom(f);
    setDraftTo(t);
    setApplied((prev) => (prev ? { ...prev, from: f, to: t } : prev));
  };

  const applyBrand = (brand) => setApplied((prev) => (prev ? { ...prev, brand } : prev));

  const dirty = applied && (draftFrom !== applied.from || draftTo !== applied.to);
  const activePreset = applied
    ? presets.find((p) => {
        const r = p.range();
        return r.from === applied.from && r.to === applied.to;
      })?.id
    : null;

  const onPick = (segment, brand) => setPicked({ segment: segment || "", brand: brand || "" });

  const section = { query: applied, colors, brands };

  return (
    <AccessGuard moduleCode={MODULE_CODE} permission="VIEW">
      <>
        <Head title="Analisa Member" />
        <Content>
          <div className="ma-page">
            <BlockHead size="sm">
              <BlockBetween>
                <BlockHeadContent>
                  <BlockTitle page tag="h3">
                    Analisa Member
                  </BlockTitle>
                  <BlockDes className="text-soft">
                    Semua angka dan kalimat kesimpulan dihitung ulang dari data transaksi member, per brand, sesuai periode
                    yang dipilih.
                  </BlockDes>
                </BlockHeadContent>
              </BlockBetween>
            </BlockHead>

            {metaError && !meta ? (
              <Block>
                <ErrorState message={metaError} onRetry={() => loadMeta(false)} />
              </Block>
            ) : null}

            {metaLoading && !meta ? (
              <Block>
                <div className="text-center py-5">
                  <Spinner color="primary" />
                </div>
              </Block>
            ) : null}

            {meta && !meta.has_data ? (
              <Block>
                <div className="ma-empty">Belum ada transaksi member yang tercatat, jadi belum ada yang bisa dianalisa.</div>
              </Block>
            ) : null}

            {meta && meta.has_data && applied ? (
              <>
                <Block>
                  <div className="ma-filter">
                    <div className="ma-filter__row">
                      <div className="ma-filter__field">
                        <label className="ma-filter__label">Periode</label>
                        <div className="ma-filter__range">
                          <AppDateRangePicker
                            startDate={draftFrom}
                            endDate={draftTo}
                            isClearable={false}
                            maxDate={today()}
                            className="form-control form-control-sm"
                            onChange={(f, t) => {
                              setDraftFrom(f || "");
                              setDraftTo(t || "");
                            }}
                          />
                          <Button
                            color="primary"
                            size="sm"
                            disabled={!dirty || !draftFrom || !draftTo}
                            onClick={() => applyRange(draftFrom, draftTo)}
                          >
                            Terapkan
                          </Button>
                        </div>
                      </div>

                      <div className="ma-filter__field">
                        <label className="ma-filter__label">Rentang cepat</label>
                        <div className="btn-group ma-pills" role="group">
                          {presets.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              className={`btn btn-sm btn-light${activePreset === p.id ? " is-active" : ""}`}
                              onClick={() => {
                                const r = p.range();
                                applyRange(r.from, r.to);
                              }}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="ma-filter__field">
                        <label className="ma-filter__label" htmlFor="ma-brand">
                          Fokus brand
                        </label>
                        <select
                          id="ma-brand"
                          className="form-select form-select-sm ma-select"
                          value={applied.brand}
                          onChange={(e) => applyBrand(e.target.value)}
                        >
                          <option value="">Semua brand</option>
                          {brands.map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="ma-filter__field ma-filter__field--end">
                        <Button color="light" size="sm" onClick={() => loadMeta(true)} disabled={metaLoading}>
                          {metaLoading ? (
                            <Spinner size="sm" className="me-1" />
                          ) : (
                            <Icon name="reload" className="me-1" />
                          )}
                          Hitung ulang
                        </Button>
                      </div>
                    </div>

                    <div className="ma-filter__info">
                      <span>
                        Periode dipakai: <strong>{fDate(applied.from)} – {fDate(applied.to)}</strong>
                      </span>
                      <span>
                        Data transaksi member tersedia {fDate(meta.data_from)} s.d. {fDate(meta.data_to)}; transaksi terakhir
                        masuk {fDateTime(meta.last_ts)}
                      </span>
                      <span>Hasil hitung disimpan paling lama {meta.cache_minute || 10} menit</span>
                      {applied.brand ? (
                        <span>
                          Semua brand tetap ditampilkan; <strong>{applied.brand}</strong> ditandai dan disebut lebih dulu di
                          tiap kesimpulan
                        </span>
                      ) : null}
                    </div>
                    {metaError ? <div className="ma-filter__error">{metaError}</div> : null}
                  </div>
                </Block>

                <Block>
                  <div className="ma-tabs" role="tablist">
                    {TABS.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        role="tab"
                        aria-selected={tab === t.id}
                        className={`ma-tab${tab === t.id ? " is-active" : ""}`}
                        onClick={() => setTab(t.id)}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {tab === "ringkasan" ? (
                    <>
                      <OverviewSection {...section} />
                      <TrendSection {...section} />
                    </>
                  ) : null}

                  {tab === "retensi" ? <RetentionSection {...section} /> : null}

                  {tab === "segmen" ? (
                    <>
                      <SegmentSection {...section} onPick={onPick} picked={picked} />
                      {picked ? (
                        <MaSegmentMembers
                          to={applied.to}
                          nonce={applied.nonce}
                          brands={brands}
                          colors={colors}
                          picked={picked}
                          onPick={onPick}
                          canExport={canExport}
                        />
                      ) : (
                        <div className="ma-empty">
                          Klik jumlah member pada tabel segmen di atas untuk membuka daftar membernya
                          {canExport ? " dan mengunduhnya ke Excel" : ""}.{" "}
                          <button type="button" className="ma-link" onClick={() => onPick("F", applied.brand)}>
                            Buka segmen F (berisiko tapi bernilai)
                          </button>
                        </div>
                      )}
                    </>
                  ) : null}

                  {tab === "lintas" ? <CrossbrandSection {...section} /> : null}

                  {tab === "voucher" ? (
                    <>
                      <VoucherSection {...section} minSample={meta.min_sample} />
                      <BirthdaySection {...section} />
                    </>
                  ) : null}

                  {tab === "tier" ? <TierSection {...section} /> : null}

                  {tab === "profil" ? (
                    <>
                      <ProfileSection {...section} />
                      <CategorySection {...section} />
                    </>
                  ) : null}

                  {tab === "kualitas" ? <QualitySection {...section} /> : null}
                </Block>
              </>
            ) : null}
          </div>
        </Content>
      </>
    </AccessGuard>
  );
};

export default MarcommMemberAnalyticsPage;
