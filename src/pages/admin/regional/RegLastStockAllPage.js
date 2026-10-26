import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { PageSmoothScroll } from "../../../components/PageSmoothScroll";
import { createRegionalService } from "../../../services/regional/regional.service";
import { extractRows, isSuccess } from "../../../lib/response";
import { RivStickyThead } from "./RivStickyThead";
import "./reg-reg-report.css";
import "./reg-sales-detail.css";
import "./reg-inv-report.css";

/** Legacy module/Rpt/stockALlS.aspx — Last Stock All Store (no filters) */
const svc = createRegionalService("rpt/inv/last-stock-all", { crud: false });

const nf0 = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const fmtNum = (v) => nf0.format(Number(v || 0));

const RENDER_STEP = 100;

const cellOf = (r, key) => {
  if (r == null) return null;
  if (r[key] != null) return r[key];
  const up = String(key).toUpperCase();
  const hit = Object.keys(r).find((k) => String(k).toUpperCase() === up);
  return hit != null ? r[hit] : null;
};

const RegLastStockAllPage = () => {
  const [sm, setSm] = useState(false);
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState(RENDER_STEP);
  const tableRef = useRef(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    setLimit(RENDER_STEP);
    try {
      const res = await svc.list({});
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal memuat");
        setRows([]);
        setLoaded(true);
        return;
      }
      setRows(extractRows(res));
      setLoaded(true);
    } catch (e) {
      setError(e?.message || "Gagal memuat");
      setRows([]);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const shown = useMemo(() => rows.slice(0, limit), [rows, limit]);
  const stockSum = useMemo(
    () => rows.reduce((s, r) => s + Number(cellOf(r, "A") || 0), 0),
    [rows]
  );

  const scrollRevision = `${loading ? "loading" : "ready"}-${rows.length}-${error || "ok"}`;

  return (
    <AccessGuard moduleCode="REG_RPT_LAST_STOCK_ALL">
      <Head title="Last Stock All Store" />
      <Content>
        <PageSmoothScroll revision={scrollRevision} className="riv-page-scroll">
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle page tag="h3">
                  Last Stock All Store
                </BlockTitle>
                <BlockDes className="text-soft">
                  {loaded
                    ? `You have total ${rows.length} stores`
                    : "Stock ending per store (last batch)"}
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
                      <li>
                        <Button
                          color="light"
                          size="sm"
                          className="btn-icon"
                          onClick={loadData}
                          disabled={loading}
                          title="Refresh"
                          aria-label="Refresh"
                        >
                          <Icon name="reload" />
                        </Button>
                      </li>
                    </ul>
                  </div>
                </div>
              </BlockHeadContent>
            </BlockBetween>
          </BlockHead>

          <Block>
            {error ? <div className="rrd-msg err mb-2">{error}</div> : null}
            {loading ? <div className="text-soft small mb-2">Memuat data...</div> : null}

            {loaded ? (
              <div className="riv-bleed">
                <div className="riv-table-wrap riv-table-wrap--stockall">
                  <table ref={tableRef} className="riv-table riv-table--stockall">
                    <thead>
                      <tr>
                        <th className="rds-no">NO</th>
                        <th>STORE</th>
                        <th className="ctr">BATCH</th>
                        <th className="num">STOCK</th>
                        <th className="num">HPP</th>
                        <th className="num">PRICE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!shown.length ? (
                        <tr>
                          <td colSpan={6} className="rds-empty">
                            There Is No Data
                          </td>
                        </tr>
                      ) : (
                        shown.map((r, i) => (
                          <tr key={`${cellOf(r, "STORE_ID")}-${i}`}>
                            <td className="rds-no">{i + 1}</td>
                            <td>{cellOf(r, "STORE_ID")}</td>
                            <td className="ctr">{cellOf(r, "TGLBATCH")}</td>
                            <td className="num">{fmtNum(cellOf(r, "A"))}</td>
                            <td className="num">{fmtNum(cellOf(r, "HPP"))}</td>
                            <td className="num">{fmtNum(cellOf(r, "PRICE"))}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {rows.length ? (
                      <tfoot>
                        <tr>
                          <td colSpan={3} className="num">
                            Total
                          </td>
                          <td className="num">{fmtNum(stockSum)}</td>
                          <td className="num" />
                          <td className="num" />
                        </tr>
                      </tfoot>
                    ) : null}
                  </table>
                </div>
                <RivStickyThead
                  tableRef={tableRef}
                  enabled={Boolean(loaded && rows.length)}
                  tableClassName="riv-table riv-table--stockall"
                />
                {limit < rows.length ? (
                  <div className="text-center mt-2">
                    <Button
                      color="light"
                      size="sm"
                      onClick={() => setLimit((n) => n + RENDER_STEP)}
                    >
                      Load more ({Math.min(limit, rows.length)} / {rows.length})
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </Block>
        </PageSmoothScroll>
      </Content>
    </AccessGuard>
  );
};

export default RegLastStockAllPage;
