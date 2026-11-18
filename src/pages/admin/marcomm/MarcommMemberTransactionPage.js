import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
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
import ProjectListTable from "../../../components/admin/common/ProjectListTable";
import ErrorState from "../../../components/admin/common/ErrorState";
import { extractRow, extractRows, isSuccess } from "../../../lib/response";
import { exportStyledXlsx } from "../../../lib/exportStyledXlsx";
import {
  getMarcommMemberTransactionBadge,
  getMarcommMemberTransactions,
} from "../../../services/marcomm/marcomm.service";
import "../regional/reg-member-list.css";
import "./marcomm-member-tx.css";

const BRANDS = [
  { value: "0", label: "All Brand" },
  { value: "Aeesha", label: "Aeesha" },
  { value: "Flies", label: "Flies" },
  { value: "Celcius", label: "Celcius" },
  { value: "Celcius Woman", label: "Celcius Woman" },
  { value: "Iwan Fashion", label: "Iwan Fashion" },
  { value: "Mississippi", label: "Mississippi" },
  { value: "Queensland", label: "Queensland" },
];

const CATEGORIES = [
  { value: "All Voucher", label: "All Voucher" },
  { value: "Reguler in POS", label: "Reguler - POS" },
  { value: "Reguler", label: "Reguler" },
  { value: "Special", label: "Special" },
  { value: "NO VOUCHER", label: "No Voucher" },
];

const PAGE_SIZES = [20, 40, 60];

const pad = (n) => String(n).padStart(2, "0");
const toYmd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const firstOfMonth = () => toYmd(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
const todayYmd = () => toYmd(new Date());

const cell = (row, ...keys) => {
  if (!row) return "";
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") return row[key];
    const found = Object.keys(row).find((k) => k.toLowerCase() === key.toLowerCase());
    if (found && row[found] !== undefined && row[found] !== null && row[found] !== "") return row[found];
  }
  return "";
};

const BadgeCard = ({ title, value, pct, art }) => {
  const text = String(pct ?? "").trim();
  const down = text.includes("-");
  return (
    <div className="rml-badge">
      {art ? (
        <span className="rml-badge-art" aria-hidden="true">
          <img src={art} alt="" />
        </span>
      ) : null}
      <div className="rml-badge-title">{title}</div>
      <div className="rml-badge-value">{value || "—"}</div>
      <div className="rml-badge-note">
        {text ? <span className={down ? "is-down" : "is-up"}>{text}</span> : <span>—</span>}{" "}
        <span className="text-soft">from last periode</span>
      </div>
    </div>
  );
};

const MarcommMemberTransactionPage = () => {
  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate, setToDate] = useState(todayYmd);
  const [brand, setBrand] = useState("0");
  const [category, setCategory] = useState("All Voucher");
  const [keywords, setKeywords] = useState("");
  const [applied, setApplied] = useState(null);
  const [rows, setRows] = useState([]);
  const [badge, setBadge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const load = useCallback(async (query) => {
    if (!query.from_date || !query.to_date) {
      toast.error("Pilih rentang tanggal terlebih dahulu");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [listRes, badgeRes] = await Promise.all([
        getMarcommMemberTransactions(query),
        getMarcommMemberTransactionBadge({ from_date: query.from_date, to_date: query.to_date }),
      ]);
      if (!isSuccess(listRes)) {
        setRows([]);
        setError(listRes?.responseMessage || "Gagal memuat transaksi");
        return;
      }
      setRows(extractRows(listRes));
      setBadge(isSuccess(badgeRes) ? extractRow(badgeRes) || {} : {});
      setPage(1);
    } catch (err) {
      setRows([]);
      setError(err?.responseMessage || err?.message || "Gagal memuat transaksi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const query = {
      from_date: firstOfMonth(),
      to_date: todayYmd(),
      brand: "0",
      category_voucher: "All Voucher",
      keywords: "",
    };
    setApplied(query);
    load(query);
  }, [load]);

  const onSearch = () => {
    const query = {
      from_date: fromDate,
      to_date: toDate,
      brand: brand || "0",
      category_voucher: category || "All Voucher",
      keywords: keywords.trim(),
    };
    setApplied(query);
    load(query);
  };

  const onExport = async () => {
    const query = applied || {
      from_date: fromDate,
      to_date: toDate,
      brand: brand || "0",
      category_voucher: category || "All Voucher",
      keywords: keywords.trim(),
    };
    setExporting(true);
    try {
      const res = await getMarcommMemberTransactions(query);
      if (!isSuccess(res)) {
        toast.error(res?.responseMessage || "Gagal export");
        return;
      }
      const data = extractRows(res);
      const ok = await exportStyledXlsx({
        fileName: "Member_transaction.xlsx",
        sheetName: "Transaction",
        columns: [
          { key: "id_member", label: "MEMBER ID", width: 18 },
          { key: "name", label: "NAME", width: 28 },
          { key: "transaction_date", label: "TRANSACTION DATE", width: 22 },
          { key: "store", label: "STORE", width: 14 },
          { key: "grand_total", label: "GRAND TOTAL", width: 16, align: "right" },
          { key: "points_redeemed", label: "POINT REDEEM", width: 16, align: "right" },
          { key: "category_voucher", label: "CATEGORY", width: 20 },
          { key: "points_earned", label: "POINT EARNED", width: 16, align: "right" },
          { key: "brand", label: "BRAND", width: 16 },
        ],
        rows: data.map((row) => ({
          id_member: cell(row, "ID_MEMBER"),
          name: cell(row, "NAME"),
          transaction_date: cell(row, "TRANSACTION_DATE"),
          store: cell(row, "STORE"),
          grand_total: cell(row, "GRAND_TOTAL"),
          points_redeemed: cell(row, "POINTS_REDEEMED"),
          category_voucher: cell(row, "CATEGORY_VOUCHER"),
          points_earned: cell(row, "POINTS_EARNED"),
          brand: cell(row, "BRAND"),
        })),
      });
      if (ok) toast.success("File Member_transaction.xlsx terunduh");
    } catch (err) {
      toast.error(err?.message || "Gagal export");
    } finally {
      setExporting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "ID_MEMBER",
        label: "MEMBER ID",
        sortable: true,
        render: (row) => {
          const id = cell(row, "ID_MEMBER");
          if (!id) return "—";
          return (
            <Link className="mtx-member-link" to={`/admin/marcomm/member/info?mem=${encodeURIComponent(id)}`}>
              {id}
            </Link>
          );
        },
      },
      { key: "NAME", label: "NAME", sortable: true },
      { key: "TRANSACTION_DATE", label: "TRANSACTION DATE", sortable: true },
      { key: "STORE", label: "STORE", sortable: true },
      { key: "GRAND_TOTAL", label: "GRAND TOTAL", sortable: true, render: (row) => cell(row, "GRAND_TOTAL") || "0" },
      { key: "POINTS_REDEEMED", label: "POINT REDEEM", sortable: true, render: (row) => cell(row, "POINTS_REDEEMED") || "0" },
      { key: "CATEGORY_VOUCHER", label: "CATEGORY", sortable: true },
      { key: "POINTS_EARNED", label: "POINT EARNED", sortable: true, render: (row) => cell(row, "POINTS_EARNED") || "0" },
    ],
    []
  );

  return (
    <AccessGuard moduleCode="MAR_MBR_TX" permission="VIEW">
      <Head title="Member Transaction" />
      <Content>
        <div className="mtx-page">
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle page tag="h3">
                  Member Transaction
                </BlockTitle>
                <BlockDes className="text-soft">Transaksi member aplikasi</BlockDes>
              </BlockHeadContent>
            </BlockBetween>
          </BlockHead>

          <div className="rml-badges">
            <BadgeCard
              title="Total Transaction"
              art="/images/member-tx/total.jpg"
              value={cell(badge, "transaction_total")}
              pct={cell(badge, "growth_transaction_percentage")}
            />
            <BadgeCard
              title="Amount of Transaction"
              art="/images/member-tx/amount.jpg"
              value={cell(badge, "amount_transaction_total")}
              pct={cell(badge, "growth_amount_transaction")}
            />
            <BadgeCard
              title="Point Redeem"
              art="/images/member-tx/redeem.jpg"
              value={cell(badge, "point_redeem")}
              pct={cell(badge, "growth_point_redeem")}
            />
            <BadgeCard
              title="Point Earned"
              art="/images/member-tx/earned.jpg"
              value={cell(badge, "point_earned")}
              pct={cell(badge, "growth_point_earned")}
            />
          </div>

          <div className="mtx-filters">
            <select className="form-control form-control-sm mtx-brand" value={brand} onChange={(e) => setBrand(e.target.value)}>
              {BRANDS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              className="form-control form-control-sm mtx-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <AppDateRangePicker
              startDate={fromDate}
              endDate={toDate}
              placeholder="Date Range"
              className="form-control form-control-sm"
              onChange={(fromYmd, toYmd) => {
                setFromDate(fromYmd || "");
                setToDate(toYmd || "");
              }}
            />
            <input
              className="form-control form-control-sm mtx-kw"
              placeholder="id member / no.hp"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSearch();
              }}
            />
            <Button color="info" size="sm" onClick={onSearch} disabled={loading}>
              <Icon name="search" />
              <span>{loading ? "Loading…" : "Search"}</span>
            </Button>
            <Button color="success" size="sm" onClick={onExport} disabled={exporting || loading}>
              <Icon name="download" />
              <span>{exporting ? "Export…" : "Export"}</span>
            </Button>
            <span className="mtx-count">{loading ? "" : `${rows.length.toLocaleString("id-ID")} transaksi`}</span>
          </div>

          {error && !loading ? (
            <ErrorState message={error} onRetry={onSearch} />
          ) : (
            <>
              <div className="mtx-tools">
                <select
                  className="form-control form-control-sm"
                  style={{ width: 130 }}
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  {PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n} / halaman
                    </option>
                  ))}
                </select>
              </div>
              <Block>
                <ProjectListTable
                  columns={columns}
                  rows={rows}
                  idField="ID_MEMBER"
                  rowKey={(row, idx) =>
                    `${cell(row, "ID_MEMBER")}-${cell(row, "TRANSACTION_DATE")}-${cell(row, "STORE")}-${idx}`
                  }
                  currentPage={page}
                  itemPerPage={pageSize}
                  onPageChange={setPage}
                  loading={loading}
                />
              </Block>
            </>
          )}
        </div>
      </Content>
    </AccessGuard>
  );
};

export default MarcommMemberTransactionPage;
