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

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const YEAR_SPAN = 40;

const buildYears = () => {
  const now = new Date().getFullYear();
  const from = now - YEAR_SPAN;
  const to = now + 5;
  const years = [];
  for (let y = to; y >= from; y -= 1) years.push(y);
  return years;
};

const YEARS = buildYears();

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
 * Linked dual-month header:
 * - Left (From): only ‹ + month/year selects
 * - Right (To): only › + read-only month/year (always left+1)
 * Inner arrows removed so months stay adjacent and never overlap.
 */
function LinkedMonthHeader({
  monthDate,
  customHeaderCount = 0,
  decreaseMonth,
  increaseMonth,
  prevMonthButtonDisabled,
  nextMonthButtonDisabled,
  changeMonth,
  changeYear,
}) {
  const isLeft = customHeaderCount === 0;
  const isRight = customHeaderCount === 1;
  const label = isLeft ? "From" : "To";

  return (
    <div className="app-daterange-header">
      {isLeft ? (
        <button
          type="button"
          className="app-daterange-nav"
          onClick={decreaseMonth}
          disabled={prevMonthButtonDisabled}
          aria-label={`${label} previous month`}
        >
          ‹
        </button>
      ) : (
        <span className="app-daterange-nav-spacer" aria-hidden="true" />
      )}
      <div className="app-daterange-header-selects">
        {isLeft ? (
          <>
            <select
              className="react-datepicker__month-select"
              value={monthDate.getMonth()}
              aria-label={`${label} month`}
              onChange={(e) => changeMonth(Number(e.target.value))}
            >
              {MONTHS.map((name, idx) => (
                <option key={name} value={idx}>
                  {name}
                </option>
              ))}
            </select>
            <select
              className="react-datepicker__year-select"
              value={monthDate.getFullYear()}
              aria-label={`${label} year`}
              onChange={(e) => changeYear(Number(e.target.value))}
            >
              {!YEARS.includes(monthDate.getFullYear()) ? (
                <option value={monthDate.getFullYear()}>{monthDate.getFullYear()}</option>
              ) : null}
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </>
        ) : (
          <div className="app-daterange-header-readonly" aria-label={`${label} ${MONTHS[monthDate.getMonth()]} ${monthDate.getFullYear()}`}>
            <span>{MONTHS[monthDate.getMonth()]}</span>
            <span>{monthDate.getFullYear()}</span>
          </div>
        )}
      </div>
      {isRight ? (
        <button
          type="button"
          className="app-daterange-nav"
          onClick={increaseMonth}
          disabled={nextMonthButtonDisabled}
          aria-label={`${label} next month`}
        >
          ›
        </button>
      ) : (
        <span className="app-daterange-nav-spacer" aria-hidden="true" />
      )}
    </div>
  );
}

/**
 * Single-input date range picker (marketing.aspx / daterangepicker style).
 * Linked dual months (From | To+1) so hover range spans both calendars.
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
  const [openSeq, setOpenSeq] = useState(0);
  const [openToDate, setOpenToDate] = useState(() => {
    const t = startOfDay(new Date());
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });

  const applyRange = (nextStart, nextEnd) => {
    onChange?.(toYmd(nextStart), toYmd(nextEnd));
  };

  const openPicker = () => {
    if (disabled) return;
    const s = start || startOfDay(new Date());
    // Base month = start month; right panel is always base+1 (linked)
    setOpenToDate(new Date(s.getFullYear(), s.getMonth(), 1));
    setOpenSeq((n) => n + 1);
    setOpen(true);
  };

  const handleCalChange = (update) => {
    if (!Array.isArray(update)) return;
    const [s, e] = update;
    if (s && !e) {
      applyRange(startOfDay(s), null);
      return;
    }
    if (s && e) {
      const a = startOfDay(s);
      const b = startOfDay(e);
      if (a.getTime() <= b.getTime()) applyRange(a, b);
      else applyRange(b, a);
      setOpen(false);
    }
  };

  const showDual = monthsShown >= 2;

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
      <div className={`app-daterange-calendars${showDual ? "" : " is-single"}`}>
        <div className="app-daterange-cal-labels" aria-hidden="true">
          <div className="app-daterange-cal-label">From</div>
          {showDual ? <div className="app-daterange-cal-label">To</div> : null}
        </div>
        {children}
      </div>
    </div>
  );

  return (
    <DatePicker
      key={`range-${openSeq}`}
      selectsRange
      startDate={start}
      endDate={end}
      selected={start}
      onChange={(update) => {
        if (!open) {
          // Clear (X) on the input while closed
          const [s, e] = update || [];
          if (!s && !e) applyRange(null, null);
          return;
        }
        handleCalChange(update);
      }}
      open={open}
      onInputClick={openPicker}
      onClickOutside={() => setOpen(false)}
      shouldCloseOnSelect={false}
      dateFormat="dd/MM/yyyy"
      placeholderText={placeholder}
      className={className}
      disabled={disabled}
      isClearable={isClearable}
      monthsShown={showDual ? 2 : 1}
      openToDate={openToDate}
      onMonthChange={(d) => setOpenToDate(new Date(d.getFullYear(), d.getMonth(), 1))}
      renderCustomHeader={(hp) => <LinkedMonthHeader {...hp} />}
      calendarContainer={CalendarContainer}
      portalId="hrd-datepicker-portal"
      disabledKeyboardNavigation
      {...props}
    />
  );
}

export { toDate as parseAppDate, toYmd as formatAppDateYmd };
