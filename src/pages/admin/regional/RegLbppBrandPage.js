import React, { useCallback, useEffect, useState } from "react";
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
import "./reg-reg-report.css";

/** Legacy module/Rpt/lbppReg_Bbrand.aspx — export-only (Brand + date range) */
const svc = createRegionalService("rpt/inv/lbpp-brand", { crud: false });

const filterSelectStyles = {
  control: (base) => ({ ...base, minHeight: 32, height: 32, fontSize: "0.8125rem" }),
  valueContainer: (base) => ({ ...base, padding: "0 8px", height: 30 }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorsContainer: (base) => ({ ...base, height: 30 }),
  menu: (base) => ({ ...base, zIndex: 30, fontSize: "0.8125rem" }),
};

const pad2 = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const todayYmd = () => ymd(new Date());
const monthStartYmd = () => {
  const d = new Date();
  return ymd(new Date(d.getFullYear(), d.getMonth(), 1));
};

const COLS = [
  { key: "PLU", label: "PLU" },
  { key: "PRICE", label: "PRICE", num: true },
  { key: "A", label: "QTY", num: true },
  { key: "PRICE_A", label: "PRICE_A", num: true },
  { key: "ST_IN", label: "ST_IN", num: true },
  { key: "PRICE_ST_IN", label: "PRICE_ST_IN", num: true },
  { key: "TRADE_IN", label: "TRADE_IN", num: true },
  { key: "PRICE_TRADE_IN", label: "PRICE_TRADE_IN", num: true },
  { key: "ST_OUT", label: "ST_OUT", num: true },
  { key: "PRICE_ST_OUT", label: "PRICE_ST_OUT", num: true },
  { key: "TRADE_OUT", label: "TRADE_OUT", num: true },
  { key: "PRICE_TRADE_OUT", label: "PRICE_TRADE_OUT", num: true },
  { key: "SALES", label: "SALES", num: true },
  { key: "PRICE_SALES", label: "PRICE_SALES", num: true },
  { key: "ADJ", label: "ADJ", num: true },
  { key: "PRICE_ADJ", label: "PRICE_ADJ", num: true },
  { key: "Z", label: "Z", num: true },
  { key: "PRICE_Z", label: "PRICE_Z", num: true },
];

const cellOf = (r, key) => {
  if (r[key] != null) return r[key];
  const up = String(key).toUpperCase();
  const hit = Object.keys(r || {}).find((k) => String(k).toUpperCase() === up);
  return hit != null ? r[hit] : "";
};

const RegLbppBrandPage = () => {
  const [sm, setSm] = useState(false);
  const [brandId, setBrandId] = useState("");
  const [fromDate, setFromDate] = useState(monthStartYmd());
  const [toDate, setToDate] = useState(todayYmd());
  const [brandOpts, setBrandOpts] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    regionalLookupOptions("brand").then((opts) => {
      const list = Array.isArray(opts) ? opts : [];
      setBrandOpts(list.filter((o) => String(o.value).toUpperCase() !== "ALL"));
    });
  }, []);

  const canExport = Boolean(brandId && fromDate && toDate);

  const onExport = useCallback(async () => {
    if (!brandId || !fromDate || !toDate) {
      setError("Brand dan periode wajib diisi");
      return;
    }
    setExporting(true);
    setError("");
    try {
      const res = await svc.list({
        id_brand: brandId,
        brand: brandId,
        from_date: fromDate,
        to_date: toDate,
      });
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal export");
        return;
      }
      const rows = extractRows(res);
      if (!rows.length) {
        setError("There Is No Data");
        return;
      }
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("LBPP By Brand");
      ws.addRow(["NO", ...COLS.map((c) => c.label)]);
      rows.forEach((r, i) => {
        ws.addRow([
          i + 1,
          ...COLS.map((c) => (c.num ? Number(cellOf(r, c.key) || 0) : cellOf(r, c.key))),
        ]);
      });
      ws.getRow(1).font = { bold: true };
      const buffer = await wb.xlsx.writeBuffer();
      const safeBrand = String(brandId || "brand").replace(/[^\w.-]+/g, "_");
      saveXlsxFile(buffer, `LBPP_By_Brand_${safeBrand}_${fromDate}_${toDate}.xlsx`);
    } catch (e) {
      setError(e?.message || "Gagal export");
    } finally {
      setExporting(false);
    }
  }, [brandId, fromDate, toDate]);

  return (
    <AccessGuard moduleCode="REG_RPT_LBPP_BRAND">
      <Head title="Lbpp By Brand" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page tag="h3">
                Lbpp By Brand
              </BlockTitle>
              <BlockDes className="text-soft">
                Pilih brand & periode, lalu Export To Excel (parity lbppReg_Bbrand.aspx)
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
                  <ul className="nk-block-tools g-3 align-items-center">
                    <li className="hrd-filter-select">
                      <RSelect
                        className="hrd-filter-rselect"
                        styles={filterSelectStyles}
                        isClearable
                        isSearchable
                        placeholder="Brand"
                        options={brandOpts}
                        value={brandOpts.find((o) => String(o.value) === String(brandId)) || null}
                        onChange={(opt) => setBrandId(opt?.value != null ? String(opt.value) : "")}
                      />
                    </li>
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
                    <li>
                      <Button
                        color="light"
                        size="sm"
                        className="btn-dim"
                        onClick={onExport}
                        disabled={exporting || !canExport}
                        title={canExport ? "Export" : "Pilih filter dulu"}
                      >
                        <Icon name="download-cloud" />
                        <span>{exporting ? "Exporting..." : "Export To Excel"}</span>
                      </Button>
                    </li>
                  </ul>
                </div>
              </div>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Block>{error ? <div className="rrd-msg err mb-2">{error}</div> : null}</Block>
      </Content>
    </AccessGuard>
  );
};

export default RegLbppBrandPage;
