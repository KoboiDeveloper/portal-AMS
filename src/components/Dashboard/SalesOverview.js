import React, { useState, useEffect } from "react";
import { DropdownItem, DropdownToggle, DropdownMenu, UncontrolledDropdown } from "reactstrap";
import { Icon } from "../Component";
import { Line } from "react-chartjs-2";
import { useStoreScope } from "../../hooks/useStoreScope";
import { fetchStoreDashboard } from "../../lib/storeDashboardApi";

const SalesOverview = ({ totalSalesMonthly }) => {
  const { storeId } = useStoreScope();
  const [DataBulan, setDataBulan] = useState([]);
  const [DataTotSales, setDataTotSales] = useState([]);

  useEffect(() => {
    if (!storeId) return;

    fetchStoreDashboard("salesOverviewChart", storeId)
      .then((response) => {
        const row = response.data?.ChartsalesData?.[0];
        if (!row) return;
        setDataBulan(JSON.parse(row.bulan));
        setDataTotSales(JSON.parse(row.totSales));
      })
      .catch((error) => {
        console.error("Sales overview chart error:", error);
      });
  }, [storeId]);
    
    const salesOverview = {
      labels:  DataBulan,
      dataUnit: "BTC",
      datasets: [
        {
          label: "Sales Overview",
          fill: true,
          backgroundColor: "rgba(101,118,255,0.25)",
          borderColor: "#798bff",
          barPercentage: 0.1,
          categoryPercentage: 0.1,
          borderWidth: 4,
          lineTension: 0.1,
          pointBorderColor: "transparent",
          pointBackgroundColor: "transparent",
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: "rgba(101,118,255,0.25)",
          pointBorderWidth: 2,
          pointHoverRadius: 3,
          pointHoverBorderWidth: 2,
          pointRadius: 3,
          pointHitRadius: 3,
          data:  DataTotSales ,
        }, 
      ],
    };
  
  return ( 
    <React.Fragment>
      <div className="card-title-group align-start gx-3 mb-3">
        <div className="card-title">
          <h6 className="title">Sales Overview</h6>
          <p>
            In 30 days sales of product Sales.{" "}
            <a
              href="#details"
              onClick={(ev) => {
                ev.preventDefault();
              }}
            >
              See Details
            </a>
          </p>
        </div>
        <div className="card-tools">
          <UncontrolledDropdown>
            <DropdownToggle tag="div" color="transparent">
              <a
                href="#toggle"
                onClick={(ev) => ev.preventDefault()}
                className="btn btn-primary btn-dim d-none d-sm-inline-flex"
              >
                <Icon className="d-none d-sm-inline" name="download-cloud" />
                <span>
                  <span className="d-none d-md-inline">Download</span> Report
                </span>
              </a>
              <a
                href="#toggle"
                onClick={(ev) => ev.preventDefault()}
                className="btn btn-primary btn-icon btn-dim d-sm-none"
              >
                <Icon name="download-cloud" />
              </a>
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
                    <span>Download Mini Version</span>
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
                    <span>Download Full Version</span>
                  </DropdownItem>
                </li>
                <li className="divider"></li>
                <li>
                  <DropdownItem
                    tag="a"
                    href="#dropdownitem"
                    onClick={(ev) => {
                      ev.preventDefault();
                    }}
                  >
                    <Icon name="opt-alt" />
                    <span>Options</span>
                  </DropdownItem>
                </li>
              </ul>
            </DropdownMenu>
          </UncontrolledDropdown>
        </div>
      </div>
      <div className="nk-sale-data-group align-center justify-between gy-3 gx-5">
        <div className="nk-sale-data">
          <span className="amount" style={{fontSize:"1.35rem"}}>{totalSalesMonthly} IDR</span>
        </div>
        <div className="nk-sale-data">
          <span className="amount sm">
             { new Date().toLocaleString('en-us',{month:'short', year:'numeric'})}
              
          </span>
        </div>
      </div>
      <div className="nk-sales-ck large pt-4">
      <Line 
      className="sales-overview-chart"
      data={salesOverview}
      options={{
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            enabled: true,
            displayColors: false,
            backgroundColor: "#eff6ff",
            titleFont: {
              size: '13px',
            },
            titleColor: "#6783b8",
            titleMarginBottom: 6,
            bodyColor: "#9eaecf",
            bodyFont: {
              size: '12px',
            },
            bodySpacing: 4,
            padding: 10,
            footerMarginTop: 0,

            callbacks: {
              title: function (context) {
                // Assuming the x value is in context[0].label
                const xLabel = context[0].label ? `Month ${context[0].label}` : '';
                return xLabel;
              },
              label: function (context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                return `Sales ${context.formattedValue}`;
              },
            },
          },
        },
        maintainAspectRatio: false,
        scales: {
          y: {
            display: true,
            ticks: {
              beginAtZero: true,
              color: "#9eaecf",
              font: {
                size: '11px',
              },

              padding: 10,
              min: 100,
              stepSize: 100000000,
            },
            grid: {
              tickMarkLength: 0,
            },
          },
          x: {
            display: true,
            ticks: {
              color: "#9eaecf",
              font: {
                size: '9px',
              },
              source: "auto",
              padding: 10,
            },
            grid: {
              color: "transparent",
              tickMarkLength: 0,
              zeroLineColor: "transparent",
            },
          },
        },
      }}
 
 
        /> 
      </div>
    </React.Fragment>
  );
};
export default SalesOverview;
