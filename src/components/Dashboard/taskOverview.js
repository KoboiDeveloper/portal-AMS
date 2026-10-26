import React, { useState, useEffect } from "react";
import Icon from "../icon/Icon";
import { Alert, Badge } from "reactstrap";
import Simplebar from "simplebar-react";
import { useStoreScope } from "../../hooks/useStoreScope";
import { fetchStoreDashboard } from "../../lib/storeDashboardApi";

const TaskOverview = ({ TotalSTin, TotalSTout, TotalKasRealisasi }) => {
  const { storeId } = useStoreScope();
  const [tab, setTab] = useState("1");
  const [DataStin, setDataStin] = useState([]);
  const [DataStout, setDataStout] = useState([]);
  const [DatakasKecil, setDatakasKecil] = useState([]);
  const [DataNominalSetoran, setDataNominalSetoran] = useState("0");
  const [DataBatch, setDataBatch] = useState("");
  const [DataStatusSetoran, setDataStatusSetoran] = useState("");

  useEffect(() => {
    if (!storeId) return;

    fetchStoreDashboard("taskOverview", storeId)
      .then((response) => {
        if (response.data?.setoranData) {
          setDataNominalSetoran(response.data.setoranData.cash);
          setDataBatch(response.data.setoranData.batch);
          setDataStatusSetoran(response.data.setoranData.status);
        }
        setDataStin(response.data?.stinData || []);
        setDataStout(response.data?.stoutData || []);
        setDatakasKecil(response.data?.kaskecilData || []);
      })
      .catch((error) => {
        console.error("Task overview error:", error);
      });
  }, [storeId]);
  



  return (
    <React.Fragment>
      <div className="card-inner border-bottom">
        <div className="card-title">
          <h6 className="title">Task Overview</h6>
          <p>
            The Task overview of your Store.{" "}
            <a
              href="#all"
              onClick={(ev) => {
                ev.preventDefault();
              }}
            >
            
            </a>
          </p>
        </div>
      </div>
      <ul className="nav nav-tabs nav-tabs-card nav-tabs-xs">
        <li className="nav-item" onClick={() => setTab("1")}>
          <a
            href="#overview"
            onClick={(ev) => {
              ev.preventDefault();
            }}
            className={`nav-link${tab === "1" ? " active" : ""}`}
          >
            SETORAN
          </a>
        </li>
        <li className="nav-item" onClick={() => setTab("2")}>
          <a
            onClick={(ev) => {
              ev.preventDefault();
            }}
            className={`nav-link${tab === "2" ? " active" : ""}`}
            href="#year"
          >ST IN<Badge pill color="primary">{TotalSTin}</Badge>
          </a>
        </li>
        <li className="nav-item" onClick={() => setTab("3")}>
          <a
            className={`nav-link${tab === "3" ? " active" : ""}`}
            onClick={(ev) => {
              ev.preventDefault();
            }}
            href="#all"
          >ST OUT<Badge pill color="primary">{TotalSTout}</Badge>
          </a>
        </li>
        <li className="nav-item" onClick={() => setTab("4")}>
          <a
            className={`nav-link${tab === "4" ? " active" : ""}`}
            onClick={(ev) => {
              ev.preventDefault();
            }}
            href="#all"
          >KAS<Badge pill color="primary">{TotalKasRealisasi}</Badge>
          </a>
        </li>
      </ul>
      <Simplebar className="nk-msg-list" style={{maxHeight: "350px", overflow: "auto"}}>

      <div className="card-inner border-bottom" >
        {tab === "1" && (
          <div className={`tab-pane${tab === "1" && " active"}`}>
           <div className="invest-ov gy-2">
             
              <div className="invest-ov-details">
              <div className="invest-ov-stats"  style={{width: "50%"}}>
                  <div> 
                    <span  style={{fontSize: "1rem", fontWeight:"bold", color:"rgb(133 117 246)"}}>{DataStatusSetoran}</span> 
                  </div>
                  <div className="title">STATUS PEMBAYARAN</div>
                </div>
                <div className="invest-ov-stats"  style={{width: "50%"}}>
                  <div> 
                    <span  style={{fontSize: "1rem", fontWeight:"bold", color:"rgb(133 117 246)"}}>{DataBatch}</span> 
                  </div>
                  <div className="title">BATCH</div>
                </div>
              </div> 
              <div className="invest-ov-stats">
                  <div>
                    <span   style={{fontSize: "1.2rem"}}>{DataNominalSetoran} IDR</span> 
                  </div>
                  <div className="title">TOTAL CASH</div>
                </div>
                {DataStatusSetoran == "BELUM TRANSFER" ?   
                <Alert  className="alert-icon" color="warning">
                <Icon name="alert-circle" />
                <strong>Transaction has not been paid</strong>. your today transaction is incompleted.
              </Alert>: 
              <Alert  className="alert-icon" color="primary">
                <Icon name="alert-circle" />
                <strong>Transaction has been paid</strong>. your today transaction is completed.
              </Alert>}
            </div> 
        
          </div>
        )}

        {tab === "2" && (
          <div className={`tab-pane${tab === "2" && " active"}`}  >
         {DataStin.length > 0
         ? DataStin.map((item) => {
          return (
            <div className="invest-ov gy-2"> 
              <div className="invest-ov-details">
                <div className="invest-ov-info" style={{width: "40%"}}>
                  <div  style={{fontSize: "1rem"}}>
                    {item.pengirim} 
                    {/* <span className="currency currency-usd">USD</span> */}
                  </div>
                  <div className="title">Sender</div>
                </div>
                <div className="invest-ov-stats">
                  <div>
                    <span   style={{fontSize: "1rem"}}>{item.qtyOut} </span> 
                  </div>
                  <div className="title">QTY</div>
                </div>
                <div className="invest-ov-stats">
                  <div>
                    <span  style={{fontSize: "1rem"}}>{item.tglOut}</span> 
                  </div>
                  <div className="title">SENDING DATE</div>
                </div>
              </div> 
            </div> 
           );
          }) :  
           null 
          } 
          </div>   
        )}

        {tab === "3" && (
          <div className={`tab-pane${tab === "3" && " active"}`}>
        {DataStout.length > 0
         ? DataStout.map((item) => {
          return (
            <div className="invest-ov gy-2"> 
              <div className="invest-ov-details">
                <div className="invest-ov-info" style={{width: "40%"}}>
                  <div  style={{fontSize: "1rem"}}>
                  {item.penerima} 
                    {/* <span className="currency currency-usd">USD</span> */}
                  </div>
                  <div className="title">Destination</div>
                </div>
                <div className="invest-ov-stats">
                  <div>
                    <span   style={{fontSize: "1rem"}}>  {item.qtyOut} </span> 
                  </div>
                  <div className="title">QTY</div>
                </div>
                <div className="invest-ov-stats">
                  <div>
                    <span  style={{fontSize: "1rem"}}>{item.tglOut} </span> 
                  </div>
                  <div className="title">SENDING DATE</div>
                </div>
              </div> 
            </div> 
             );
            }) :  
             null 
            } 
          </div>
        )}

      {tab === "4" && (
          <div className={`tab-pane${tab === "4" && " active"}`}>
     {DatakasKecil.length > 0
         ? DatakasKecil.map((item) => {
          return (
       <div className="invest-ov gy-2"> 
              <div className="invest-ov-details">
                <div className="invest-ov-info" style={{width: "70%"}}>
                  <div  style={{fontSize: "1rem"}}>
                 {item.noPengajuan}
                    {/* <span className="currency currency-usd">USD</span> */}
                  </div>
                  <div className="title">  {item.periode}</div>
                </div>
                <div className="invest-ov-stats" >
                  <div>
                    <span   style={{fontSize: "1rem"}}>{item.totalAmount}</span> 
                  </div>
                  <div className="title">Amount</div>
                </div> 
              </div>  
            </div> 
              );
            }) :  
             null 
            } 
          </div>
        )}
      </div>
      </Simplebar>
    </React.Fragment>
  );
};
export default TaskOverview;
