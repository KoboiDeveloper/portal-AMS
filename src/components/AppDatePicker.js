import React from "react";
import DatePicker from "react-datepicker";

/**
 * Shared DatePicker with month/year dropdowns so users can jump years quickly.
 * Pass-through props can override any default.
 */
export default function AppDatePicker({
  showMonthDropdown = true,
  showYearDropdown = true,
  dropdownMode = "select",
  scrollableYearDropdown = true,
  yearDropdownItemNumber = 25,
  ...props
}) {
  return (
    <DatePicker
      showMonthDropdown={showMonthDropdown}
      showYearDropdown={showYearDropdown}
      dropdownMode={dropdownMode}
      scrollableYearDropdown={scrollableYearDropdown}
      yearDropdownItemNumber={yearDropdownItemNumber}
      {...props}
    />
  );
}
