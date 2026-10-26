import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card, Spinner } from "reactstrap";
import { NumericFormat } from "react-number-format";
import {
  DataTableBody,
  DataTableHead,
  DataTableRow,
  Icon,
} from "../../../../components/Component";
import { SalesEmptyState } from "../../../../components/SalesEmptyState";
import { isSuccess } from "../../../../lib/response";
import { storeKasService } from "../../../../services/store-kas.service";
import KasRealisasiDetailModal from "./KasRealisasiDetailModal";

const isApiOk = (res) => {
  const code = String(res?.responseCode ?? "");
  return isSuccess(res) || code === "00" || code === "2000000" || code === "2002500";
};

const formatMoney = (value) => (
  <NumericFormat
    value={Number(value) || 0}
    thousandSeparator="."
    decimalSeparator=","
    decimalScale={0}
    displayType="text"
    renderText={(text) => text}
  />
);

const REALISASI_TABS = [
  { id: "finance", label: "Dibayarkan" },
  { id: "manual", label: "Ditolak" },
];

const FINANCE_COLUMNS = [
  { key: "no", label: "No", size: "sm", className: "kas-col-no", sortable: false },
  { key: "noPengajuan", label: "No Pengajuan", size: "md", className: "kas-col-date", sortable: true },
  { key: "totalAmount", label: "Telah Dibayar", size: "md", className: "kas-col-money text-end", sortable: true },
  { key: "periode", label: "Periode", size: "lg", className: "kas-col-remarks", sortable: true },
];

const MANUAL_COLUMNS = [
  { key: "no", label: "No", size: "sm", className: "kas-col-no", sortable: false },
  { key: "remarks", label: "Keterangan", size: "lg", className: "kas-col-remarks", sortable: true },
  { key: "amount", label: "Nilai", size: "md", className: "kas-col-money text-end", sortable: true },
  { key: "reason", label: "Catatan", size: "md", className: "kas-col-date", sortable: true },
  { key: "periode", label: "Periode", size: "md", className: "kas-col-remarks", sortable: true },
];

const MONEY_KEYS = new Set(["totalAmount", "amount"]);

const getSortIcon = (key, sortConfig) => {
  if (sortConfig.key !== key) return "unsorted";
  return sortConfig.direction === "asc" ? "arrow-up" : "arrow-down";
};

const compareRows = (a, b, key, direction) => {
  const mul = direction === "desc" ? -1 : 1;
  if (MONEY_KEYS.has(key)) {
    return ((Number(a[key]) || 0) - (Number(b[key]) || 0)) * mul;
  }
  return String(a[key] || "").localeCompare(String(b[key] || ""), "id", { sensitivity: "base" }) * mul;
};

const sortRows = (rows, sortConfig) => {
  if (!sortConfig?.key) return rows;
  const sorted = [...rows].sort((a, b) => compareRows(a, b, sortConfig.key, sortConfig.direction));
  return sorted.map((row, index) => ({ ...row, no: index + 1 }));
};

const RealisasiTable = ({ columns, rows, renderCell, onRowClick, clickable, sortConfig, onSort }) => (
  <div className="page-table-scroll">
    <Card className="card-bordered card-full">
      <DataTableBody compact className="border-top" bodyclass="nk-tb-orders">
        <DataTableHead>
          {columns.map((column) => {
            const isEnd = column.className?.includes("text-end");
            const isActive = sortConfig?.key === column.key;
            return (
              <DataTableRow key={column.key} size={column.size} className={column.className}>
                {column.sortable ? (
                  <button
                    type="button"
                    className={`kas-sort-trigger${isActive ? " is-active" : ""}${isEnd ? " is-end" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSort?.(column.key);
                    }}
                  >
                    <span className="sub-text">{column.label}</span>
                    <Icon name={getSortIcon(column.key, sortConfig || {})} />
                  </button>
                ) : (
                  <span className="sub-text">{column.label}</span>
                )}
              </DataTableRow>
            );
          })}
        </DataTableHead>
        {rows.map((item) => (
          <div
            key={item.id}
            className={`nk-tb-item${clickable ? " kas-realisasi-row is-clickable" : ""}`}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            onClick={clickable && onRowClick ? () => onRowClick(item) : undefined}
            onKeyDown={
              clickable && onRowClick
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onRowClick(item);
                    }
                  }
                : undefined
            }
          >
            {columns.map((column) => (
              <DataTableRow key={column.key} size={column.size} className={column.className}>
                {renderCell(item, column.key)}
              </DataTableRow>
            ))}
          </div>
        ))}
      </DataTableBody>
    </Card>
  </div>
);

const KasRealisasiPanel = ({ storeId, active }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [subTab, setSubTab] = useState("finance");
  const [financeRows, setFinanceRows] = useState([]);
  const [manualRows, setManualRows] = useState([]);
  const [jumlahDibayarkan, setJumlahDibayarkan] = useState(0);
  const [detailModal, setDetailModal] = useState({ open: false, item: null });
  const [financeSort, setFinanceSort] = useState({ key: "", direction: "asc" });
  const [manualSort, setManualSort] = useState({ key: "", direction: "asc" });

  const loadData = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    setError("");
    try {
      const res = await storeKasService.realisasiFinance({ store_id: storeId });
      if (!isApiOk(res)) {
        throw res;
      }
      const payload = res?.data && !Array.isArray(res.data) ? res.data : {};
      const finance = Array.isArray(payload.realisasiFinance) ? payload.realisasiFinance : [];
      const manual = Array.isArray(payload.realisasiManual) ? payload.realisasiManual : [];

      setFinanceRows(
        finance.map((row, index) => ({
          id: row?.id ?? `fin-${index}`,
          no: index + 1,
          noPengajuan: row?.noPengajuan || "-",
          totalAmount: Number(row?.totalAmount) || 0,
          periode: row?.periode || "-",
          codeBayar: row?.codeBayar || "",
          tanggalBayar: row?.tanggalBayar || "",
          detailTransaksi: Array.isArray(row?.detailTransaksi) ? row.detailTransaksi : [],
        }))
      );
      setManualRows(
        manual.map((row, index) => ({
          id: row?.id ?? `man-${index}`,
          no: index + 1,
          remarks: row?.remarks || "-",
          amount: Number(row?.amount) || 0,
          reason: row?.reason || "-",
          periode: row?.periode || "-",
          styleDisplay: row?.styleDisplay || "",
          codeBayar: row?.codeBayar || "",
          idKas: row?.idKas,
        }))
      );
      setJumlahDibayarkan(Number(payload.jumlahDibayarkan) || finance.length);
      setLoaded(true);
    } catch (err) {
      setError(err?.responseMessage || "Gagal memuat data realisasi");
      setFinanceRows([]);
      setManualRows([]);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    if (!active || !storeId) return;
    loadData();
  }, [active, storeId, loadData]);

  const sortedFinanceRows = useMemo(
    () => sortRows(financeRows, financeSort),
    [financeRows, financeSort]
  );
  const sortedManualRows = useMemo(
    () => sortRows(manualRows, manualSort),
    [manualRows, manualSort]
  );

  const handleFinanceSort = (key) => {
    setFinanceSort((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const handleManualSort = (key) => {
    setManualSort((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner size="sm" /> <span className="text-soft ms-2">Memuat data…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4">
        <span className="text-danger">{error}</span>
      </div>
    );
  }

  if (!loaded) {
    return <SalesEmptyState title="Data tidak Tersedia" description={null} />;
  }

  const isFinance = subTab === "finance";
  const activeRows = isFinance ? sortedFinanceRows : sortedManualRows;

  return (
    <div className="kas-realisasi">
      <div className="kas-realisasi-head">
        <ul className="kas-realisasi-tabs">
          {REALISASI_TABS.map((tab) => (
            <li key={tab.id} className={subTab === tab.id ? "active" : ""}>
              <button type="button" onClick={() => setSubTab(tab.id)}>
                {tab.label}
                <span className="kas-tabs__count">
                  {tab.id === "finance" ? financeRows.length : manualRows.length}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {isFinance ? (
          <span className="kas-realisasi-meta">{jumlahDibayarkan || financeRows.length} dibayarkan</span>
        ) : null}
      </div>

      {activeRows.length === 0 ? (
        <SalesEmptyState title="Data tidak Tersedia" description={null} />
      ) : isFinance ? (
        <RealisasiTable
          columns={FINANCE_COLUMNS}
          rows={sortedFinanceRows}
          clickable
          sortConfig={financeSort}
          onSort={handleFinanceSort}
          onRowClick={(item) => setDetailModal({ open: true, item })}
          renderCell={(item, key) => {
            if (key === "totalAmount") return <span>{formatMoney(item.totalAmount)}</span>;
            return <span>{item[key]}</span>;
          }}
        />
      ) : (
        <RealisasiTable
          columns={MANUAL_COLUMNS}
          rows={sortedManualRows}
          sortConfig={manualSort}
          onSort={handleManualSort}
          renderCell={(item, key) => {
            if (key === "amount") return <span>{formatMoney(item.amount)}</span>;
            if (key === "remarks" || key === "reason") {
              return (
                <span className="kas-remarks" title={item[key]}>
                  {item[key]}
                </span>
              );
            }
            return <span>{item[key]}</span>;
          }}
        />
      )}

      <KasRealisasiDetailModal
        open={detailModal.open}
        item={detailModal.item}
        onClose={() => setDetailModal({ open: false, item: null })}
      />
    </div>
  );
};

export default KasRealisasiPanel;
