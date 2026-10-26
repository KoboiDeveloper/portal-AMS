import React, { useEffect, useMemo, useState } from "react";
import { Modal, ModalBody } from "reactstrap";
import {
  Icon,
  DataTableBody,
  DataTableHead,
  DataTableRow,
  DataTableItem,
} from "../../../src/components/Component";
import { useForm } from "react-hook-form";
import axios from "axios";
import { NumericFormat } from "react-number-format";

const formatNumber = (value) => (
  <NumericFormat
    value={Number(value) || 0}
    thousandSeparator=","
    decimalScale={0}
    displayType="text"
    renderText={(text) => text}
  />
);

const getItemDescription = (item) =>
  String(item?.deskripsi ?? item?.DESKRIPSI ?? "").trim();

const getItemPlu = (item) => String(item?.PLU ?? item?.plu ?? "").trim();

const isDiscountDescription = (description) => {
  const normalized = description.toUpperCase();
  return normalized.startsWith("DISC-") || normalized.startsWith("DISC ");
};

const isLinkedDiscountRow = (items, index) => {
  if (index <= 0 || !items[index] || !items[index - 1]) return false;

  const description = getItemDescription(items[index]);
  const plu = getItemPlu(items[index]);
  const prevPlu = getItemPlu(items[index - 1]);

  return (
    isDiscountDescription(description) &&
    prevPlu !== "" &&
    (plu === prevPlu || plu === "")
  );
};

const getItemRowClassName = (isDiscountChild, hasDiscountChild) =>
  [isDiscountChild && "sales-detail-item-discount-child", hasDiscountChild && "sales-detail-item-parent"]
    .filter(Boolean)
    .join(" ") || undefined;

const buildDisplayItemIds = (items) => {
  let counter = 0;

  return items.map((item, index) => {
    if (isLinkedDiscountRow(items, index)) {
      return null;
    }

    counter += 1;
    return counter;
  });
};

const SalesDetailModal = ({
  idSalesheader,
  modal,
  closeModal,
  onSubmit,
  formData,
  setFormData,
  filterStatus,
}) => {
  const { reset } = useForm();
  const [DataSalesItem, setDataSalesItem] = useState([]);
  const [DataSalesPayment, setDataSalesPayment] = useState([]);

  useEffect(() => {
    reset(formData);
  }, [formData, reset]);

  useEffect(() => {
    if (!idSalesheader) {
      setDataSalesItem([]);
      return undefined;
    }

    axios({
      method: "GET",
      url: "https://golangapi-j5iu.onrender.com/v1.0/store/sales/detail/item",
      params: {
        id_tr_sales_header: idSalesheader,
      },
      headers: { "Content-Type": "multipart/form-data" },
    })
      .then(function (response) {
        if (response.data && response.data.salesDetailItemData) {
          setDataSalesItem(response.data.salesDetailItemData);
        } else {
          setDataSalesItem([]);
        }
      })
      .catch(function (error) {
        console.error("Terjadi kesalahan:", error);
        setDataSalesItem([]);
      });
  }, [idSalesheader]);

  useEffect(() => {
    if (!idSalesheader) {
      setDataSalesPayment([]);
      return undefined;
    }

    axios({
      method: "GET",
      url: "https://golangapi-j5iu.onrender.com/v1.0/store/sales/detail/payment",
      params: {
        id_tr_sales_header: idSalesheader,
      },
      headers: { "Content-Type": "multipart/form-data" },
    })
      .then(function (response) {
        if (response.data && response.data.salesDetailPaymentData) {
          setDataSalesPayment(response.data.salesDetailPaymentData);
        } else {
          setDataSalesPayment([]);
        }
      })
      .catch(function (error) {
        console.error("Terjadi kesalahan:", error);
        setDataSalesPayment([]);
      });
  }, [idSalesheader]);

  const itemTotals = useMemo(
    () =>
      DataSalesItem.reduce(
        (acc, item) => ({
          qty: acc.qty + (Number(item.qty) || 0),
          net: acc.net + (Number(item.net) || 0),
        }),
        { qty: 0, net: 0 }
      ),
    [DataSalesItem]
  );

  const paymentTotal = useMemo(
    () => DataSalesPayment.reduce((acc, item) => acc + (Number(item.BAYAR) || 0), 0),
    [DataSalesPayment]
  );

  const displayItemIds = useMemo(() => buildDisplayItemIds(DataSalesItem), [DataSalesItem]);

  const linkedDiscountRows = useMemo(
    () => DataSalesItem.map((_, index) => isLinkedDiscountRow(DataSalesItem, index)),
    [DataSalesItem]
  );

  return (
    <Modal
      isOpen={modal}
      toggle={() => closeModal()}
      className="modal-dialog-centered sales-detail-modal"
      size="lg"
    >
      <ModalBody>
        <a
          href="#cancel"
          onClick={(ev) => {
            ev.preventDefault();
            closeModal();
          }}
          className="close"
        >
          <Icon name="cross-sm" />
        </a>
        <div className="p-2">
          <h5 className="title">Item Detail</h5>
          <div className="sales-detail-item-scroll">
            <DataTableBody compact className="border-top sales-detail-modal-table" bodyclass="nk-tb-orders">
              <DataTableHead>
                <DataTableRow size="sm" className="sales-detail-col-id">
                  <span>ID</span>
                </DataTableRow>
                <DataTableRow size="md" className="text-left sales-detail-col-plu">
                  <span>PLU</span>
                </DataTableRow>
                <DataTableRow className="sales-detail-col-desc">
                  <span>DESCRIPTION</span>
                </DataTableRow>
                <DataTableRow size="sm" className="text-end sales-detail-col-price">
                  <span>PRICE</span>
                </DataTableRow>
                <DataTableRow size="sm" className="text-center sales-detail-col-qty">
                  <span>QTY</span>
                </DataTableRow>
                <DataTableRow className="text-end sales-detail-col-net">
                  <span>NET SALES</span>
                </DataTableRow>
              </DataTableHead>

              {DataSalesItem.length > 0
                ? DataSalesItem.map((item, index) => {
                    const isDiscountChild = linkedDiscountRows[index];
                    const hasDiscountChild =
                      index < DataSalesItem.length - 1 && linkedDiscountRows[index + 1];

                    return (
                    <DataTableItem
                      key={item.id || `${getItemPlu(item)}-${index}`}
                      className={getItemRowClassName(isDiscountChild, hasDiscountChild)}
                    >
                      <DataTableRow className="nk-tb-orders-type sales-detail-col-id">
                        <span className="sm">
                          {!isDiscountChild && displayItemIds[index] != null
                            ? displayItemIds[index]
                            : ""}
                        </span>
                      </DataTableRow>
                      <DataTableRow className="text-left sales-detail-col-plu">
                        <span>{isDiscountChild ? "" : getItemPlu(item)}</span>
                      </DataTableRow>
                      <DataTableRow size="sm" className="sales-detail-col-desc">
                        <span
                          className={`tb-sub${isDiscountChild ? " sales-detail-discount-desc" : ""}`}
                          style={{ color: item.color }}
                        >
                          {getItemDescription(item)}
                        </span>
                      </DataTableRow>
                      <DataTableRow size="sm" className="text-end sales-detail-col-price">
                        <span className="tb-sub">
                          {!isDiscountChild
                            ? formatNumber(item.Harga_Jual ?? item.harga_jual)
                            : ""}
                        </span>
                      </DataTableRow>
                      <DataTableRow size="sm" className="text-center sales-detail-col-qty">
                        <span className="tb-sub">{!isDiscountChild ? item.qty : ""}</span>
                      </DataTableRow>
                      <DataTableRow size="sm" className="text-end sales-detail-col-net">
                        <span className="tb-sub">{formatNumber(item.net)}</span>
                      </DataTableRow>
                    </DataTableItem>
                    );
                  })
                : null}

              {DataSalesItem.length > 0 ? (
                <DataTableItem className="sales-detail-summary-row">
                  <DataTableRow className="nk-tb-orders-type sales-detail-col-id">
                    <span />
                  </DataTableRow>
                  <DataTableRow className="text-left sales-detail-col-plu">
                    <span className="tb-sub sales-detail-summary-label">Total</span>
                  </DataTableRow>
                  <DataTableRow size="sm" className="sales-detail-col-desc">
                    <span />
                  </DataTableRow>
                  <DataTableRow size="sm" className="text-end sales-detail-col-price">
                    <span />
                  </DataTableRow>
                  <DataTableRow size="sm" className="text-center sales-detail-col-qty">
                    <span className="tb-sub sales-detail-summary-value">{formatNumber(itemTotals.qty)}</span>
                  </DataTableRow>
                  <DataTableRow size="sm" className="text-end sales-detail-col-net">
                    <span className="tb-sub sales-detail-summary-value">{formatNumber(itemTotals.net)}</span>
                  </DataTableRow>
                </DataTableItem>
              ) : null}
            </DataTableBody>
          </div>

          <div className="mt-4">
            <h5 className="title">Payment Detail</h5>
            <DataTableBody compact className="border-top sales-detail-payment-table" bodyclass="nk-tb-orders">
              <DataTableHead>
                <DataTableRow size="sm" className="sales-detail-payment-col-id">
                  <span>ID</span>
                </DataTableRow>
                <DataTableRow className="sales-detail-payment-col-type">
                  <span>PAYMENT TYPE</span>
                </DataTableRow>
                <DataTableRow size="md" className="text-end sales-detail-payment-col-amount">
                  <span>AMOUNT</span>
                </DataTableRow>
              </DataTableHead>

              {DataSalesPayment.length > 0
                ? DataSalesPayment.map((item, index) => (
                    <DataTableItem key={item.id || `${item.TIPE_BAYAR}-${index}`}>
                      <DataTableRow className="nk-tb-orders-type sales-detail-payment-col-id">
                        <span className="sm">{item.id}</span>
                      </DataTableRow>
                      <DataTableRow className="sales-detail-payment-col-type">
                        <span className="tb-sub">{item.TIPE_BAYAR}</span>
                      </DataTableRow>
                      <DataTableRow className="text-end sales-detail-payment-col-amount">
                        <span className="tb-sub">{formatNumber(item.BAYAR)}</span>
                      </DataTableRow>
                    </DataTableItem>
                  ))
                : null}

              {DataSalesPayment.length > 0 ? (
                <DataTableItem className="sales-detail-summary-row">
                  <DataTableRow className="sales-detail-payment-col-id">
                    <span />
                  </DataTableRow>
                  <DataTableRow className="sales-detail-payment-col-type">
                    <span className="tb-sub sales-detail-summary-label">Total</span>
                  </DataTableRow>
                  <DataTableRow className="text-end sales-detail-payment-col-amount">
                    <span className="tb-sub sales-detail-summary-value">{formatNumber(paymentTotal)}</span>
                  </DataTableRow>
                </DataTableItem>
              ) : null}
            </DataTableBody>
          </div>
        </div>
      </ModalBody>
    </Modal>
  );
};

export default SalesDetailModal;
