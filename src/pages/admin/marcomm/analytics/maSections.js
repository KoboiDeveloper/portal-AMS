import React, { useMemo, useState } from "react";
import { Bar, Line } from "react-chartjs-2";
import {
  BrandCell,
  ChartBox,
  DataTable,
  Delta,
  NO_TX_BRAND,
  Pills,
  SEGMENT_COLORS,
  SectionPanel,
  SegmentBadge,
  SubTitle,
  TOTAL_BRAND,
  TOTAL_COLOR,
  chartOptions,
  fDate,
  fInt,
  fMult,
  fPct,
  fRp,
  num,
  useSection,
} from "./maShared";

const isTotal = (row) => num(row?.is_total) === 1 || row?.brand === TOTAL_BRAND;
const brandRows = (rows) => (rows || []).filter((r) => !isTotal(r));

/** "12,3% (1.234)" — persen dulu, jumlah di belakang. */
const PctN = ({ pct, n }) => (
  <>
    {fPct(pct)} <span className="ma-muted">({fInt(n)})</span>
  </>
);

const brandCol = (colors, label = "Brand") => ({
  key: "brand",
  label,
  render: (r) => <BrandCell name={r.brand} colors={colors} />,
});

/* ================================================================== */
/* Ringkasan                                                           */
/* ================================================================== */

const OVERVIEW_METRICS = [
  { value: "omzet", label: "Omzet", fmt: fRp },
  { value: "trx", label: "Transaksi", fmt: fInt },
  { value: "members", label: "Member", fmt: fInt },
];

const Kpi = ({ label, value, prev, yoy, cmp }) => (
  <div className="ma-kpi">
    <div className="ma-kpi__label">{label}</div>
    <div className="ma-kpi__value">{value}</div>
    <div className="ma-kpi__cmp">
      {cmp?.prev?.available ? (
        <span>
          <Delta value={prev} /> vs periode sebelumnya
        </span>
      ) : null}
      {cmp?.yoy?.available ? (
        <span>
          <Delta value={yoy} /> vs tahun lalu
        </span>
      ) : null}
      {!cmp?.prev?.available && !cmp?.yoy?.available ? <span className="text-soft">Belum ada pembanding</span> : null}
    </div>
  </div>
);

const OverviewBody = ({ data, colors }) => {
  const [metric, setMetric] = useState("omzet");
  const rows = data.rows || [];
  const focus = data.focus_brand || "";
  const cmp = data.compare || {};
  const hasPrev = !!cmp.prev?.available;
  const hasYoy = !!cmp.yoy?.available;
  const head = rows.find((r) => r.brand === focus) || rows.find(isTotal) || {};
  const def = OVERVIEW_METRICS.find((m) => m.value === metric) || OVERVIEW_METRICS[0];
  const list = useMemo(() => brandRows(data.rows), [data.rows]);

  const chart = useMemo(() => {
    const datasets = [
      {
        label: "Periode ini",
        data: list.map((r) => num(r[metric])),
        backgroundColor: list.map((r) => colors[r.brand] || TOTAL_COLOR),
        borderRadius: 3,
        maxBarThickness: 44,
      },
    ];
    if (hasPrev) {
      datasets.push({
        label: "Periode sebelumnya",
        data: list.map((r) => num(r[`prev_${metric}`])),
        backgroundColor: "#a8b3c7",
        borderRadius: 3,
        maxBarThickness: 44,
      });
    }
    if (hasYoy) {
      datasets.push({
        label: "Periode yang sama tahun lalu",
        data: list.map((r) => num(r[`yoy_${metric}`])),
        backgroundColor: "#dbe1ea",
        borderRadius: 3,
        maxBarThickness: 44,
      });
    }
    return { labels: list.map((r) => r.brand), datasets };
  }, [list, metric, hasPrev, hasYoy, colors]);

  const columns = [
    brandCol(colors),
    { key: "members", label: "Member belanja", align: "right", render: (r) => fInt(r.members) },
    { key: "trx", label: "Transaksi", align: "right", render: (r) => fInt(r.trx) },
    { key: "omzet", label: "Omzet", align: "right", render: (r) => fRp(r.omzet) },
    { key: "share_omzet", label: "Porsi omzet", align: "right", render: (r) => fPct(r.share_omzet) },
    { key: "basket", label: "Nilai / transaksi", align: "right", render: (r) => fRp(r.basket) },
    { key: "spend", label: "Belanja / member", align: "right", render: (r) => fRp(r.spend_per_member) },
    {
      key: "repeat",
      label: "Belanja > 1 hari",
      align: "right",
      title: "Member yang belanja di lebih dari satu hari pada periode ini",
      render: (r) => <PctN pct={r.repeat_pct} n={r.repeat_buyer} />,
    },
    {
      key: "baru",
      label: "Member baru",
      align: "right",
      title: "Member yang belum punya transaksi tercatat sebelum periode ini",
      render: (r) => <PctN pct={r.baru_pct} n={r.member_baru} />,
    },
    { key: "stores", label: "Store pencatat", align: "right", render: (r) => fInt(r.stores) },
  ];
  if (hasPrev) {
    columns.push(
      { key: "dpt", label: "Transaksi vs sebelumnya", align: "right", render: (r) => <Delta value={r.d_prev_trx} /> },
      { key: "dpo", label: "Omzet vs sebelumnya", align: "right", render: (r) => <Delta value={r.d_prev_omzet} /> }
    );
  }
  if (hasYoy) {
    columns.push(
      { key: "dyt", label: "Transaksi vs tahun lalu", align: "right", render: (r) => <Delta value={r.d_yoy_trx} /> },
      { key: "dyo", label: "Omzet vs tahun lalu", align: "right", render: (r) => <Delta value={r.d_yoy_omzet} /> },
      { key: "dys", label: "Store vs tahun lalu", align: "right", render: (r) => <Delta value={r.d_yoy_stores} /> }
    );
  }

  return (
    <>
      <SubTitle hint={head.brand ? `Angka untuk ${head.brand}` : undefined}>Angka utama</SubTitle>
      <div className="ma-kpis">
        <Kpi label="Member belanja" value={fInt(head.members)} prev={head.d_prev_members} yoy={head.d_yoy_members} cmp={cmp} />
        <Kpi label="Transaksi" value={fInt(head.trx)} prev={head.d_prev_trx} yoy={head.d_yoy_trx} cmp={cmp} />
        <Kpi label="Omzet member" value={fRp(head.omzet)} prev={head.d_prev_omzet} yoy={head.d_yoy_omzet} cmp={cmp} />
        <Kpi label="Store pencatat" value={fInt(head.stores)} prev={head.d_prev_stores} yoy={head.d_yoy_stores} cmp={cmp} />
      </div>

      <SubTitle
        hint={[
          hasPrev ? `Periode sebelumnya: ${cmp.prev.label}` : "",
          hasYoy ? `Tahun lalu: ${cmp.yoy.label}` : "",
        ]
          .filter(Boolean)
          .join(" · ")}
      >
        Perbandingan per brand
      </SubTitle>
      <div className="ma-toolbar">
        <Pills options={OVERVIEW_METRICS} value={metric} onChange={setMetric} />
      </div>
      <ChartBox>
        <Bar data={chart} options={chartOptions({ yFmt: def.fmt })} />
      </ChartBox>

      <DataTable columns={columns} rows={rows} focus={focus} />
    </>
  );
};

export const OverviewSection = ({ query, colors }) => {
  const state = useSection("overview", query);
  return (
    <SectionPanel title="Ringkasan per brand" state={state}>
      {(d) => <OverviewBody data={d} colors={colors} />}
    </SectionPanel>
  );
};

/* ================================================================== */
/* Tren bulanan                                                        */
/* ================================================================== */

const TREND_METRICS = [
  { value: "trx", label: "Transaksi", fmt: fInt },
  { value: "members", label: "Member aktif", fmt: fInt },
  { value: "omzet", label: "Omzet", fmt: fRp },
  { value: "basket", label: "Nilai / transaksi", fmt: fRp },
  { value: "member_baru", label: "Member baru", fmt: fInt },
  { value: "stores", label: "Store pencatat", fmt: fInt },
];

const TrendBody = ({ data, colors, brands }) => {
  const [metric, setMetric] = useState("trx");
  const focus = data.focus_brand || "";
  const def = TREND_METRICS.find((m) => m.value === metric) || TREND_METRICS[0];
  const months = useMemo(() => data.months || [], [data.months]);

  const cell = useMemo(() => {
    const map = {};
    (data.rows || []).forEach((r) => {
      map[`${r.bulan}|${r.brand}`] = r;
    });
    return map;
  }, [data.rows]);

  const names = useMemo(() => [...brands, TOTAL_BRAND], [brands]);

  const chart = useMemo(
    () => ({
      labels: months.map((m) => (m.partial ? `${m.label} *` : m.label)),
      datasets: names.map((name) => {
        const total = name === TOTAL_BRAND;
        return {
          label: name,
          data: months.map((m) => num(cell[`${m.bulan}|${name}`]?.[metric])),
          borderColor: colors[name] || TOTAL_COLOR,
          backgroundColor: colors[name] || TOTAL_COLOR,
          borderWidth: focus && name === focus ? 3.5 : 2,
          borderDash: total ? [5, 4] : undefined,
          pointRadius: 2.5,
          tension: 0.25,
          hidden: total,
        };
      }),
    }),
    [months, names, cell, metric, colors, focus]
  );

  const tableRows = useMemo(() => [...months].reverse(), [months]);
  const columns = [
    {
      key: "bulan",
      label: "Bulan",
      render: (m) => (
        <>
          {m.label}
          {m.partial ? <span className="ma-tag">belum utuh</span> : null}
        </>
      ),
    },
    ...names.map((name) => ({
      key: name,
      label: name === TOTAL_BRAND ? name : <BrandCell name={name} colors={colors} />,
      align: "right",
      brand: name,
      render: (m) => def.fmt(cell[`${m.bulan}|${name}`]?.[metric]),
    })),
  ];

  return (
    <>
      <div className="ma-toolbar">
        <Pills options={TREND_METRICS} value={metric} onChange={setMetric} />
        <span className="ma-muted">
          Garis &quot;{TOTAL_BRAND}&quot; disembunyikan; klik namanya di legenda untuk menampilkan. Tanda * = bulan belum utuh.
        </span>
      </div>
      <ChartBox tall>
        <Line data={chart} options={chartOptions({ yFmt: def.fmt })} />
      </ChartBox>
      <SubTitle hint={`${def.label} per bulan, terbaru di atas`}>Angka per bulan</SubTitle>
      <DataTable columns={columns} rows={tableRows} rowKey={(m) => m.bulan} focus={focus} />
    </>
  );
};

export const TrendSection = ({ query, colors, brands }) => {
  const state = useSection("trend", query);
  return (
    <SectionPanel title="Tren bulanan per brand" state={state}>
      {(d) => <TrendBody data={d} colors={colors} brands={brands} />}
    </SectionPanel>
  );
};

/* ================================================================== */
/* Retensi                                                             */
/* ================================================================== */

const RECENCY = [
  { key: "r_0_30", label: "0–30 hari", color: "#15803d" },
  { key: "r_31_90", label: "31–90 hari", color: "#4ade80" },
  { key: "r_91_180", label: "91–180 hari", color: "#fcd34d" },
  { key: "r_181_365", label: "181–365 hari", color: "#f59e0b" },
  { key: "r_365p", label: "> 365 hari", color: "#cbd5e1" },
];

const COHORT = [
  { key: "k30_pct", label: "Balik dalam 30 hari", color: "#93c5fd" },
  { key: "k90_pct", label: "Balik dalam 90 hari", color: "#3b82f6" },
  { key: "k180_pct", label: "Balik dalam 180 hari", color: "#1e3a8a" },
];

const RetentionBody = ({ data, colors }) => {
  const rows = data.rows || [];
  const focus = data.focus_brand || "";
  const list = useMemo(() => brandRows(data.rows), [data.rows]);

  const recencyChart = useMemo(
    () => ({
      labels: list.map((r) => r.brand),
      datasets: RECENCY.map((b) => ({
        label: b.label,
        data: list.map((r) => (num(r.members) ? (num(r[b.key]) / num(r.members)) * 100 : 0)),
        backgroundColor: b.color,
        maxBarThickness: 56,
      })),
    }),
    [list]
  );

  const cohortChart = useMemo(
    () => ({
      labels: list.map((r) => r.brand),
      datasets: COHORT.map((c) => ({
        label: c.label,
        data: list.map((r) => num(r[c.key])),
        backgroundColor: c.color,
        borderRadius: 3,
        maxBarThickness: 36,
      })),
    }),
    [list]
  );

  const freqCols = [
    brandCol(colors),
    { key: "members", label: "Member", align: "right", render: (r) => fInt(r.members) },
    { key: "hb1", label: "Belanja 1 hari", align: "right", render: (r) => <PctN pct={r.hb1_pct} n={r.hb1} /> },
    { key: "hb2", label: "Belanja 2 hari", align: "right", render: (r) => <PctN pct={r.hb2_pct} n={r.hb2} /> },
    { key: "hb3", label: "Belanja 3 hari atau lebih", align: "right", render: (r) => <PctN pct={r.hb3p_pct} n={r.hb3p} /> },
    {
      key: "aktif",
      label: "Terakhir belanja ≤ 90 hari",
      align: "right",
      render: (r) => <PctN pct={r.aktif90_pct} n={num(r.r_0_30) + num(r.r_31_90)} />,
    },
    {
      key: "pasif",
      label: "Tidak belanja > 180 hari",
      align: "right",
      render: (r) => <PctN pct={r.pasif180_pct} n={num(r.r_181_365) + num(r.r_365p)} />,
    },
  ];

  const cohortCols = [
    brandCol(colors, "Brand pertama"),
    { key: "k30", label: "Balik ≤ 30 hari", align: "right", render: (r) => <PctN pct={r.k30_pct} n={r.k30_balik} /> },
    { key: "k30m", label: "dari member", align: "right", render: (r) => fInt(r.k30_members) },
    { key: "k90", label: "Balik ≤ 90 hari", align: "right", render: (r) => <PctN pct={r.k90_pct} n={r.k90_balik} /> },
    { key: "k90m", label: "dari member", align: "right", render: (r) => fInt(r.k90_members) },
    { key: "k180", label: "Balik ≤ 180 hari", align: "right", render: (r) => <PctN pct={r.k180_pct} n={r.k180_balik} /> },
    { key: "k180m", label: "dari member", align: "right", render: (r) => fInt(r.k180_members) },
    {
      key: "sama",
      label: "Balik ke brand yang sama",
      align: "right",
      render: (r) => <PctN pct={r.k180_sama_pct} n={r.k180_balik_sama} />,
    },
    {
      key: "lain",
      label: "Belanja di brand lain",
      align: "right",
      render: (r) => <PctN pct={r.k180_lain_pct} n={r.k180_balik_lain} />,
    },
  ];

  return (
    <>
      <SubTitle hint="Porsi member tiap brand menurut lama sejak belanja terakhir di brand itu">
        Kapan terakhir belanja
      </SubTitle>
      <ChartBox>
        <Bar data={recencyChart} options={chartOptions({ yFmt: (v) => fPct(v, 0), stacked: true, max: 100 })} />
      </ChartBox>
      <DataTable columns={freqCols} rows={rows} focus={focus} />

      <SubTitle hint="Member baru menurut brand pada hari belanja pertamanya; 180 hari dirinci ke brand yang sama dan brand lain">
        Balik belanja setelah pembelian pertama
      </SubTitle>
      <ChartBox>
        <Bar data={cohortChart} options={chartOptions({ yFmt: (v) => fPct(v, 0) })} />
      </ChartBox>
      <DataTable columns={cohortCols} rows={rows} focus={focus} />
    </>
  );
};

export const RetentionSection = ({ query, colors }) => {
  const state = useSection("retention", query);
  return (
    <SectionPanel title="Retensi per brand" state={state}>
      {(d) => <RetentionBody data={d} colors={colors} />}
    </SectionPanel>
  );
};

/* ================================================================== */
/* Segmen                                                              */
/* ================================================================== */

const SegmentBody = ({ data, colors, brands, onPick, picked }) => {
  const segments = useMemo(() => data.segments || [], [data.segments]);
  const focus = data.focus_brand || "";

  const chart = useMemo(
    () => ({
      labels: brands,
      datasets: segments.map((s) => ({
        label: `${s.code} · ${s.label}`,
        data: brands.map((b) => num((s.brands || []).find((x) => x.brand === b)?.pct_of_brand)),
        backgroundColor: SEGMENT_COLORS[s.code] || TOTAL_COLOR,
        maxBarThickness: 56,
      })),
    }),
    [segments, brands]
  );

  const brandTotals = useMemo(() => {
    const map = {};
    (data.brands || []).forEach((b) => {
      map[b.brand] = b;
    });
    return map;
  }, [data.brands]);

  const isPicked = (code, brand) => picked && picked.segment === code && (picked.brand || "") === (brand || "");

  return (
    <>
      <SubTitle hint="Tiap batang = 100% member satu brand (brand dengan belanja terbesar tiap member)">
        Komposisi segmen per brand
      </SubTitle>
      <ChartBox tall>
        <Bar data={chart} options={chartOptions({ yFmt: (v) => fPct(v, 0), stacked: true, max: 100 })} />
      </ChartBox>

      <SubTitle hint="Klik jumlah member untuk membuka daftar membernya di bawah">Segmen dan saran treatment</SubTitle>
      <div className="table-responsive ma-table-wrap">
        <table className="table table-sm ma-table ma-table--segment mb-0">
          <thead>
            <tr>
              <th>Segmen</th>
              <th>Ketentuan</th>
              <th>Saran treatment</th>
              <th className="text-end">Member</th>
              <th className="text-end">Omzet</th>
              <th className="text-end">Belanja / member</th>
              {brands.map((b) => (
                <th key={b} className={`text-end${focus === b ? " is-focus-col" : ""}`}>
                  <BrandCell name={b} colors={colors} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {segments.map((s) => (
              <tr key={s.code}>
                <td>
                  <span className="ma-seg">
                    <SegmentBadge code={s.code} />
                    {s.label}
                  </span>
                </td>
                <td className="ma-wrap">{s.definisi}</td>
                <td className="ma-wrap">{s.treatment}</td>
                <td className="text-end">
                  <button
                    type="button"
                    className={`ma-link${isPicked(s.code, "") ? " is-picked" : ""}`}
                    onClick={() => onPick(s.code, "")}
                    disabled={!num(s.members)}
                  >
                    {fInt(s.members)}
                  </button>
                  <div className="ma-muted">{fPct(s.pct_members)}</div>
                </td>
                <td className="text-end">
                  {fRp(s.omzet)}
                  <div className="ma-muted">{fPct(s.pct_omzet)}</div>
                </td>
                <td className="text-end">{fRp(s.avg_spend)}</td>
                {brands.map((b) => {
                  const c = (s.brands || []).find((x) => x.brand === b) || {};
                  return (
                    <td key={b} className={`text-end${focus === b ? " is-focus-col" : ""}`}>
                      <button
                        type="button"
                        className={`ma-link${isPicked(s.code, b) ? " is-picked" : ""}`}
                        onClick={() => onPick(s.code, b)}
                        disabled={!num(c.members)}
                      >
                        {fInt(c.members)}
                      </button>
                      <div className="ma-muted">{fPct(c.pct_of_brand)}</div>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="is-total">
              <td colSpan={3}>Semua segmen</td>
              <td className="text-end">{fInt(data.total?.members)}</td>
              <td className="text-end">{fRp(data.total?.omzet)}</td>
              <td className="text-end">
                {fRp(num(data.total?.members) ? num(data.total?.omzet) / num(data.total?.members) : 0)}
              </td>
              {brands.map((b) => (
                <td key={b} className={`text-end${focus === b ? " is-focus-col" : ""}`}>
                  {fInt(brandTotals[b]?.members)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="ma-muted mt-1">
        Persen di kolom brand = porsi dari member brand itu. Batas rupiah: VIP ≥ {fRp(data.thresholds?.vip_min)}, bernilai ≥{" "}
        {fRp(data.thresholds?.value_min)} (mengikuti Master Tier).
      </div>
    </>
  );
};

export const SegmentSection = ({ query, colors, brands, onPick, picked }) => {
  const state = useSection("segment", query);
  return (
    <SectionPanel title="Segmen member per brand" state={state}>
      {(d) => <SegmentBody data={d} colors={colors} brands={brands} onPick={onPick} picked={picked} />}
    </SectionPanel>
  );
};

/* ================================================================== */
/* Lintas brand                                                        */
/* ================================================================== */

const CrossbrandBody = ({ data, colors }) => {
  const rows = data.rows || [];
  const focus = data.focus_brand || "";
  const list = useMemo(() => brandRows(data.rows), [data.rows]);

  const chart = useMemo(
    () => ({
      labels: list.map((r) => r.brand),
      datasets: [
        {
          label: "Member yang hanya belanja di brand ini",
          data: list.map((r) => num(r.avg_spend_eksklusif)),
          backgroundColor: "#a8b3c7",
          borderRadius: 3,
          maxBarThickness: 44,
        },
        {
          label: "Member yang juga belanja di brand lain (total semua brand)",
          data: list.map((r) => num(r.avg_spend_lintas)),
          backgroundColor: "#1d49a7",
          borderRadius: 3,
          maxBarThickness: 44,
        },
      ],
    }),
    [list]
  );

  const columns = [
    brandCol(colors),
    { key: "members", label: "Member", align: "right", render: (r) => fInt(r.members) },
    { key: "eksklusif", label: "Hanya satu brand", align: "right", render: (r) => fInt(r.eksklusif) },
    { key: "lintas", label: "Juga di brand lain", align: "right", render: (r) => <PctN pct={r.lintas_pct} n={r.lintas} /> },
    { key: "avg_e", label: "Belanja / member satu brand", align: "right", render: (r) => fRp(r.avg_spend_eksklusif) },
    { key: "avg_l", label: "Belanja / member lintas brand", align: "right", render: (r) => fRp(r.avg_spend_lintas) },
    { key: "kali", label: "Kelipatan", align: "right", render: (r) => (num(r.kelipatan) ? fMult(r.kelipatan) : "—") },
    {
      key: "lain",
      label: "Omzet mereka di brand lain",
      align: "right",
      render: (r) => (isTotal(r) ? "—" : fRp(r.omzet_lintas_di_brand_lain)),
    },
  ];

  const pairCols = [
    { key: "a", label: "Brand A", render: (r) => <BrandCell name={r.brand_a} colors={colors} /> },
    { key: "b", label: "Brand B", render: (r) => <BrandCell name={r.brand_b} colors={colors} /> },
    { key: "members", label: "Member di keduanya", align: "right", render: (r) => fInt(r.members) },
    { key: "pa", label: "Porsi dari member brand A", align: "right", render: (r) => fPct(r.pct_a) },
    { key: "pb", label: "Porsi dari member brand B", align: "right", render: (r) => fPct(r.pct_b) },
  ];

  return (
    <>
      <SubTitle hint="Rata-rata belanja per member pada periode ini">Belanja member satu brand vs lintas brand</SubTitle>
      <ChartBox>
        <Bar data={chart} options={chartOptions({ yFmt: fRp })} />
      </ChartBox>
      <DataTable columns={columns} rows={rows} focus={focus} />

      <SubTitle hint="Member yang belanja di kedua brand pada periode ini">Pasangan brand</SubTitle>
      <DataTable
        columns={pairCols}
        rows={data.pairs || []}
        rowKey={(r) => `${r.brand_a}|${r.brand_b}`}
        rowClass={(r) => (focus && (r.brand_a === focus || r.brand_b === focus) ? "is-focus" : "")}
        emptyText="Tidak ada member yang belanja di lebih dari satu brand pada periode ini"
      />
    </>
  );
};

export const CrossbrandSection = ({ query, colors }) => {
  const state = useSection("crossbrand", query);
  return (
    <SectionPanel title="Member lintas brand" state={state}>
      {(d) => <CrossbrandBody data={d} colors={colors} />}
    </SectionPanel>
  );
};

/* ================================================================== */
/* Voucher                                                             */
/* ================================================================== */

const MIN_SAMPLE = 30;

const VoucherBody = ({ data, colors, brands, minSample }) => {
  const groups = useMemo(() => data.groups || [], [data.groups]);
  const focus = data.focus_brand || "";
  const limit = minSample || MIN_SAMPLE;

  const flat = useMemo(() => {
    const out = [];
    groups.forEach((g) => {
      const name = `${g.kategori} · ${String(g.jenis || "").toLowerCase()}`;
      out.push({ ...g, _group: true, _name: name, brand: undefined });
      (g.brands || []).forEach((b) => out.push({ ...b, _name: name }));
    });
    return out;
  }, [groups]);

  const chartGroups = useMemo(() => groups.filter((g) => num(g.voucher) >= limit), [groups, limit]);
  const chart = useMemo(
    () => ({
      labels: chartGroups.map((g) => `${g.kategori} (${String(g.jenis || "").toLowerCase()})`),
      datasets: brands.map((b) => ({
        label: b,
        data: chartGroups.map((g) => {
          const row = (g.brands || []).find((x) => x.brand === b);
          return row && num(row.voucher) >= limit ? num(row.pakai_pct) : null;
        }),
        backgroundColor: colors[b] || TOTAL_COLOR,
        borderRadius: 3,
        maxBarThickness: 32,
      })),
    }),
    [chartGroups, brands, colors, limit]
  );

  const columns = [
    {
      key: "name",
      label: "Kategori voucher / brand pemilik",
      render: (r) =>
        r._group ? (
          <strong>
            {r.kategori} <span className="ma-tag">{String(r.jenis || "").toLowerCase()}</span>
          </strong>
        ) : (
          <span className="ma-indent">
            <BrandCell name={r.brand} colors={colors} />
          </span>
        ),
    },
    { key: "voucher", label: "Voucher", align: "right", render: (r) => fInt(r.voucher) },
    { key: "members", label: "Member", align: "right", render: (r) => fInt(r.members) },
    { key: "dipakai", label: "Dipakai", align: "right", render: (r) => <PctN pct={r.pakai_pct} n={r.dipakai} /> },
    { key: "hangus", label: "Hangus", align: "right", render: (r) => <PctN pct={r.hangus_pct} n={r.hangus} /> },
    { key: "aktif", label: "Masih berlaku", align: "right", render: (r) => fInt(r.aktif) },
    {
      key: "lewat",
      label: "Tidak dipakai padahal belanja",
      align: "right",
      title: "Voucher tidak dipakai walaupun pemiliknya belanja selama voucher berlaku",
      render: (r) => fInt(r.belanja_tanpa_pakai),
    },
    {
      key: "nilai",
      label: "Nilai voucher nominal",
      align: "right",
      render: (r) => (num(r.nilai_nominal) ? fRp(r.nilai_nominal) : "—"),
    },
  ];

  return (
    <>
      {chartGroups.length ? (
        <>
          <SubTitle hint={`Hanya kategori dan brand dengan minimal ${limit} voucher`}>Tingkat pakai voucher per brand</SubTitle>
          <ChartBox>
            <Bar data={chart} options={chartOptions({ yFmt: (v) => fPct(v, 0) })} />
          </ChartBox>
        </>
      ) : null}
      <DataTable
        columns={columns}
        rows={flat}
        focus={focus}
        rowKey={(r, i) => `${r._name}-${r._group ? "group" : r.brand}-${i}`}
        rowClass={(r) => (r._group ? "is-group" : r.brand === NO_TX_BRAND ? "is-dim" : "")}
        emptyText="Tidak ada voucher yang dibuat pada periode ini"
      />
    </>
  );
};

export const VoucherSection = ({ query, colors, brands, minSample }) => {
  const state = useSection("voucher", query);
  return (
    <SectionPanel title="Voucher per brand" state={state}>
      {(d) => <VoucherBody data={d} colors={colors} brands={brands} minSample={minSample} />}
    </SectionPanel>
  );
};

/* ================================================================== */
/* Ulang tahun                                                         */
/* ================================================================== */

const BirthdayBody = ({ data, colors }) => {
  const rows = data.rows || [];
  const days = num(rows.find(isTotal)?.jendela_hari) || 30;
  const columns = [
    brandCol(colors),
    { key: "members", label: "Member pembeli", align: "right", render: (r) => fInt(r.members) },
    { key: "ultah", label: `Ulang tahun ${fInt(days)} hari ke depan`, align: "right", render: (r) => fInt(r.ultah) },
    {
      key: "email",
      label: "Lolos syarat email ulang tahun",
      align: "right",
      render: (r) => <PctN pct={r.ultah_lolos_email_pct} n={r.ultah_lolos_email} />,
    },
    {
      key: "telp",
      label: "Punya nomor telepon",
      align: "right",
      render: (r) => <PctN pct={r.ultah_punya_telp_pct} n={r.ultah_punya_telp} />,
    },
    {
      key: "aktif",
      label: "Masih belanja ≤ 180 hari",
      align: "right",
      render: (r) => <PctN pct={r.ultah_aktif_180_pct} n={r.ultah_aktif_180} />,
    },
    {
      key: "valid",
      label: "Email tervalidasi (semua member pembeli)",
      align: "right",
      render: (r) => <PctN pct={r.members_lolos_email_pct} n={r.members_lolos_email} />,
    },
    { key: "dob", label: "Tanggal lahir tidak valid", align: "right", render: (r) => fInt(r.dob_tidak_valid) },
  ];
  return <DataTable columns={columns} rows={rows} focus={data.focus_brand || ""} />;
};

export const BirthdaySection = ({ query, colors }) => {
  const state = useSection("birthday", query);
  return (
    <SectionPanel title="Ulang tahun per brand" state={state}>
      {(d) => <BirthdayBody data={d} colors={colors} />}
    </SectionPanel>
  );
};

/* ================================================================== */
/* Tier                                                                */
/* ================================================================== */

const TIER_COLORS = ["#cbd5e1", "#93c5fd", "#3b82f6", "#1d4ed8", "#7c3aed", "#be185d", "#b45309", "#0f766e"];

const TierBody = ({ data, colors, brands }) => {
  const tiers = useMemo(() => data.tiers || [], [data.tiers]);
  const focus = data.focus_brand || "";

  const chart = useMemo(
    () => ({
      labels: brands,
      datasets: tiers.map((t, i) => ({
        label: t.tier_name || `Tier ${t.tier_id}`,
        data: brands.map((b) => num((t.brands || []).find((x) => x.brand === b)?.pct_of_brand)),
        backgroundColor: TIER_COLORS[i % TIER_COLORS.length],
        maxBarThickness: 56,
      })),
    }),
    [tiers, brands]
  );

  const tierCols = [
    { key: "tier", label: "Tier menurut total belanja", render: (t) => t.tier_name || `Tier ${t.tier_id}` },
    { key: "from", label: "Batas bawah", align: "right", render: (t) => fRp(t.amount_from) },
    { key: "members", label: "Member", align: "right", render: (t) => <PctN pct={t.pct_members} n={t.members} /> },
    { key: "omzet", label: "Omzet", align: "right", render: (t) => fRp(t.omzet) },
    {
      key: "dekat",
      label: "Hampir naik tier",
      align: "right",
      title: `Kurang dari ${fRp(data.gap)} lagi ke tier berikutnya`,
      render: (t) => (t.next_from === null || t.next_from === undefined ? "—" : fInt(t.dekat_naik)),
    },
    {
      key: "dekat_aktif",
      label: "…dan masih belanja ≤ 180 hari",
      align: "right",
      render: (t) => (t.next_from === null || t.next_from === undefined ? "—" : fInt(t.dekat_naik_aktif)),
    },
    { key: "pasif", label: "Tidak belanja > 180 hari", align: "right", render: (t) => fInt(t.pasif_180) },
    ...brands.map((b) => ({
      key: b,
      label: <BrandCell name={b} colors={colors} />,
      align: "right",
      brand: b,
      render: (t) => {
        const c = (t.brands || []).find((x) => x.brand === b) || {};
        return <PctN pct={c.pct_of_brand} n={c.members} />;
      },
    })),
  ];

  const brandCols = [
    brandCol(colors),
    { key: "members", label: "Member", align: "right", render: (r) => fInt(r.members) },
    { key: "dekat", label: "Hampir naik tier", align: "right", render: (r) => fInt(r.dekat_naik) },
    {
      key: "dekat_aktif",
      label: "…dan masih belanja ≤ 180 hari",
      align: "right",
      render: (r) => <PctN pct={r.dekat_naik_aktif_pct} n={r.dekat_naik_aktif} />,
    },
    {
      key: "tinggi",
      label: "Tier menengah ke atas",
      align: "right",
      title: "Tier keempat dari bawah dan di atasnya",
      render: (r) => <PctN pct={r.tier_tinggi_pct} n={r.tier_tinggi} />,
    },
    {
      key: "lower",
      label: "Tier tercatat lebih rendah",
      align: "right",
      title: "Tier di aplikasi lebih rendah daripada tier menurut total belanja",
      render: (r) => fInt(r.tier_tercatat_lebih_rendah),
    },
  ];

  return (
    <>
      <SubTitle hint={`Hampir naik tier = kurang dari ${fRp(data.gap)} lagi ke batas tier berikutnya`}>
        Per brand
      </SubTitle>
      <DataTable columns={brandCols} rows={data.brands || []} focus={focus} />

      <SubTitle hint="Tiap batang = 100% member satu brand">Komposisi tier per brand</SubTitle>
      <ChartBox>
        <Bar data={chart} options={chartOptions({ yFmt: (v) => fPct(v, 0), stacked: true, max: 100 })} />
      </ChartBox>
      <DataTable columns={tierCols} rows={tiers} rowKey={(t) => `tier-${t.tier_id}`} focus={focus} />
    </>
  );
};

export const TierSection = ({ query, colors, brands }) => {
  const state = useSection("tier", query);
  return (
    <SectionPanel title="Tier per brand" state={state}>
      {(d) => <TierBody data={d} colors={colors} brands={brands} />}
    </SectionPanel>
  );
};

/* ================================================================== */
/* Profil (gender, umur)                                               */
/* ================================================================== */

const AGE_COLORS = ["#bae6fd", "#7dd3fc", "#38bdf8", "#0284c7", "#075985", "#0c4a6e", "#e2e8f0", "#e2e8f0", "#e2e8f0", "#e2e8f0"];

const pivotProfile = (rows, dimensi) => {
  const groups = [];
  const seen = {};
  const cell = {};
  (rows || [])
    .filter((r) => r.dimensi === dimensi)
    .forEach((r) => {
      const k = String(r.kelompok ?? "");
      if (!seen[k]) {
        seen[k] = true;
        groups.push({ kelompok: k, urut: num(r.urut) });
      }
      cell[`${k}|${r.brand}`] = r;
    });
  groups.sort((a, b) => a.urut - b.urut || a.kelompok.localeCompare(b.kelompok));
  return { groups, cell };
};

const ProfileTable = ({ pivot, names, colors, focus, label }) => {
  const columns = [
    { key: "kelompok", label, render: (g) => g.kelompok || "(kosong)" },
    ...names.map((name) => ({
      key: name,
      label: name === TOTAL_BRAND ? name : <BrandCell name={name} colors={colors} />,
      align: "right",
      brand: name,
      render: (g) => {
        const c = pivot.cell[`${g.kelompok}|${name}`];
        return c ? <PctN pct={c.pct_members} n={c.members} /> : "—";
      },
    })),
  ];
  return <DataTable columns={columns} rows={pivot.groups} rowKey={(g) => g.kelompok} focus={focus} />;
};

const ProfileBody = ({ data, colors, brands }) => {
  const focus = data.focus_brand || "";
  const names = useMemo(() => [...brands, TOTAL_BRAND], [brands]);
  const gender = useMemo(() => pivotProfile(data.rows, "GENDER"), [data.rows]);
  const umur = useMemo(() => pivotProfile(data.rows, "UMUR"), [data.rows]);

  const ageChart = useMemo(
    () => ({
      labels: brands,
      datasets: umur.groups.map((g, i) => ({
        label: g.kelompok || "(kosong)",
        data: brands.map((b) => num(umur.cell[`${g.kelompok}|${b}`]?.pct_members)),
        backgroundColor: AGE_COLORS[i % AGE_COLORS.length],
        maxBarThickness: 56,
      })),
    }),
    [umur, brands]
  );

  return (
    <>
      <SubTitle hint="Porsi dari member tiap brand; kode gender ditampilkan apa adanya dari data member">Gender</SubTitle>
      <ProfileTable pivot={gender} names={names} colors={colors} focus={focus} label="Gender" />

      <SubTitle hint="Tiap batang = 100% member satu brand">Kelompok umur</SubTitle>
      <ChartBox>
        <Bar data={ageChart} options={chartOptions({ yFmt: (v) => fPct(v, 0), stacked: true, max: 100 })} />
      </ChartBox>
      <ProfileTable pivot={umur} names={names} colors={colors} focus={focus} label="Kelompok umur" />
    </>
  );
};

export const ProfileSection = ({ query, colors, brands }) => {
  const state = useSection("profile", query);
  return (
    <SectionPanel title="Profil member per brand" state={state}>
      {(d) => <ProfileBody data={d} colors={colors} brands={brands} />}
    </SectionPanel>
  );
};

/* ================================================================== */
/* Kode barang                                                         */
/* ================================================================== */

const CATEGORY_TOP = 15;

const CategoryBody = ({ data, colors, brands }) => {
  const pivot = useMemo(() => {
    const byKode = {};
    (data.rows || []).forEach((r) => {
      const k = String(r.kode ?? "");
      if (!byKode[k]) byKode[k] = { kode: k, qty: 0, net: 0, contoh: "", cells: {}, total: null };
      if (isTotal(r)) {
        byKode[k].total = r;
      } else {
        byKode[k].cells[r.brand] = r;
        byKode[k].qty += num(r.qty);
        byKode[k].net += num(r.net);
      }
      if (!byKode[k].contoh && r.contoh) byKode[k].contoh = r.contoh;
    });
    const list = Object.values(byKode).map((it) => ({
      ...it,
      qty: it.total ? num(it.total.qty) : it.qty,
      net: it.total ? num(it.total.net) : it.net,
      contoh: it.total?.contoh || it.contoh,
    }));
    list.sort((a, b) => b.qty - a.qty);
    return list;
  }, [data.rows]);

  const top = pivot.slice(0, CATEGORY_TOP);
  const columns = [
    { key: "kode", label: "Kode", render: (r) => <strong>{r.kode || "(kosong)"}</strong> },
    { key: "contoh", label: "Contoh deskripsi di struk", render: (r) => <span className="ma-wrap">{r.contoh || "—"}</span> },
    { key: "qty", label: "Qty semua brand", align: "right", render: (r) => fInt(r.qty) },
    { key: "harga", label: "Harga rata-rata", align: "right", render: (r) => fRp(r.qty ? r.net / r.qty : 0) },
    ...brands.map((b) => ({
      key: b,
      label: <BrandCell name={b} colors={colors} />,
      align: "right",
      brand: b,
      title: "Porsi dari qty brand ini",
      render: (r) => {
        const c = r.cells[b];
        return c ? <PctN pct={c.pct_qty} n={c.qty} /> : "—";
      },
    })),
  ];

  return (
    <>
      <SubTitle
        hint={`${Math.min(CATEGORY_TOP, pivot.length)} kode dengan qty terbesar dari ${fInt(pivot.length)} kode; persen = porsi dari qty brand itu`}
      >
        Kode barang yang dibeli member
      </SubTitle>
      <DataTable
        columns={columns}
        rows={top}
        rowKey={(r) => r.kode}
        focus={data.focus_brand || ""}
        emptyText="Tidak ada barang terjual ke member pada periode ini"
      />
    </>
  );
};

export const CategorySection = ({ query, colors, brands }) => {
  const state = useSection("category", query);
  return (
    <SectionPanel title="Barang yang dibeli member per brand" state={state}>
      {(d) => <CategoryBody data={d} colors={colors} brands={brands} />}
    </SectionPanel>
  );
};

/* ================================================================== */
/* Kualitas data                                                       */
/* ================================================================== */

const QualityBody = ({ data, colors }) => {
  const t = data.thresholds || {};
  const columns = [
    brandCol(colors),
    { key: "members", label: "Member pembeli", align: "right", render: (r) => fInt(r.members) },
    {
      key: "cek",
      label: "Akun perlu dicek",
      align: "right",
      title: `Belanja di ${fInt(t.min_store)} store atau lebih, atau ${fInt(t.min_hari)} hari belanja atau lebih`,
      render: (r) => fInt(r.akun_perlu_dicek),
    },
    {
      key: "cek_omzet",
      label: "Omzet akun tersebut",
      align: "right",
      render: (r) =>
        num(r.akun_perlu_dicek) ? (
          <>
            {fRp(r.omzet_akun_perlu_dicek)} <span className="ma-muted">({fPct(r.omzet_akun_perlu_dicek_pct)})</span>
          </>
        ) : (
          "—"
        ),
    },
    { key: "kota", label: "Tanpa data kota", align: "right", render: (r) => <PctN pct={r.tanpa_kota_pct} n={r.tanpa_kota} /> },
    { key: "telp", label: "Tanpa nomor telepon", align: "right", render: (r) => fInt(r.tanpa_telp) },
    { key: "dob", label: "Tanggal lahir tidak valid", align: "right", render: (r) => fInt(r.dob_tidak_valid) },
    {
      key: "email",
      label: "Email tervalidasi",
      align: "right",
      render: (r) => <PctN pct={r.email_tervalidasi_pct} n={r.email_tervalidasi} />,
    },
    {
      key: "master",
      label: "Tidak ada di master member",
      align: "right",
      render: (r) => fInt(r.tidak_ada_di_master),
    },
    { key: "suspend", label: "Suspend", align: "right", render: (r) => fInt(r.suspend) },
  ];
  return (
    <>
      <SubTitle
        hint={`Akun perlu dicek = belanja di ${fInt(t.min_store)} store atau lebih, atau ${fInt(t.min_hari)} hari belanja atau lebih, sampai ${fDate(data.period?.to)}`}
      >
        Hal yang perlu dipastikan sebelum treatment dijalankan
      </SubTitle>
      <DataTable columns={columns} rows={data.rows || []} focus={data.focus_brand || ""} />
    </>
  );
};

export const QualitySection = ({ query, colors }) => {
  const state = useSection("quality", query);
  return (
    <SectionPanel title="Kualitas data per brand" state={state}>
      {(d) => <QualityBody data={d} colors={colors} />}
    </SectionPanel>
  );
};
