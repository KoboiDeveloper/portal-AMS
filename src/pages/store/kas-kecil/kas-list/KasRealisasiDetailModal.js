import React, { useEffect, useMemo, useState } from "react";
import { Modal, ModalBody, ModalHeader } from "reactstrap";
import { NumericFormat } from "react-number-format";
import {
  DataTableBody,
  DataTableHead,
  DataTableItem,
  DataTableRow,
  Icon,
} from "../../../../components/Component";

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

const normalizeDetail = (list) => {
  if (!Array.isArray(list)) return [];
  return list.map((row, index) => ({
    id: row?.id ?? `dt-${index}`,
    no: row?.no ?? index + 1,
    keterangan: row?.keterangan || row?.remarks || row?.KETERANGAN || "-",
    amount: Number(row?.amount ?? row?.AMOUNT ?? row?.totalAmount) || 0,
  }));
};

const getSortIcon = (key, sortConfig) => {
  if (sortConfig.key !== key) return "unsorted";
  return sortConfig.direction === "asc" ? "arrow-up" : "arrow-down";
};

const compareDetail = (a, b, key, direction) => {
  const dir = direction === "asc" ? 1 : -1;
  if (key === "amount") {
    return (Number(a.amount) - Number(b.amount)) * dir;
  }
  return String(a.keterangan || "").localeCompare(String(b.keterangan || ""), "id", {
    sensitivity: "base",
  }) * dir;
};

const KasRealisasiDetailModal = ({ open, item, onClose }) => {
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });

  useEffect(() => {
    if (open) setSortConfig({ key: "", direction: "asc" });
  }, [open, item?.id]);

  const details = useMemo(() => normalizeDetail(item?.detailTransaksi), [item]);

  const sortedDetails = useMemo(() => {
    if (!sortConfig.key) return details;
    const sorted = [...details].sort((a, b) =>
      compareDetail(a, b, sortConfig.key, sortConfig.direction)
    );
    return sorted.map((row, index) => ({ ...row, no: index + 1 }));
  }, [details, sortConfig]);

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const renderSortHeader = (key, label, alignEnd = false) => {
    const isActive = sortConfig.key === key;
    return (
      <button
        type="button"
        className={`kas-sort-trigger${isActive ? " is-active" : ""}${alignEnd ? " is-end" : ""}`}
        onClick={() => handleSort(key)}
      >
        <span className="sub-text">{label}</span>
        <Icon name={getSortIcon(key, sortConfig)} />
      </button>
    );
  };

  if (!item) return null;

  return (
    <Modal
      isOpen={open}
      toggle={onClose}
      size="lg"
      centered
      className="kas-realisasi-detail-modal"
    >
      <ModalHeader toggle={onClose}>
        Detail Transaksi{item.noPengajuan ? ` — ${item.noPengajuan}` : ""}
      </ModalHeader>
      <ModalBody>
        {sortedDetails.length === 0 ? (
          <p className="text-soft mb-0 text-center py-3">Data tidak Tersedia</p>
        ) : (
          <DataTableBody compact className="border-top kas-realisasi-detail-table" bodyclass="nk-tb-orders">
            <DataTableHead>
              <DataTableRow className="kas-rd-col-no">
                <span className="sub-text">No</span>
              </DataTableRow>
              <DataTableRow className="kas-rd-col-ket">
                {renderSortHeader("keterangan", "Keterangan")}
              </DataTableRow>
              <DataTableRow className="kas-rd-col-amount text-end">
                {renderSortHeader("amount", "Amount", true)}
              </DataTableRow>
            </DataTableHead>
            {sortedDetails.map((row) => (
              <DataTableItem key={row.id}>
                <DataTableRow className="kas-rd-col-no">
                  <span>{row.no}</span>
                </DataTableRow>
                <DataTableRow className="kas-rd-col-ket">
                  <span title={row.keterangan}>{row.keterangan}</span>
                </DataTableRow>
                <DataTableRow className="kas-rd-col-amount text-end">
                  <span>{formatMoney(row.amount)}</span>
                </DataTableRow>
              </DataTableItem>
            ))}
          </DataTableBody>
        )}
      </ModalBody>
    </Modal>
  );
};

export default KasRealisasiDetailModal;
