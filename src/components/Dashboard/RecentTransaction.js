import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Icon from "../icon/Icon";
import { DataTableHead, DataTableItem, DataTableRow } from "../table/DataTable";
import { DropdownItem, DropdownMenu, DropdownToggle, UncontrolledDropdown } from "reactstrap";
import { useStoreScope } from "../../hooks/useStoreScope";
import { fetchStoreDashboard } from "../../lib/storeDashboardApi";
import { appPath } from "../../lib/paths";

const RecentTransaction = () => {
  const { storeId } = useStoreScope();
  const [DataTransaction, setDataTransaction] = useState([]);

  useEffect(() => {
    if (!storeId) return;

    fetchStoreDashboard("recentTrasaction", storeId)
      .then((response) => {
        if (response.data?.salesData) {
          setDataTransaction(response.data.salesData);
        } else {
          setDataTransaction([]);
        }
      })
      .catch((error) => {
        console.error("Recent transaction error:", error);
      });
  }, [storeId]);
  


  return (
    <React.Fragment>
      {" "}
      <div className="card-inner border-bottom">
        <div className="card-title-group">
          <div className="card-title">
            <h6 className="title">Recent Transaction</h6>
          </div>
          <div className="card-tools">
            <Link to={appPath("/store/sales-detail")} className="link">
              View All
            </Link>
          </div>
        </div>
      </div>
      
      {/* <Card   style={{maxHeight: "30rem",overflow: "auto"}}>  */}
      <div className="nk-tb-list">
        <DataTableHead>
          <DataTableRow>
            <span>id</span> 
          </DataTableRow>
          <DataTableRow>
            <span>Bill Code</span> 
          </DataTableRow>
          <DataTableRow size="sm">
            <span>Store</span>
          </DataTableRow>
          <DataTableRow size="lg">
            <span>Date</span>
          </DataTableRow>
          <DataTableRow size="lg">
            <span>Qty</span>
          </DataTableRow>
          <DataTableRow>
            <span>Net Sales</span>
          </DataTableRow>
          <DataTableRow size="sm">
            <span>Info</span>
          </DataTableRow>
          <DataTableRow>
            <span>&nbsp;</span>
          </DataTableRow>
        </DataTableHead>
        {DataTransaction.length > 0
         ? DataTransaction.map((item) => {
          return (

            <DataTableItem key={item.id}>
                 <DataTableRow>
                <div className="align-center">
                    <span className="tb-sub  tb-amount">
                    {item.id}  
                  </span>
                </div>
              </DataTableRow>
              <DataTableRow>
                <div className="align-center">
                  {/* <UserAvatar size="sm" theme="light" text={item.billingCode}></UserAvatar> */}
                  <span className="tb-sub ms-2">
                    {item.billingCode}  
                  </span>
                </div>
              </DataTableRow>
              <DataTableRow size="sm">
                <div className="user-card">
                  {/* <UserAvatar size="sm" theme={item.theme} text={findUpper(item.who)} /> */}
                  <div className="user-name">
                    <span className="tb-lead">{item.storeID}</span>
                  </div>
                </div>
              </DataTableRow>
              <DataTableRow size="lg">
                <span className="tb-sub">{item.TransactionDate}</span>
              </DataTableRow>
              <DataTableRow>
                <span className="tb-sub tb-amount">
                  {item.qty} <span>qty</span>
                </span>
              </DataTableRow>
              <DataTableRow>
                <span className="tb-sub tb-amount">
                  {item.net} 
                </span>
              </DataTableRow>
              <DataTableRow size="sm">
                {item.ecr === "1" ? (
                  <span className="tb-sub text-success">Ecr</span>
                ) : (
                  <span className="tb-sub text-danger">non Ecr</span>
                  // <Progress className="progress-sm w-80px" value={item.status}></Progress>
                )}
              </DataTableRow>
              <DataTableRow className="nk-tb-col-action">
                <UncontrolledDropdown>
                  <DropdownToggle tag="a" className="text-soft dropdown-toggle btn btn-sm btn-icon btn-trigger">
                    <Icon name="chevron-right"></Icon>
                  </DropdownToggle>
                  <DropdownMenu end className="dropdown-menu-xs">
                    <ul className="link-list-plain">
                      <li>
                        <DropdownItem
                          tag="a"
                          href="#dropdownitem"
                          onClick={(ev) => {
                            ev.preventDefault();
                          }}
                        >
                          View
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
                          Invoice
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
                          Print
                        </DropdownItem>
                      </li>
                    </ul>
                  </DropdownMenu>
                </UncontrolledDropdown>
              </DataTableRow>
            </DataTableItem>
          );
        }) :  
         null
        
        } 
      </div> 
      {DataTransaction.length > 0 ?
     null:  <div style={{alignSelf:"center", marginTop:"10px",paddingBottom:"10px"}}>
            
     No Transaction Today
      </div>  }
      {/* </Card> */}
    </React.Fragment>
  );
};

export default RecentTransaction;
