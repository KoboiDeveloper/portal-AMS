import React, { useCallback, useEffect, useMemo, useState } from "react";
import ExcelJS from "exceljs";
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
  RSelect,
} from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import AppDateRangePicker from "../../../components/AppDateRangePicker";
import {
  createRegionalService,
  regionalLookupOptions,
} from "../../../services/regional/regional.service";
import { extractRows, isSuccess } from "../../../lib/response";
import { saveXlsxFile } from "../../../lib/exportStyledXlsx";
import "./reg-sales-article.css";

const articleService = createRegionalService("rpt/sales/sales-article", { crud: false });

/** Match Total Sales / AdminProjectListPage filter controls */
const filterSelectStyles = {
  control: (base) => ({
    ...base,
    minHeight: 32,
    height: 32,
    fontSize: "0.8125rem",
  }),
  valueContainer: (base) => ({ ...base, padding: "0 8px", height: 30 }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorsContainer: (base) => ({ ...base, height: 30 }),
  dropdownIndicator: (base) => ({ ...base, padding: "0 6px" }),
  clearIndicator: (base) => ({ ...base, padding: "0 4px" }),
  menu: (base) => ({
    ...base,
    zIndex: 30,
    fontSize: "0.8125rem",
    width: "max-content",
    minWidth: "100%",
  }),
  option: (base) => ({
    ...base,
    fontSize: "0.8125rem",
    padding: "6px 12px",
    whiteSpace: "nowrap",
  }),
};

const todayYmd = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const cell = (row, ...keys) => {
  for (const k of keys) {
    if (row?.[k] != null && row[k] !== "") return row[k];
  }
  return "";
};

const RegSalesArticlePage = () => {
  const [sm, setSm] = useState(false);
  const [fromDate, setFromDate] = useState(todayYmd());
  const [toDate, setToDate] = useState(todayYmd());
  const [brandId, setBrandId] = useState("");
  const [storeId, setStoreId] = useState("");
  const [article, setArticle] = useState("");
  const [brandOpts, setBrandOpts] = useState([{ value: "ALL", label: "ALL" }]);
  const [storeOpts, setStoreOpts] = useState([{ value: "ALL", label: "ALL" }]);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const opts = await regionalLookupOptions("brand");
      if (cancelled) return;
      const list = (opts || []).length ? opts : [{ value: "ALL", label: "ALL" }];
      setBrandOpts(list);
      if (brandId && !list.some((o) => String(o.value) === String(brandId))) setBrandId("");
    })();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    setStoreId("");
    (async () => {
      const parentId = !brandId || brandId === "ALL" || brandId === "all" ? "" : brandId;
      const opts = await regionalLookupOptions("store", { parentId });
      if (cancelled) return;
      const next = (opts || []).length ? opts : [{ value: "ALL", label: "ALL" }];
      setStoreOpts(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [brandId]); // eslint-disable-line react-hooks/exhaustive-deps

  const brandValue = useMemo(
    () => brandOpts.find((o) => String(o.value) === String(brandId)) || null,
    [brandOpts, brandId]
  );
  const storeValue = useMemo(
    () => storeOpts.find((o) => String(o.value) === String(storeId)) || null,
    [storeOpts, storeId]
  );

  const canExport = Boolean(fromDate && toDate && brandId && storeId);

  const onExport = useCallback(async () => {
    if (!canExport || exporting) return;
    setExporting(true);
    setError("");
    try {
      const res = await articleService.list({
        from_date: fromDate,
        to_date: toDate,
        id_brand: brandId || "ALL",
        id_store: storeId || "ALL",
        article: String(article || "").trim(),
      });
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal memuat data export");
        return;
      }
      const rows = extractRows(res);
      if (!rows.length) {
        setError("Tidak ada data untuk filter ini");
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet("Sales");
      ws.columns = [
        { header: "SOURCE", key: "SOURCE", width: 18 },
        { header: "ARTICLE", key: "ARTICLE", width: 28 },
        { header: "qty", key: "qty", width: 12 },
      ];
      const headerRow = ws.getRow(1);
      headerRow.font = { bold: true };
      headerRow.eachCell((c) => {
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCEEFF" } };
      });
      ws.autoFilter = { from: "A1", to: "C1" };

      rows.forEach((r) => {
        ws.addRow({
          SOURCE: String(cell(r, "SOURCE", "source", "Source") || ""),
          ARTICLE: String(cell(r, "ARTICLE", "article", "Article") || ""),
          qty: Number(cell(r, "qty", "QTY", "Qty") || 0),
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      saveXlsxFile(buffer, "SalesByArticle.xlsx");
    } catch (e) {
      const msg =
        (typeof e === "string" && e) ||
        e?.responseMessage ||
        e?.message ||
        (e?.responseCode ? `Error ${e.responseCode}` : "") ||
        "Gagal export";
      setError(String(msg).trim().slice(0, 300));
    } finally {
      setExporting(false);
    }
  }, [article, brandId, canExport, exporting, fromDate, storeId, toDate]);

  return (
    <AccessGuard moduleCode="REG_RPT_SALES_ARTICLE">
      <Head title="Sales By Article" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page tag="h3">
                Sales By Article
              </BlockTitle>
              <BlockDes className="text-soft">
                Export qty penjualan per article
              </BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <div className="toggle-wrap nk-block-tools-toggle">
                <Button
                  className={`btn-icon btn-trigger toggle-expand me-n1 ${sm ? "active" : ""}`}
                  onClick={() => setSm(!sm)}
                >
                  <Icon name="menu-alt-r" />
                </Button>
                <div className="toggle-expand-content" style={{ display: sm ? "block" : undefined }}>
                  <ul className="nk-block-tools g-3 align-items-center rsa-toolbar">
                    <li className="hrd-filter-daterange">
                      <div className="form-control-wrap">
                        <div className="form-icon form-icon-left">
                          <Icon name="calendar" />
                        </div>
                        <AppDateRangePicker
                          startDate={fromDate}
                          endDate={toDate}
                          placeholder="Date Range"
                          className="form-control form-control-sm date-picker ps-4"
                          onChange={(fromYmd, toYmd) => {
                            setFromDate(fromYmd || "");
                            setToDate(toYmd || "");
                          }}
                        />
                      </div>
                    </li>
                    <li className="hrd-filter-select">
                      <RSelect
                        className="hrd-filter-rselect"
                        styles={filterSelectStyles}
                        isClearable
                        isSearchable
                        placeholder="Brand"
                        options={brandOpts}
                        value={brandValue}
                        onChange={(opt) => setBrandId(opt?.value ?? "")}
                      />
                    </li>
                    <li className="hrd-filter-select">
                      <RSelect
                        className="hrd-filter-rselect"
                        styles={filterSelectStyles}
                        isClearable
                        isSearchable
                        placeholder="Store"
                        options={storeOpts}
                        value={storeValue}
                        onChange={(opt) => setStoreId(opt?.value ?? "")}
                      />
                    </li>
                    <li className="rsa-toolbar-article">
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        placeholder="Article"
                        value={article}
                        maxLength={20}
                        onChange={(e) => setArticle(e.target.value)}
                      />
                    </li>
                    <li>
                      <Button
                        color="light"
                        size="sm"
                        onClick={onExport}
                        disabled={!canExport || exporting}
                        title={canExport ? "Export" : "Pilih filter dulu"}
                      >
                        <Icon name="download" />
                        <span>{exporting ? "Exporting…" : "Export Excel"}</span>
                      </Button>
                    </li>
                  </ul>
                </div>
              </div>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Block>
          {error ? <div className="alert alert-danger py-2">{error}</div> : null}
        </Block>
      </Content>
    </AccessGuard>
  );
};

export default RegSalesArticlePage;
