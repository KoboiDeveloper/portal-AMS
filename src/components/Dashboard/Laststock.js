import React, { useState,useEffect } from "react";
import { CardTitle } from "reactstrap";
import { Icon, TooltipComponent } from "../Component";
import { BarChart } from "../partials/charts/default/Charts";

const Laststock = ({DataLastStock, last_stock_date}) => {
  
  // const [LastStock, setDataLastStock] = useState("0.00");
  // // setDataLastStock({Datalaststock})
  return (
    <React.Fragment>
      <div className="card-title-group align-start mb-2">
        <CardTitle>
          <h6 className="title">Last Stock</h6>
        </CardTitle>
        <div className="card-tools">
          <TooltipComponent
            icon="help-fill"
            iconClass="card-hint"
            direction="left"
            id="Tooltip-23"
            text="Last Stock in Store"
          />
        </div>
      </div>
      <div className="align-end flex-sm-wrap g-4 flex-md-nowrap">
        <div className="nk-sale-data">
          <span className="amount"> {DataLastStock} qty</span>
          <span className="sub-title">
            <span className="change down text-danger">
              <Icon name="arrow-long-right" />
              {/* 1.93% */}
            </span>
            last stock for {last_stock_date}
          </span>
        </div>
        <div className="nk-sales-ck">
          <BarChart />
        </div>
      </div>
    </React.Fragment>
  );
};
export default Laststock;
