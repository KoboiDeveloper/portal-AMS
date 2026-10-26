import React, { useState, useEffect } from "react";
import Content from "../../layout/content/Content";
import Head from "../../layout/head/Head";
import TaskOverview from "../../components/Dashboard/taskOverview";
import RecentTransaction from "../../components/Dashboard/RecentTransaction";
import Totaltransaction from "../../components/Dashboard/Totaltransaction";
import TotalSellingItem from "../../components/Dashboard/TotalSellingItem";
import Laststock from "../../components/Dashboard/Laststock";
import SalesOverview from "../../components/Dashboard/SalesOverview";
import { DropdownToggle, DropdownMenu, Card, UncontrolledDropdown, DropdownItem } from "reactstrap";
import {
  Block,
  BlockDes,
  BlockBetween,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Icon,
  Button,
  Row,
  Col,
  PreviewAltCard,
  TooltipComponent,
} from "../../components/Component";
import { BalanceBarChart, DepositBarChart, WithdrawBarChart } from "../../components/partials/charts/invest/InvestChart";
import { useStoreScope } from "../../hooks/useStoreScope";
import { fetchStoreDashboard } from "../../lib/storeDashboardApi";

const StoreDashboard = () => {
  const { storeId, storeName } = useStoreScope();
  const [sm, updateSm] = useState(false);
  const [DataTotalSales, setDataTotalSales] = useState("0.00");
  const [DataPresentaseDaily, setDataPresentaseDaily] = useState("0.00");
  const [DataTotalSalesWeekly, setDataTotalSalesWeekly] = useState("0.00");
  const [DataTotalSalesMonthly, setDataTotalSalesMonthly] = useState("0.00");
  const [DataTotalSalesOffline, setDataTotalSalesOffline] = useState("0.00");
  const [DataPresentaseOfflineDaily, setDataPresentaseOfflineDaily] = useState("0.00");
  const [DataTotalSalesWeeklyOffline, setDataTotalSalesWeeklyOffline] = useState("0.00");
  const [DataTotalSalesMonthlyOffline, setDataTotalSalesMonthlyOffline] = useState("0.00");
  const [DataTotalSalesOnline, setDataTotalSalesOnlinee] = useState("0.00");
  const [DataPresentaseOnlineDaily, setDataPresentaseOnlineDaily] = useState("0.00");
  const [DataTotalSalesWeeklyOnline, setDataTotalSalesWeeklyOnline] = useState("0.00");
  const [DataTotalSalesMonthlyOnline, setDataTotalSalesMonthlyOnline] = useState("0.00");
  const [DataTotalTransaction, setDataTotalTransaction] = useState("0.00");
  const [DataTotalTransactionWeekly, setDataTotalTransactionWeekly] = useState("0.00");
  const [DataTotalTransactionMonthly, setDataTotalTransactionMonthly] = useState("0.00");
  const [DataPresentaseTotalTransaction, setDataPresentaseTotalTransaction] = useState("0.00");
  const [DataPresentaseTotalTransactionWeekly, setDataPresentaseTotalTransactionWeekly] = useState("0.00");
  const [DataPresentaseTotalTransactionMonthly, setDataPresentaseTotalTransactionMonthly] = useState("0.00");
  const [DataLastStock, setDataLastStock] = useState("0.00");
  const [DataTotalSellingItems, setDataTotalSellingItems] = useState("0.00");
  const [DataPresentaseTotalSellingItems, setDataPresentaseTotalSellingItems] = useState("0.00");
  const [DataLastStockDate, setDataLastStockDate] = useState("");
  const [DataTotalSTin, setDataTotalSTin] = useState("0");
  const [DataTotalSTout, setDataTotalSTout] = useState("0");
  const [DataTotalKasRealisasi, setDataTotalKasRealisasi] = useState("0");

  const storeTitle = storeId
    ? `${storeId}${storeName ? ` - ${storeName}` : ""}`
    : "Store Dashboard";

  useEffect(() => {
    if (!storeId) return;

    fetchStoreDashboard("sales", storeId)
      .then((response) => {
        const row = response.data?.salesData?.[0];
        if (!row) return;
        setDataTotalSales(row.current_total_sales_daily);
        setDataPresentaseDaily(row.presentase_daily);
        setDataTotalSalesWeekly(row.total_sales_weekly);
        setDataTotalSalesMonthly(row.total_sales_monthly);
        setDataTotalSalesOffline(row.total_sales_offline_daily_current);
        setDataPresentaseOfflineDaily(row.presentase_offline_daily);
        setDataTotalSalesWeeklyOffline(row.total_sales_offline_weekly);
        setDataTotalSalesMonthlyOffline(row.total_sales_offline_monthly);
        setDataTotalSalesOnlinee(row.total_sales_online_daily_current);
        setDataPresentaseOnlineDaily(row.presentase_online_daily);
        setDataTotalSalesWeeklyOnline(row.total_sales_online_weekly);
        setDataTotalSalesMonthlyOnline(row.total_sales_online_monthly);
        setDataTotalTransaction(row.total_transaction_daily_current);
        setDataTotalTransactionWeekly(row.total_transaction_weekly);
        setDataTotalTransactionMonthly(row.total_transaction_monthly);
        setDataPresentaseTotalTransaction(row.presentase_transaction_daily);
        setDataPresentaseTotalTransactionWeekly(row.presentase_transaction_weekly);
        setDataPresentaseTotalTransactionMonthly(row.presentase_transaction_monthly);
        setDataLastStock(row.last_stock);
        setDataTotalSellingItems(row.total_selling_items);
        setDataPresentaseTotalSellingItems(row.presentase_total_selling_items);
        setDataLastStockDate(row.last_stock_date);
        setDataTotalSTin(row.totalSTin);
        setDataTotalSTout(row.totalSTOut);
        setDataTotalKasRealisasi(row.totalKasRealisasi);
      })
      .catch((error) => {
        console.error("Store dashboard sales error:", error);
      });
  }, [storeId]);

  return (
    <>
      <Head title="Store Dashboard" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page>{storeTitle}</BlockTitle>
              <BlockDes className="text-soft">
                <p>Welcome to AMS Store Dashboard</p>
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
                      <Button color="primary" outline className="btn-dim btn-white">
                        <Icon name="download-cloud" />
                        <span>Export</span>
                      </Button>
                    </li>
                    <li>
                      <Button color="primary" outline className="btn-dim btn-white">
                        <Icon name="reports" />
                        <span>Reports</span>
                      </Button>
                    </li>
                    <li className="nk-block-tools-opt">
                      <UncontrolledDropdown>
                        <DropdownToggle color="transparent" className="dropdown-toggle btn btn-icon btn-primary">
                          <Icon name="plus" />
                        </DropdownToggle>
                        <DropdownMenu end>
                          <ul className="link-list-opt no-bdr">
                            <li>
                              <DropdownItem href="#adduser" onClick={(ev) => ev.preventDefault()}>
                                <Icon name="user-add-fill" />
                                <span>Add User</span>
                              </DropdownItem>
                            </li>
                          </ul>
                        </DropdownMenu>
                      </UncontrolledDropdown>
                    </li>
                  </ul>
                </div>
              </div>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Block>
          <Row className="g-gs">
            <Col md="4">
              <PreviewAltCard className="card-full">
                <div className="card-title-group align-start mb-0">
                  <div className="card-title">
                    <h6 className="subtitle">Total Sales</h6>
                  </div>
                  <div className="card-tools">
                    <TooltipComponent iconClass="card-hint" icon="help-fill" direction="left" id="store-total-sales" text="Total Sales" />
                  </div>
                </div>
                <div className="card-amount">
                  <span className="amount">
                    {DataTotalSales}<span className="currency currency-usd"> IDR</span>
                  </span>
                  <span className={DataPresentaseDaily < 0 ? "change down text-danger" : "change up text-success"}>
                    <Icon name={DataPresentaseDaily === 0 ? "" : DataPresentaseDaily < 0 ? "arrow-long-down" : "arrow-long-up"} />
                    {DataPresentaseDaily === 0 ? "~" : DataPresentaseDaily} %
                  </span>
                </div>
                <div className="invest-data">
                  <div className="invest-data-amount g-2">
                    <div className="invest-data-history">
                      <div className="title">This Month</div>
                      <span className="amount">{DataTotalSalesMonthly}<span className="currency currency-usd"> IDR</span></span>
                    </div>
                    <div className="invest-data-history">
                      <div className="title">This Week</div>
                      <span className="amount">{DataTotalSalesWeekly}<span className="currency currency-usd"> IDR</span></span>
                    </div>
                  </div>
                  <div className="invest-data-ck">
                    <DepositBarChart />
                  </div>
                </div>
              </PreviewAltCard>
            </Col>

            <Col md="4">
              <PreviewAltCard className="card-full">
                <div className="card-title-group align-start mb-0">
                  <div className="card-title">
                    <h6 className="subtitle">Offline Sales</h6>
                  </div>
                </div>
                <div className="card-amount">
                  <span className="amount">{DataTotalSalesOffline}<span className="currency currency-usd"> IDR</span></span>
                  <span className={DataPresentaseOfflineDaily < 0 ? "change down text-danger" : "change up text-success"}>
                    <Icon name={DataPresentaseOfflineDaily === 0 ? "" : DataPresentaseOfflineDaily < 0 ? "arrow-long-down" : "arrow-long-up"} />
                    {DataPresentaseOfflineDaily === 0 ? "~" : DataPresentaseOfflineDaily} %
                  </span>
                </div>
                <div className="invest-data">
                  <div className="invest-data-amount g-2">
                    <div className="invest-data-history">
                      <div className="title">This Month</div>
                      <div className="amount">{DataTotalSalesMonthlyOffline}<span className="currency currency-usd"> IDR</span></div>
                    </div>
                    <div className="invest-data-history">
                      <div className="title">This Week</div>
                      <div className="amount">{DataTotalSalesWeeklyOffline}<span className="currency currency-usd"> IDR</span></div>
                    </div>
                  </div>
                  <div className="invest-data-ck">
                    <WithdrawBarChart />
                  </div>
                </div>
              </PreviewAltCard>
            </Col>

            <Col md="4">
              <PreviewAltCard className="card-full">
                <div className="card-title-group align-start mb-0">
                  <div className="card-title">
                    <h6 className="subtitle">Online Sales</h6>
                  </div>
                </div>
                <div className="card-amount">
                  <span className="amount">{DataTotalSalesOnline}<span className="currency currency-usd"> IDR</span></span>
                  <span className={DataPresentaseOnlineDaily < 0 ? "change down text-danger" : "change up text-success"}>
                    <Icon name={DataPresentaseOnlineDaily === 0 ? "" : DataPresentaseOnlineDaily < 0 ? "arrow-long-down" : "arrow-long-up"} />
                    {DataPresentaseOnlineDaily === 0 ? "~" : DataPresentaseOnlineDaily} %
                  </span>
                </div>
                <div className="invest-data">
                  <div className="invest-data-amount g-2">
                    <div className="invest-data-history">
                      <div className="title">This Month</div>
                      <div className="amount">{DataTotalSalesMonthlyOnline}<span className="currency currency-usd"> IDR</span></div>
                    </div>
                    <div className="invest-data-history">
                      <div className="title">This Week</div>
                      <div className="amount">{DataTotalSalesWeeklyOnline}<span className="currency currency-usd"> IDR</span></div>
                    </div>
                  </div>
                  <div className="invest-data-ck">
                    <BalanceBarChart />
                  </div>
                </div>
              </PreviewAltCard>
            </Col>

            <Col xxl="6">
              <Row className="g-gs">
                <Col lg="6" xxl="12">
                  <PreviewAltCard>
                    <Totaltransaction
                      TotalTransaction={DataTotalTransaction}
                      TotalTransactionWeekly={DataTotalTransactionWeekly}
                      TotalTransactionMonthly={DataTotalTransactionMonthly}
                      PresentaseTotalTransaction={DataPresentaseTotalTransaction}
                      PresentaseTotalTransactionWeekly={DataPresentaseTotalTransactionWeekly}
                      PresentaseTotalTransactionMonthly={DataPresentaseTotalTransactionMonthly}
                    />
                  </PreviewAltCard>
                </Col>
                <Col lg="6" xxl="12">
                  <Row className="g-gs">
                    <Col sm="6" lg="12" xxl="6">
                      <PreviewAltCard>
                        <TotalSellingItem total_selling_items={DataTotalSellingItems} PresentaseTotalSellingItems={DataPresentaseTotalSellingItems} />
                      </PreviewAltCard>
                    </Col>
                    <Col sm="6" lg="12" xxl="6">
                      <PreviewAltCard>
                        <Laststock DataLastStock={DataLastStock} last_stock_date={DataLastStockDate} />
                      </PreviewAltCard>
                    </Col>
                  </Row>
                </Col>
              </Row>
            </Col>
            <Col xxl="6">
              <PreviewAltCard className="h-100">
                <SalesOverview totalSalesMonthly={DataTotalSalesMonthly} />
              </PreviewAltCard>
            </Col>

            <Col md="6" xxl="4">
              <Card>
                <TaskOverview TotalSTin={DataTotalSTin} TotalSTout={DataTotalSTout} TotalKasRealisasi={DataTotalKasRealisasi} />
              </Card>
            </Col>

            <Col xl="12" xxl="8">
              <Card>
                <RecentTransaction />
              </Card>
            </Col>
          </Row>
        </Block>
      </Content>
    </>
  );
};

export default StoreDashboard;
