import React, { useEffect, useMemo, useState } from "react";
import { Modal, ModalBody } from "reactstrap";
import { NumericFormat } from "react-number-format";
import {
  DataTableBody,
  DataTableHead,
  DataTableItem,
  DataTableRow,
  Icon,
} from "../../components/Component";
import { storeRefundService } from "../../services/store-refund.service";
import { extractRows, isSuccess } from "../../lib/response";

const mapDetailRow = (row, index) => ({
  id: row?.ID_TR_SALES_REFUND_DETAIL || `${row?.PLU || "row"}-${index}`,
  store: row?.ID_STORE || "-",
  plu: row?.PLU || "-",
  article: row?.ARTICLE || "-",
  deskripsi: row?.DESKRIPSI || "-",
  price: row?.PRICE,
  qty: row?.QTY,
  net: row?.NET,
});

const RefundDetailModal = ({ isOpen, toggle, refundId, salesNumber }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !refundId) {
      setRows([]);
      setError("");
      return undefined;
    }

    let cancelled = false;

    const loadDetail = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await storeRefundService.detail({ id_tr_sales_refund: refundId });
        if (!isSuccess(res)) {
          throw res;
        }
        if (!cancelled) {
          setRows(extractRows(res));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.responseMessage || "Gagal memuat detail refund");
          setRows([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDetail();

    return () => {
      cancelled = true;
    };
  }, [isOpen, refundId]);

  const tableRows = useMemo(
    () =>
      rows.map((row, index) => ({
        ...mapDetailRow(row, index),
        no: index + 1,
      })),
    [rows]
  );

  const totals = useMemo(
    () =>
      tableRows.reduce(
        (acc, row) => ({
          qty: acc.qty + (Number(row.qty) || 0),
          net: acc.net + (Number(row.net) || 0),
        }),
        { qty: 0, net: 0 }
      ),
    [tableRows]
  );

  return (
    <Modal
      isOpen={isOpen}
      toggle={toggle}
      className="modal-dialog-centered refund-detail-modal"
      size="xl"
    >
      <ModalBody>
        <a
          href="#cancel"
          onClick={(ev) => {
            ev.preventDefault();
            toggle();
          }}
          className="close"
        >
          <Icon name="cross-sm" />
        </a>
        <div className="p-2">
          <h5 className="title">Item Detail</h5>
          {salesNumber ? (
            <p className="text-soft mb-0 mt-2">
              Sales Number: <span className="text-base">{salesNumber}</span>
            </p>
          ) : null}

          <div className="mt-4 refund-detail-table">
            <DataTableBody compact className="border-top" bodyclass="nk-tb-orders">
              <DataTableHead>
                <DataTableRow size="sm" className="refund-detail-col-id">
                  <span>ID</span>
                </DataTableRow>
                <DataTableRow size="sm" className="refund-detail-col-store">
                  <span>STORE</span>
                </DataTableRow>
                <DataTableRow size="md" className="refund-detail-col-plu text-center">
                  <span>PLU</span>
                </DataTableRow>
                <DataTableRow size="sm" className="refund-detail-col-article">
                  <span>ARTICLE</span>
                </DataTableRow>
                <DataTableRow className="refund-detail-col-desc">
                  <span>DESCRIPTION</span>
                </DataTableRow>
                <DataTableRow size="sm" className="refund-detail-col-price text-end">
                  <span>PRICE</span>
                </DataTableRow>
                <DataTableRow size="sm" className="refund-detail-col-qty text-center">
                  <span>QTY</span>
                </DataTableRow>
                <DataTableRow size="md" className="refund-detail-col-net text-end">
                  <span>NET SALES</span>
                </DataTableRow>
              </DataTableHead>

              {!loading && !error && tableRows.length > 0
                ? tableRows.map((item) => (
                    <DataTableItem key={item.id}>
                      <DataTableRow className="nk-tb-orders-type refund-detail-col-id">
                        <span className="sm">{item.no}</span>
                      </DataTableRow>
                      <DataTableRow className="nk-tb-orders-type refund-detail-col-store">
                        <span className="sm">{item.store}</span>
                      </DataTableRow>
                      <DataTableRow className="text-center refund-detail-col-plu">
                        <span>{item.plu}</span>
                      </DataTableRow>
                      <DataTableRow size="sm" className="refund-detail-col-article">
                        <span className="tb-sub">{item.article}</span>
                      </DataTableRow>
                      <DataTableRow size="sm" className="refund-detail-col-desc">
                        <span className="tb-sub">{item.deskripsi}</span>
                      </DataTableRow>
                      <DataTableRow size="sm" className="text-end refund-detail-col-price">
                        <span className="tb-sub">
                          <NumericFormat
                            value={item.price}
                            thousandSeparator=","
                            displayType="text"
                            renderText={(value) => <text>{value}</text>}
                          />
                        </span>
                      </DataTableRow>
                      <DataTableRow size="sm" className="text-center refund-detail-col-qty">
                        <span className="tb-sub">{item.qty}</span>
                      </DataTableRow>
                      <DataTableRow size="sm" className="text-end refund-detail-col-net">
                        <span className="tb-sub">
                          <NumericFormat
                            value={item.net}
                            thousandSeparator=","
                            displayType="text"
                            renderText={(value) => <text>{value}</text>}
                          />
                        </span>
                      </DataTableRow>
                    </DataTableItem>
                  ))
                : null}
            </DataTableBody>

            {!loading && !error && tableRows.length > 0 ? (
              <div className="refund-detail-summary border-top">
                <div className="refund-detail-summary__row">
                  <span className="refund-detail-summary__label">Total Qty</span>
                  <span className="refund-detail-summary__value">
                    <NumericFormat
                      value={totals.qty}
                      thousandSeparator=","
                      displayType="text"
                      renderText={(value) => <text>{value}</text>}
                    />
                  </span>
                </div>
                <div className="refund-detail-summary__row">
                  <span className="refund-detail-summary__label">Total Net</span>
                  <span className="refund-detail-summary__value">
                    <NumericFormat
                      value={totals.net}
                      thousandSeparator=","
                      displayType="text"
                      renderText={(value) => <text>{value}</text>}
                    />
                  </span>
                </div>
              </div>
            ) : null}

            {loading ? (
              <div className="text-center py-4">
                <span className="text-soft">Memuat detail...</span>
              </div>
            ) : error ? (
              <div className="text-center py-4">
                <span className="text-danger">{error}</span>
              </div>
            ) : !loading && tableRows.length === 0 ? (
              <div className="text-center py-4">
                <span className="text-silent">Tidak ada detail transaksi</span>
              </div>
            ) : null}
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
};

export default RefundDetailModal;
