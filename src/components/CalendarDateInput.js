import React, { forwardRef } from "react";
import { Icon } from "./Component";

const CalendarDateInput = forwardRef(({ value, onClick, onChange, className = "form-control date-picker" }, ref) => (
  <div className="form-control-wrap" onClick={onClick} ref={ref}>
    <div className="form-icon form-icon-left">
      <Icon name="calendar" />
    </div>
    <input className={className} type="text" value={value || ""} onChange={onChange} readOnly />
  </div>
));

CalendarDateInput.displayName = "CalendarDateInput";

export default CalendarDateInput;
