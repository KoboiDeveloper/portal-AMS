import React, { useState,useEffect } from "react";
import { CardTitle } from "reactstrap";
import { Icon, TooltipComponent } from "../Component";
import { BarChart } from "../partials/charts/default/Charts";

const TotalSellingItem = ({total_selling_items, PresentaseTotalSellingItems}) => {
  
  // const [LastStock, setDataLastStock] = useState("0.00");
  // // setDataLastStock({Datalaststock})
  return (
    <React.Fragment>
      <div className="card-title-group align-start mb-2">
        <CardTitle>
          <h6 className="title">Total Selling Items</h6>
        </CardTitle>
        <div className="card-tools">
          <TooltipComponent
            icon="help-fill"
            iconClass="card-hint"
            direction="left"
            id="Tooltip-2x"
            text="Total Selling items"
          />
        </div>
      </div>
      <div className="align-end flex-sm-wrap g-4 flex-md-nowrap">
        <div className="nk-sale-data">
          <span className="amount"> {total_selling_items} qty</span>
          <span className="sub-title">
          <span className={ PresentaseTotalSellingItems < 0   ?  "change down text-danger" : "change up text-success" }>
              <Icon name= { PresentaseTotalSellingItems  === 0 ?  "" : PresentaseTotalSellingItems < 0   ?  "arrow-long-down" : "arrow-long-up" }></Icon> {PresentaseTotalSellingItems  === 0 ?  "~" : PresentaseTotalSellingItems }
                     % 
            </span>
            since last month
          </span>
        </div>
        <div className="nk-sales-ck">
          <BarChart />
        </div>
      </div>
    </React.Fragment>
  );
};
export default TotalSellingItem;
