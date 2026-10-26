import React, { useMemo, useState } from "react";
import DatePicker from "react-datepicker";

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const s = String(value).slice(0, 10);
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const toYmd = (value) => {
  if (!value) return "";
  const d = value instanceof Date ? value : toDate(value);
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const PRESETS = [
  {
    label: "Today",
    range: () => {
      const t = startOfDay(new Date());
      return [t, t];
    },
  },
  {
    label: "Yesterday",
    range: () => {
      const t = startOfDay(new Date());
      t.setDate(t.getDate() - 1);
      return [t, t];
    },
  },
  {
    label: "Last 7 Days",
    range: () => {
      const end = startOfDay(new Date());
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      return [start, end];
    },
  },
  {
    label: "Last 30 Days",
    range: () => {
      const end = startOfDay(new Date());
      const start = new Date(end);
      start.setDate(start.getDate() - 29);
      return [start, end];
    },
  },
  {
    label: "This Month",
    range: () => {
      const now = new Date();
      return [
        new Date(now.getFullYear(), now.getMonth(), 1),
        new Date(now.getFullYear(), now.getMonth() + 1, 0),
      ];
    },
  },
  {
    label: "Last Month",
    range: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return [start, end];
    },
  },
];

/**
 * Single-input date range picker (marketing.aspx / daterangepicker style).
 * Emits YYYY-MM-DD strings via onChange(startYmd, endYmd).
 */
export default function AppDateRangePicker({
  startDate,
  endDate,
  onChange,
  placeholder = "Select date range",
  className = "form-control form-control-sm",
  disabled = false,
  isClearable = true,
  monthsShown = 2,
  ...props
}) {
  const start = useMemo(() => toDate(startDate), [startDate]);
  const end = useMemo(() => toDate(endDate), [endDate]);
  const [open, setOpen] = useState(false);

  const applyRange = (nextStart, nextEnd) => {
    onChange?.(toYmd(nextStart), toYmd(nextEnd));
  };

  const CalendarContainer = ({ className: calClass, children }) => (
    <div className={`${calClass || ""} app-daterange-popper`}>
      <div className="app-daterange-presets">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            className="app-daterange-preset-btn"
            onClick={() => {
              const [s, e] = p.range();
              applyRange(s, e);
              setOpen(false);
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="app-daterange-calendars">{children}</div>
    </div>
  );

  return (
    <DatePicker
      selectsRange
      startDate={start}
      endDate={end}
      onChange={(update) => {
        const [s, e] = update || [];
        applyRange(s, e);
        if (s && e) setOpen(false);
      }}
      open={open}
      onInputClick={() => setOpen(true)}
      onClickOutside={() => setOpen(false)}
      shouldCloseOnSelect={false}
      monthsShown={monthsShown}
      showMonthDropdown
      showYearDropdown
      dropdownMode="select"
      scrollableYearDropdown
      yearDropdownItemNumber={25}
      dateFormat="dd/MM/yyyy"
      placeholderText={placeholder}
      className={className}
      disabled={disabled}
      isClearable={isClearable}
      calendarContainer={CalendarContainer}
      portalId="hrd-datepicker-portal"
      {...props}
    />
  );
}

export { toDate as parseAppDate, toYmd as formatAppDateYmd };
