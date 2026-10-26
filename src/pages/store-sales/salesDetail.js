import React, { useState, useEffect, useMemo, useCallback } from "react";
import Head from "../../layout/head/Head";
import Content from "../../layout/content/Content";
import OrderOverview from "../../components/partials/crypto/order-overview/OrderOverview";
import ActionCenter from "../../components/partials/crypto/action-center/ActionCenter";
import CoinOrder from "../../components/partials/crypto/coin-order/CoinOrder";
import UserActivity from "../../components/partials/crypto/user-activity/UserActivity";
import OrderActivity from "../../components/partials/order-activity/OrderActivity";
import { Card,CardTitle , DropdownItem, DropdownMenu, DropdownToggle, UncontrolledDropdown } from "reactstrap";
import { DataTableBody, DataTableHead, DataTableItem, DataTableRow } from "../../components/table/DataTable";
import { Link } from "react-router-dom";
import DatePicker from "../../components/AppDatePicker";
import CalendarDateInput from "../../components/CalendarDateInput";
import axios from 'axios';
import { useStoreScope } from "../../hooks/useStoreScope";
import { format } from 'date-fns';
import {
  Block,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockBetween,
  BlockTitle,
  Icon,
  Button,
  Row,
  Col,
  TooltipComponent,
} from "../../components/Component";
import { NumericFormat } from 'react-number-format';
import SalesDetailModal from "./salesDetailModal";
import { PageSmoothScroll } from "../../components/PageSmoothScroll";
import { SalesEmptyState } from "../../components/SalesEmptyState";
import { exportStyledXlsx } from "../../lib/exportStyledXlsx";

const DEFAULT_SALES_SORT = { key: "tanggalTransaksi", direction: "desc" };

const getSortIcon = (key, sortConfig) => {
  if (sortConfig.key !== key) return "sort-v";
  return sortConfig.direction === "asc" ? "sort-up-fill" : "sort-down-fill";
};

const parseSalesDate = (value) => {
  const time = Date.parse(String(value ?? ""));
  return Number.isNaN(time) ? 0 : time;
};

const compareSalesDetailRows = (a, b, key, direction) => {
  const mul = direction === "asc" ? 1 : -1;

  if (key === "tanggalTransaksi") {
    return (parseSalesDate(a.tanggalTransaksi) - parseSalesDate(b.tanggalTransaksi)) * mul;
  }

  if (key === "qty") {
    return ((Number(a.qty) || 0) - (Number(b.qty) || 0)) * mul;
  }

  if (key === "grandTotal") {
    return ((Number(a.grandTotal) || 0) - (Number(b.grandTotal) || 0)) * mul;
  }

  return 0;
};

const filterSalesByActivity = (rows, activity) => {
  if (activity === "POS") {
    return rows.filter((item) => item.status === "POS");
  }
  if (activity === "ONLINE") {
    return rows.filter((item) => item.status === "ONLINE");
  }
  return rows;
};
  
const SalesDetail = () => {
  const { storeId, storeName } = useStoreScope();
  const [sm, updateSm] = useState(true);
  const [orderActivity, setActivity] = useState(""); 
  const [filterKeywords, seFilterKeywords] = useState(""); 
  const [orderData, setOrderData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortByTab, setSortByTab] = useState({
    "": DEFAULT_SALES_SORT,
    POS: DEFAULT_SALES_SORT,
    ONLINE: DEFAULT_SALES_SORT,
  });
  //---totalan
  const [DataTotalPos, setDataTotalPos] = useState("0.00");  
  const [DataTotalOnline, setDataTotalOnline] = useState("0.00");  
  const [DataGrandTotal, setDataGrandTotal] = useState("0.00");  

  const [DataTotalQtyPos, setDataTotalQtyPos] = useState([]);  
  const [DataTotalQtyOnline, setDataTotalQtyOnline] = useState([]);  
  const [DataGrandQtyTotal, setDataGrandQtyTotal] = useState([]);  
  //--
  const [rangeStart, setRangeStart] = useState(() => new Date());
  const [rangeEnd, setRangeEnd] = useState(() => new Date());
  const [rangeDate, setRangeDate] = useState({
    start: new Date(),
    end: new Date(),
  });
  
  const onRangeChange = (dates) => {
    const [start, end] = dates;
    setRangeDate({ start: start, end: end });
  };

  //------------ modal
  // const [data, setData] = contextData;
  const [editId, setEditedId] = useState();
  const [modal, setModal] = useState({
    edit: false,
    add: false,
  });
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    balance: 0,
    phone: "",
    status: "",
  });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    balance: 0,
    phone: "",
    status: "Active",
  });
  const closeEditModal = () => {
    setModal({ edit: false })
    resetForm();
  };
   const handleInputChange = (e) => {
    seFilterKeywords(e.target.value);
  };
// -------------end edit modal
  useEffect(() => {
    if (!storeId) return;

    const fromDate = format(rangeStart, "yyyy-MM-dd");
    const toDate = format(rangeEnd || rangeStart, "yyyy-MM-dd");

    setLoading(true);

    axios({
      method: "GET",
      url: "https://golangapi-j5iu.onrender.com/v1.0/store/sales/detail",
      params: {
        fromDate,
        toDate,
        keywords: filterKeywords,
        storeID: storeId,
      },
      headers: { "Content-Type": "multipart/form-data" },
    })
      .then(function (response) {
        if (response.data && response.data.salesDetailData) {
          setOrderData(response.data.salesDetailData);
        } else {
          setOrderData([]);
        }
      })
      .catch(function (error) {
        console.error("Terjadi kesalahan:", error);
      })
      .finally(function () {
        setLoading(false);
      });

    axios({
      method: "GET",
      url: "https://golangapi-j5iu.onrender.com/v1.0/store/sales/detail/total",
      params: {
        fromDate,
        toDate,
        storeID: storeId,
      },
      headers: { "Content-Type": "multipart/form-data" },
    })
      .then(function (response) {
        if (response.data && response.data.salesTotalData) {
          setDataTotalPos(response.data.salesTotalData.totalPos);
          setDataTotalOnline(response.data.salesTotalData.totalOnline);
          setDataGrandTotal(response.data.salesTotalData.grandTotal);
          setDataTotalQtyPos(response.data.salesTotalData.qtyPos);
          setDataTotalQtyOnline(response.data.salesTotalData.qtyOnline);
          setDataGrandQtyTotal(response.data.salesTotalData.totalQty);
        }
      })
      .catch(function (error) {
        console.error("Terjadi kesalahan:", error);
      });
  }, [storeId, filterKeywords]);



  const sortConfig = sortByTab[orderActivity] || DEFAULT_SALES_SORT;

  const displaySalesDetail = useMemo(() => {
    const filtered = filterSalesByActivity(orderData, orderActivity);
    if (!sortConfig.key) return filtered;
    return [...filtered].sort((a, b) =>
      compareSalesDetailRows(a, b, sortConfig.key, sortConfig.direction)
    );
  }, [orderData, orderActivity, sortConfig]);

  const tabCounts = useMemo(
    () => ({
      POS: filterSalesByActivity(orderData, "POS").length,
      ONLINE: filterSalesByActivity(orderData, "ONLINE").length,
      ALL: orderData.length,
    }),
    [orderData]
  );

  const handleSort = useCallback(
    (key) => {
      setSortByTab((prev) => {
        const current = prev[orderActivity] || DEFAULT_SALES_SORT;
        if (current.key === key) {
          return {
            ...prev,
            [orderActivity]: { key, direction: current.direction === "asc" ? "desc" : "asc" },
          };
        }
        return {
          ...prev,
          [orderActivity]: { key, direction: "desc" },
        };
      });
    },
    [orderActivity]
  );

  const renderSortHeader = (label, key, options = {}) => {
    const { center = false, end = false } = options;
    const isActive = sortConfig.key === key;

    return (
      <button
        type="button"
        className={`sales-detail-sort-trigger${isActive ? " is-active" : ""}${center ? " is-center" : ""}${end ? " is-end" : ""}`}
        onClick={() => handleSort(key)}
      >
        <span className="sub-text">{label}</span>
        <Icon name={getSortIcon(key, sortConfig)} />
      </button>
    );
  };

  const canExport = displaySalesDetail.length > 0 && !loading;

  const exportExcel = useCallback(async () => {
    if (!canExport) return;
    const tabLabel = orderActivity === "" ? "all" : orderActivity.toLowerCase();
    const fileName = `sales-detail-${tabLabel}-${storeId || "store"}-${format(new Date(), "yyyyMMdd")}`;
    const columns = [
      { key: "id", label: "ID", width: 8, align: "right", numFmt: "#,##0" },
      { key: "billingCode", label: "BILLING CODE", width: 20 },
      { key: "tanggalTransaksi", label: "DATE", width: 16 },
      { key: "userID", label: "CASHIER", width: 16 },
      { key: "qty", label: "TOTAL QTY", width: 12, align: "right", numFmt: "#,##0" },
      { key: "grandTotal", label: "NET SALES", width: 14, align: "right", numFmt: "#,##0" },
      { key: "status", label: "SALES SOURCE", width: 14 },
      { key: "statusEcr", label: "ECR STATUS", width: 14 },
    ];
    const rowsForExport = displaySalesDetail.map((item) => ({
      id: Number(item.id) || 0,
      billingCode: item.billingCode || "-",
      tanggalTransaksi: item.tanggalTransaksi || "-",
      userID: item.userID || "-",
      qty: Number(item.qty) || 0,
      grandTotal: Number(item.grandTotal) || 0,
      status: item.status || "-",
      statusEcr: item.statusEcr || "-",
    }));
    const totals = rowsForExport.reduce(
      (acc, row) => ({
        qty: acc.qty + (Number(row.qty) || 0),
        grandTotal: acc.grandTotal + (Number(row.grandTotal) || 0),
      }),
      { qty: 0, grandTotal: 0 }
    );
    rowsForExport.push({
      id: "",
      billingCode: "",
      tanggalTransaksi: "",
      userID: "TOTAL",
      qty: totals.qty,
      grandTotal: totals.grandTotal,
      status: "",
      statusEcr: "",
      rowType: "footer",
    });
    await exportStyledXlsx({
      fileName,
      sheetName: "Sales Detail",
      columns,
      rows: rowsForExport,
      getRowStyle: (row) =>
        row.rowType === "footer"
          ? { fill: "FFF7FAFF", font: { bold: true, color: { argb: "FF364A63" } } }
          : null,
    });
  }, [canExport, displaySalesDetail, orderActivity, storeId]);
    
  // modal
  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      balance:0,
      phone: "",
      status: "Active",
    });
  };

  const onEditSubmit = (submitData) => {
    const { name, email, phone } = submitData;
    let submittedData;
    let newitems = orderData;
    newitems.forEach((item) => {
      if (item.id === editId) {
        submittedData = {
          id: item.id,
          avatarBg: item.avatarBg,
          name: name,
          image: item.image,
          role: item.role,
          email: email,
          balance: editFormData.balance,
          phone: phone,
          emailStatus: item.emailStatus,
          kycStatus: item.kycStatus,
          lastLogin: item.lastLogin,
          status: editFormData.status,
          country: item.country,
        };
      }
    });
    let index = newitems.findIndex((item) => item.id === editId);
    newitems[index] = submittedData;
    setModal({ edit: false });
  };


 
  const onFilterChange = () => {
    const fromDate = format(rangeStart, "yyyy-MM-dd");
    const toDate = format(rangeEnd || rangeStart, "yyyy-MM-dd");

    setLoading(true);

    axios({
      method: "GET",
      url: "https://golangapi-j5iu.onrender.com/v1.0/store/sales/detail",
      params: {
        fromDate,
        toDate,
        keywords: filterKeywords,
        storeID: storeId,
      },
      headers: { "Content-Type": "multipart/form-data" },
    })
      .then(function (response) {
        if (response.data && response.data.salesDetailData) {
          setOrderData(response.data.salesDetailData);
        } else {
          setOrderData([]);
        }
      })
      .catch(function (error) {
        console.error("Terjadi kesalahan:", error);
      })
      .finally(function () {
        setLoading(false);
      });

    axios({
      method: "GET",
      url: "https://golangapi-j5iu.onrender.com/v1.0/store/sales/detail/total",
      params: {
        fromDate,
        toDate,
        storeID: storeId,
      },
      headers: { "Content-Type": "multipart/form-data" },
    })
      .then(function (response) {
        if (response.data && response.data.salesTotalData) {
          setDataTotalPos(response.data.salesTotalData.totalPos);
          setDataTotalOnline(response.data.salesTotalData.totalOnline);
          setDataGrandTotal(response.data.salesTotalData.grandTotal);
          setDataTotalQtyPos(response.data.salesTotalData.qtyPos);
          setDataTotalQtyOnline(response.data.salesTotalData.qtyOnline);
          setDataGrandQtyTotal(response.data.salesTotalData.totalQty);
        }
      })
      .catch(function (error) {
        console.error("Terjadi kesalahan:", error);
      });
  };
  const onEditClick = (idSalesheader) => {
    // DataSalesDetail.forEach((item) => {
      // if (item.id === id) {
      //   setEditFormData({
      //     name: item.name,
      //     email: item.email,
      //     status: item.status,
      //     phone: item.phone,
      //     balance: item.balance,
      //   });
        setModal({ edit: true }, { add: false },{});
        setEditedId(idSalesheader);
      // }
    // });
  };

  return (
    <React.Fragment>
      <Head title="Sales Detail" />
      <Content>
        <PageSmoothScroll
          revision={`${loading ? "loading" : "ready"}-${displaySalesDetail.length}-${orderActivity || "all"}`}
        >
        <BlockHead size="sm">
          <BlockBetween className="page-head-stack">
            <BlockHeadContent>
              <BlockTitle page>Sales Detail</BlockTitle>
              <BlockDes className="text-soft">
                <p>{storeId}{storeName ? ` - ${storeName}` : ""}</p>
              </BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <div className="toggle-wrap nk-block-tools-toggle">
                <Button
                  className={`btn-icon btn-trigger toggle-expand me-n1 ${sm ? "active" : ""}`}
                  onClick={() => updateSm(!sm)}
                >
                  <Icon name="more-v" />
                </Button>
                <div className="toggle-expand-content" style={{ display: sm ? "block" : "none" }}>
                  <ul className="nk-block-tools g-3">
                    <li>
                      <div className="sales-filter-range">
                        <DatePicker
                          selected={rangeStart}
                          onChange={(d) => {
                            setRangeStart(d);
                            if (rangeEnd && d && rangeEnd < d) setRangeEnd(d);
                          }}
                          selectsStart
                          startDate={rangeStart}
                          endDate={rangeEnd}
                          dateFormat="dd MMM yyyy"
                          customInput={<CalendarDateInput className="form-control date-picker sales-filter-date" />}
                        />
                        <span className="sales-filter-to">s/d</span>
                        <DatePicker
                          selected={rangeEnd}
                          onChange={setRangeEnd}
                          selectsEnd
                          startDate={rangeStart}
                          endDate={rangeEnd}
                          minDate={rangeStart}
                          dateFormat="dd MMM yyyy"
                          customInput={<CalendarDateInput className="form-control date-picker sales-filter-date" />}
                        />
                      </div>
                    </li>
                    <li>
                    <input
                          type="text"
                          className="form-control"
                          id="default-04"
                          placeholder="Search by BillCode" 
                           onChange={handleInputChange} 
                        />
                    </li>
                     <li>
                      <Button color="primary" onClick={(e) => onFilterChange(e)} disabled={loading || !storeId}>
                        <Icon name="search" />
                        <span>Load</span>
                      </Button>
                    </li>
                    <li>
                      <Button
                        color="primary"
                        outline
                        className="btn-icon"
                        onClick={exportExcel}
                        disabled={!canExport}
                        title="Export Excel"
                        aria-label="Export Excel"
                      >
                        <Icon name="download-cloud"></Icon>
                      </Button>
                    </li>
                   
                    {/* <li className="nk-block-tools-opt">
                      <UncontrolledDropdown>
                        <DropdownToggle color="transparent" className="btn btn-primary btn-icon dropdown-toggle">
                          <Icon name="plus"></Icon>
                        </DropdownToggle>
                        <DropdownMenu end>
                          <ul className="link-list-opt no-bdr">
                            <li>
                              <DropdownItem
                                tag="a"
                                href="#dropdownitem"
                                onClick={(ev) => {
                                  ev.preventDefault();
                                }}
                              >
                                <Icon name="user-add-fill"></Icon>
                                <span>Add User</span>
                              </DropdownItem>
                            </li>
                            <li>
                              <DropdownItem
                                tag="a"
                                href="#dropdownitem"
                                onClick={(ev) => {
                                  ev.preventDefault();
                                }}
                              >
                                <Icon name="coin-alt-fill"></Icon>
                                <span>Add Order</span>
                              </DropdownItem>
                            </li>
                            <li>
                              <DropdownItem
                                tag="a"
                                href="#dropdownitem"
                                onClick={(ev) => {
                                  ev.preventDefault();
                                }}
                              >
                                <Icon name="note-add-fill-c"></Icon>
                                <span>Add Page</span>
                              </DropdownItem>
                            </li>
                          </ul>
                        </DropdownMenu>
                      </UncontrolledDropdown>
                    </li> */}
                  </ul>
                </div>
              </div>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>
        <Block>
          <Row className="g-gs">
            <Col lg="12">
              <div className="sd-summary">
                <section className="sd-summary__panel">
                  <header className="sd-summary__head">
                    <span className="sd-summary__eyebrow">Nilai</span>
                    <h6 className="sd-summary__title">Penjualan</h6>
                  </header>
                  <div className="sd-summary__grid">
                    <div className="sd-summary__item">
                      <span className="sd-summary__label">POS</span>
                      <strong className="sd-summary__value">
                        {DataTotalPos}
                        <span className="sd-summary__unit">IDR</span>
                      </strong>
                    </div>
                    <div className="sd-summary__item">
                      <span className="sd-summary__label">Online</span>
                      <strong className="sd-summary__value">
                        {DataTotalOnline}
                        <span className="sd-summary__unit">IDR</span>
                      </strong>
                    </div>
                    <div className="sd-summary__item is-accent">
                      <span className="sd-summary__label">Total Sales</span>
                      <strong className="sd-summary__value">
                        {DataGrandTotal}
                        <span className="sd-summary__unit">IDR</span>
                      </strong>
                    </div>
                  </div>
                </section>

                <section className="sd-summary__panel">
                  <header className="sd-summary__head">
                    <span className="sd-summary__eyebrow">Volume</span>
                    <h6 className="sd-summary__title">Quantity</h6>
                  </header>
                  <div className="sd-summary__grid">
                    <div className="sd-summary__item">
                      <span className="sd-summary__label">POS</span>
                      <strong className="sd-summary__value">
                        {DataTotalQtyPos}
                        <span className="sd-summary__unit">item</span>
                      </strong>
                    </div>
                    <div className="sd-summary__item">
                      <span className="sd-summary__label">Online</span>
                      <strong className="sd-summary__value">
                        {DataTotalQtyOnline}
                        <span className="sd-summary__unit">item</span>
                      </strong>
                    </div>
                    <div className="sd-summary__item is-accent">
                      <span className="sd-summary__label">Total Qty</span>
                      <strong className="sd-summary__value">
                        {DataGrandQtyTotal}
                        <span className="sd-summary__unit">item</span>
                      </strong>
                    </div>
                  </div>
                </section>
              </div>
            </Col>
            
            <Col lg="12">
              <div className="page-table-scroll">
              <Card className="card-bordered card-full sales-detail-page">
              <div className="card-inner">
        <div className="card-title-group">
          <CardTitle>
            <h6 className="title">
              <span className="me-2">Sales Detail</span>{" "}
              {/* <Link to={`${process.env.PUBLIC_URL}/transaction-crypto`} className="link d-none d-sm-inline">
                See History
              </Link> */}
            </h6>
          </CardTitle>
          <div className="card-tools">
            <ul className="card-tools-nav">
              <li className={orderActivity === "POS" ? "active" : ""} onClick={() => setActivity("POS")}>
                <a
                  href="#pos"
                  onClick={(ev) => {
                    ev.preventDefault();
                  }}
                >
                  <span>POS ({tabCounts.POS})</span>
                </a>
              </li>
              <li className={orderActivity === "ONLINE" ? "active" : ""} onClick={() => setActivity("ONLINE")}>
                <a
                  href="#online"
                  onClick={(ev) => {
                    ev.preventDefault();
                  }}
                >
                  <span>ONLINE ({tabCounts.ONLINE})</span>
                </a>
              </li>
              <li className={orderActivity === "" ? "active" : ""} onClick={() => setActivity("")}>
                <a
                  href="#all"
                  onClick={(ev) => {
                    ev.preventDefault();
                  }}
                >
                  <span>ALL ({tabCounts.ALL})</span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <DataTableBody compact className="border-top" bodyclass="nk-tb-orders">
        <DataTableHead>  
        <DataTableRow size="sm">
            <span>ID</span>
          </DataTableRow>
          <DataTableRow size="sm">
            <span>BILLING CODE</span>
          </DataTableRow>
          <DataTableRow size="xl" className="text-center">
            {renderSortHeader("DATE", "tanggalTransaksi", { center: true })}
          </DataTableRow>
          <DataTableRow>
            <span>CASHIER</span>
          </DataTableRow>
          <DataTableRow size="xxl" className="text-center">
            {renderSortHeader("TOTAL QTY", "qty", { center: true })}
          </DataTableRow>
          <DataTableRow size="sm">
            {renderSortHeader("NET SALES", "grandTotal")}
          </DataTableRow>
          <DataTableRow className="text-center">
            <span>SALES SOURCE</span>
          </DataTableRow>
          <DataTableRow className="text-end">
            <span>ACTION</span>
          </DataTableRow>
        </DataTableHead>

        {displaySalesDetail.length > 0
                    ? displaySalesDetail.map((item) => {
                      return (
            <DataTableItem >
               <DataTableRow className="nk-tb-orders-type">
              <span className="tb-lead">{item.id}</span>
              </DataTableRow>
              <DataTableRow className="nk-tb-orders-type">
              <span className="tb-lead">{item.billingCode}</span>
              </DataTableRow>
              <DataTableRow className="text-center">
                <span >{item.tanggalTransaksi}</span>
              </DataTableRow>
              <DataTableRow size="sm">
                <span className="tb-sub">{item.userID}</span>
              </DataTableRow>
              <DataTableRow size="xl" className="text-center">
                <span className="tb-sub">{item.qty}</span>
              </DataTableRow>
            
              <DataTableRow size="sm">
                <span className="tb-sub tb-amount">
                <NumericFormat value={item.grandTotal}   thousandSeparator=","  displayType="text"  renderText={(value) => <text>{value}</text>}/>
                   <span> IDR</span>
                </span>
              </DataTableRow>
              
              <DataTableRow size="xl" className="text-center">

              <span
                            className={`tb-status text-${
                              item.status === "POS" ? "success" : item.status === "ONLINE" ? "warning" :null
                            }`}
                          >
                            {item.status}
                          </span>
 
                <span className="tb-sub" style={{marginLeft:"20px"}}>{item.statusEcr}</span>
              </DataTableRow> 



              <DataTableRow className="nk-tb-col-tools">
                              <ul className="nk-tb-actions gx-1 my-n1">
                                
                             <span className="tb-sub text-primary">
                           

                             {item.namaMember != "" ? <>
                             
                              <TooltipComponent 
                                    tag="a"
                                    containerClassName="btn btn-trigger btn-icon" 
                                    id={"suspend" + item.billingCode}
                                    icon="user-c"
                                    direction="top"
                                    text= {item.namaMember}
                                    onClick={(ev) => {
                                      ev.preventDefault();
                                      onEditClick(item.id);
                                      toggle("details");
                                    }}
                                  /> 
                                </> : null}
                                
 </span>
                               
                                <span className="tb-sub text-primary">
                           

                              {item.status == "ONLINE" ? <>
                              <TooltipComponent 
                                    tag="a"
                                    containerClassName="btn btn-trigger btn-icon"
                                    id="upload"
                                    icon="upload"
                                    direction="top"
                                    text="Upload Image"
                                    onClick={(ev) => {
                                      ev.preventDefault();
                                      onEditClick(item.id);
                                      toggle("details");
                                    }}
                                  />

                            
                                    </> : null}
                              </span>
 
                               
                              <li className="nk-tb-action-hidden" onClick={() => onEditClick(item.idSalesheader)}>
                              <TooltipComponent
                                tag="a"
                                containerClassName="btn btn-trigger btn-icon"
                                id={"edit" + item.idSalesheader}
                                icon="edit-alt-fill"
                                direction="top"
                                text="Detail"
                              />
                            </li>

                              {/* <button onClick={() => onEditClick(item.id)}>
                                      <div
                                        tag="a"
                                        href="#edit"
                                        onClick={(ev) => {
                                          ev.preventDefault();
                                        }}
                                      >
                                        <Icon name="edit"></Icon>
                                        <span>Edit</span>
                                      </div>
                                    </button> */}
{/* 
                                <li className="me-n1">
                                  <UncontrolledDropdown> */}

                                  {/* <TooltipComponent 
                                    tag="a"
                                    containerClassName="btn btn-trigger btn-icon"
                                    id= "Detail"
                                    icon="forward-ios"
                                    direction="top"
                                    text="Detail Sales"
                                    onClick={(ev) => {
                                      ev.preventDefault();
                                      onEditClick(item.id);
                                      toggle("details");
                                    }}
                                  /> 
                                    */}
                                  {/* </UncontrolledDropdown> */}
                                {/* </li> */}
                              </ul>
                              
                            </DataTableRow>
 
 
            </DataTableItem>
     );
    }) :  
     null
    
    } 
      </DataTableBody>
      {displaySalesDetail.length === 0 ? (
        <div className="card-inner">
          <SalesEmptyState
            description={
              orderData.length > 0 ? (
                <>Tidak ada transaksi untuk tab yang dipilih.</>
              ) : (
                <>Tidak ada data sales untuk filter yang dipilih.</>
              )
            }
          />
        </div>
      ) : null}
              </Card>
              </div>
            </Col>
          
          </Row>
        </Block>
        </PageSmoothScroll>
        <SalesDetailModal modal={modal.edit} modalType="edit" idSalesheader={editId}  formData={editFormData} setFormData={setEditFormData} closeModal={closeEditModal} onSubmit={onEditSubmit} />
      </Content>
    </React.Fragment>
  );
};

export default SalesDetail;
