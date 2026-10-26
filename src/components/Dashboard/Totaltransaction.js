import React from "react";
import { CardTitle } from "reactstrap";
import { Icon, TooltipComponent } from "../Component";
import { BarChart } from "../partials/charts/default/Charts";

const Totaltransaction = ({TotalTransaction
                    ,TotalTransactionWeekly
                    ,TotalTransactionMonthly
                    ,PresentaseTotalTransaction
                    ,PresentaseTotalTransactionWeekly
                    ,PresentaseTotalTransactionMonthly}) => {
  return (
    <React.Fragment>
      <div className="card-title-group align-start mb-2">
        <CardTitle>
          <h6 className="title">Total Transaction</h6>
          <p>In last 30 Days.</p>
        </CardTitle>
        <div className="card-tools">
          <TooltipComponent
            icon="help-fill"
            iconClass="card-hint"
            direction="left"
            id="tooltip-1"
            text="Total Transaction in this month"
          />
        </div>
      </div>
      <div className="align-end gy-3 gx-5 flex-wrap flex-md-nowrap flex-lg-wrap flex-xxl-nowrap">
        <div className="nk-sale-data-group flex-md-nowrap g-4">
          <div className="nk-sale-data">
            <span className="amount">
             {TotalTransactionMonthly}{" "}
              <span className={ PresentaseTotalTransactionMonthly < 0   ?  "change down text-danger" : "change up text-success" }>
              <Icon name= { PresentaseTotalTransactionMonthly  === 0 ?  "" : PresentaseTotalTransactionMonthly < 0   ?  "arrow-long-down" : "arrow-long-up" }></Icon> {PresentaseTotalTransactionMonthly  === 0 ?  "~" : PresentaseTotalTransactionMonthly }
                     %
              </span>
            </span>
            <span className="sub-title">This Month</span>
          </div>
          <div className="nk-sale-data">
            <span className="amount">
            {TotalTransactionWeekly}{" "}
            <span className={ PresentaseTotalTransactionWeekly < 0   ?  "change down text-danger" : "change up text-success" }>
              <Icon name= { PresentaseTotalTransactionWeekly  === 0 ?  "" : PresentaseTotalTransactionWeekly < 0   ?  "arrow-long-down" : "arrow-long-up" }></Icon> {PresentaseTotalTransactionWeekly  === 0 ?  "~" : PresentaseTotalTransactionWeekly }
                     % 
              </span>
            </span>
            <span className="sub-title">This Week</span>
          </div>
          <div className="nk-sale-data">
            <span className="amount">
            {TotalTransaction}{" "}
            <span className={ PresentaseTotalTransaction < 0   ?  "change down text-danger" : "change up text-success" }>
              <Icon name= { PresentaseTotalTransaction  === 0 ?  "" : PresentaseTotalTransaction < 0   ?  "arrow-long-down" : "arrow-long-up" }></Icon> {PresentaseTotalTransaction  === 0 ?  "~" : PresentaseTotalTransaction }
                     %  
              </span>
            </span>
            <span className="sub-title">This Day</span>
          </div>
        </div>
        <div className="nk-sales-ck sales-revenue">
          <BarChart sales />
        </div>
      </div>
    </React.Fragment>
  );
};
export default Totaltransaction;
