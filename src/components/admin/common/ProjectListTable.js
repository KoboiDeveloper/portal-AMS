import React, { useCallback, useMemo, useState } from "react";
import {
  UncontrolledDropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  Badge,
  Spinner,
} from "reactstrap";
import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableRow,
  DataTableItem,
  UserAvatar,
  Icon,
  PaginationComponent,
} from "../../../components/Component";
import { findUpper } from "../../../utils/Utils";

const avatarThemes = ["primary", "pink", "purple", "success", "info", "warning", "danger"];

/** SP columns are often UPPERCASE while configs use lowercase. */
const rowVal = (row, key) => {
  if (!row || key == null || key === "") return undefined;
  if (Object.prototype.hasOwnProperty.call(row, key)) {
    const v = row[key];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  const found = Object.keys(row).find((k) => k.toLowerCase() === String(key).toLowerCase());
  return found != null ? row[found] : undefined;
};

const themeForRow = (row, idField) => {
  const id = String(rowVal(row, idField) || "");
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return avatarThemes[Math.abs(hash) % avatarThemes.length];
};

const getSortIcon = (key, sortConfig) => {
  if (sortConfig.key !== key) return "unsorted";
  return sortConfig.direction === "asc" ? "arrow-up" : "arrow-down";
};

const toSortable = (value) => {
  if (value == null || value === "") return { kind: "empty", raw: "" };
  if (typeof value === "number" && Number.isFinite(value)) return { kind: "num", raw: value };
  if (typeof value === "boolean") return { kind: "num", raw: value ? 1 : 0 };
  const s = String(value).trim();
  const asNum = Number(s.replace(/,/g, ""));
  if (s !== "" && Number.isFinite(asNum) && /^-?\d+(\.\d+)?$/.test(s.replace(/,/g, ""))) {
    return { kind: "num", raw: asNum };
  }
  // ISO / yyyy-mm-dd or dd/mm/yyyy
  const iso = Date.parse(s);
  if (!Number.isNaN(iso) && /\d{4}-\d{2}-\d{2}|\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}/.test(s)) {
    return { kind: "num", raw: iso };
  }
  return { kind: "str", raw: s.toLowerCase() };
};

const compareRows = (a, b, key, direction) => {
  const left = toSortable(rowVal(a, key));
  const right = toSortable(rowVal(b, key));
  let cmp = 0;
  if (left.kind === "empty" && right.kind !== "empty") cmp = 1;
  else if (right.kind === "empty" && left.kind !== "empty") cmp = -1;
  else if (left.kind === "num" && right.kind === "num") cmp = left.raw - right.raw;
  else cmp = String(left.raw).localeCompare(String(right.raw), "id", { numeric: true, sensitivity: "base" });
  return direction === "desc" ? -cmp : cmp;
};

const parseSumNumber = (value) => {
  if (value == null || value === "") return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const n = Number(String(value).replace(/,/g, "").replace(/\s/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const ProjectListTable = ({
  columns,
  rows,
  rowKey,
  idField,
  getRowClassName,
  onEdit,
  editLabel = "Edit",
  onDelete,
  canEdit,
  canDelete,
  extraActions = [],
  currentPage,
  itemPerPage,
  onPageChange,
  defaultSort = null,
  loading = false,
  onRowClick,
  stickyHeader = false,
  /** If set with stickyHeader, table body scrolls inside; omit to avoid double page scroll. */
  stickyMaxHeight = null,
  /** Column keys to sum across all loaded rows (footer row). */
  footerSumKeys = [],
}) => {
  const [sortConfig, setSortConfig] = useState(() =>
    defaultSort && defaultSort.key
      ? { key: defaultSort.key, direction: defaultSort.direction || "asc" }
      : { key: null, direction: "asc" }
  );

  const hasSortable = columns.some((c) => c.sortable);

  const handleSort = useCallback(
    (key) => {
      setSortConfig((prev) => {
        if (prev.key === key) {
          return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
        }
        return { key, direction: "asc" };
      });
      if (typeof onPageChange === "function") onPageChange(1);
    },
    [onPageChange]
  );

  const sortedRows = useMemo(() => {
    if (!sortConfig.key) return rows;
    const next = [...(rows || [])];
    next.sort((a, b) => compareRows(a, b, sortConfig.key, sortConfig.direction));
    return next;
  }, [rows, sortConfig]);

  const indexOfLast = currentPage * itemPerPage;
  const indexOfFirst = indexOfLast - itemPerPage;
  const currentItems = sortedRows.slice(indexOfFirst, indexOfLast);

  const sumKeySet = useMemo(
    () => new Set((footerSumKeys || []).map((k) => String(k).toLowerCase())),
    [footerSumKeys]
  );

  const footerSums = useMemo(() => {
    if (!sumKeySet.size) return null;
    const totals = {};
    sumKeySet.forEach((k) => {
      totals[k] = 0;
    });
    (sortedRows || []).forEach((row) => {
      sumKeySet.forEach((k) => {
        const found = Object.keys(row || {}).find((x) => String(x).toLowerCase() === k);
        totals[k] += parseSumNumber(found != null ? row[found] : undefined);
      });
    });
    return totals;
  }, [sortedRows, sumKeySet]);

  const showActionsCol = canEdit || canDelete || extraActions.length > 0 || onRowClick;

  return (
    <DataTable className={`card-stretch${stickyHeader ? " project-list-sticky" : ""}`}>
      <DataTableBody
        className={stickyHeader ? "project-list-sticky__body" : undefined}
        style={
          stickyHeader && stickyMaxHeight
            ? { maxHeight: stickyMaxHeight, overflow: "auto" }
            : undefined
        }
      >
        <DataTableHead className={stickyHeader ? "project-list-sticky__head" : undefined}>
          {columns.map((col) => (
            <DataTableRow key={col.key} size={col.size || undefined}>
              {col.sortable ? (
                <button
                  type="button"
                  className={`admin-sort-trigger${sortConfig.key === col.key ? " is-active" : ""}`}
                  onClick={() => handleSort(col.key)}
                >
                  <span className="sub-text">{col.label}</span>
                  {hasSortable ? <Icon name={getSortIcon(col.key, sortConfig)} /> : null}
                </button>
              ) : (
                <span className="sub-text">{col.label}</span>
              )}
            </DataTableRow>
          ))}
          {showActionsCol && (
            <DataTableRow className="nk-tb-col-tools text-end">
              <span className="sub-text" style={{ whiteSpace: "nowrap" }}>
                Actions
              </span>
            </DataTableRow>
          )}
        </DataTableHead>
        {!loading &&
          currentItems.length > 0 &&
          currentItems.map((row, idx) => (
            <DataTableItem
              key={rowKey ? rowKey(row, idx) : idx}
              className={[onRowClick ? "marcomm-row-clickable" : "", typeof getRowClassName === "function" ? getRowClassName(row, idx) : ""]
                .filter(Boolean)
                .join(" ") || undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              style={onRowClick ? { cursor: "pointer" } : undefined}
            >
              {columns.map((col) => {
                if (col.type === "index") {
                  return (
                    <DataTableRow key={col.key} size={col.size}>
                      <span>{indexOfFirst + idx + 1}</span>
                    </DataTableRow>
                  );
                }

                if (col.type === "title") {
                  const title = rowVal(row, col.titleKey || col.key) || "-";
                  const subtitle = rowVal(row, col.subtitleKey) || rowVal(row, idField) || "";
                  return (
                    <DataTableRow key={col.key}>
                      <a
                        href="#store"
                        className="project-title"
                        onClick={(e) => {
                          e.preventDefault();
                          if (onRowClick) onRowClick(row);
                        }}
                      >
                        <UserAvatar
                          className="sq"
                          theme={col.avatarTheme || themeForRow(row, idField)}
                          text={findUpper(title)}
                        />
                        <div className="project-info">
                          <h6 className="title">{title}</h6>
                          {subtitle && <span className="sub-text">{subtitle}</span>}
                        </div>
                      </a>
                    </DataTableRow>
                  );
                }

                if (col.type === "badge") {
                  const active = rowVal(row, col.key);
                  const isActive =
                    active === true ||
                    active === 1 ||
                    active === "1" ||
                    String(active).toLowerCase() === "true";
                  return (
                    <DataTableRow key={col.key} size={col.size}>
                      <Badge className="badge-dim" color={isActive ? "success" : "secondary"}>
                        <Icon name={isActive ? "check-circle" : "cross-circle"} />
                        <span>{isActive ? "Active" : "Inactive"}</span>
                      </Badge>
                    </DataTableRow>
                  );
                }

                return (
                  <DataTableRow key={col.key} size={col.size}>
                    <span>{col.render ? col.render(row) : rowVal(row, col.key) ?? "-"}</span>
                  </DataTableRow>
                );
              })}
              {showActionsCol && (
                <DataTableRow
                  className="nk-tb-col-tools text-end"
                  onClick={onRowClick ? (e) => e.stopPropagation() : undefined}
                >
                  <ul className="nk-tb-actions gx-1">
                    <li>
                      <UncontrolledDropdown>
                        <DropdownToggle tag="a" className="text-soft dropdown-toggle btn btn-icon btn-trigger">
                          <Icon name="more-h" />
                        </DropdownToggle>
                        <DropdownMenu end>
                          <ul className="link-list-opt no-bdr">
                            {onRowClick && (
                              <li>
                                <DropdownItem
                                  tag="a"
                                  href="#detail"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    onRowClick(row);
                                  }}
                                >
                                  <Icon name="eye" />
                                  <span>Detail</span>
                                </DropdownItem>
                              </li>
                            )}
                            {canEdit && (
                              <li>
                                <DropdownItem
                                  tag="a"
                                  href="#edit"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    onEdit(row);
                                  }}
                                >
                                  <Icon name="edit" />
                                  <span>{editLabel}</span>
                                </DropdownItem>
                              </li>
                            )}
                            {extraActions.map((action) => (
                              <li key={action.key}>
                                <DropdownItem
                                  tag="a"
                                  href={`#${action.key}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    action.onClick(row);
                                  }}
                                >
                                  <Icon name={action.icon || "lock-alt"} />
                                  <span>{typeof action.label === "function" ? action.label(row) : action.label}</span>
                                </DropdownItem>
                              </li>
                            ))}
                            {canDelete && (
                              <li>
                                <DropdownItem
                                  tag="a"
                                  href="#delete"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    onDelete(row);
                                  }}
                                >
                                  <Icon name="trash" />
                                  <span>Delete</span>
                                </DropdownItem>
                              </li>
                            )}
                          </ul>
                        </DropdownMenu>
                      </UncontrolledDropdown>
                    </li>
                  </ul>
                </DataTableRow>
              )}
            </DataTableItem>
          ))}
        {!loading && footerSums && sortedRows.length > 0 ? (
          <DataTableItem className="project-list-footer-row">
            {columns.map((col, colIdx) => {
              const keyLower = String(col.key || "").toLowerCase();
              const isSum = sumKeySet.has(keyLower);
              let text = "";
              if (colIdx === 0 && !isSum) text = "TOTAL";
              else if (isSum) {
                text = (footerSums[keyLower] || 0).toLocaleString("id-ID", {
                  maximumFractionDigits: 0,
                });
              }
              return (
                <DataTableRow key={`ft-${col.key}`} size={col.size}>
                  <span className="fw-bold">{text || (isSum ? "0" : "")}</span>
                </DataTableRow>
              );
            })}
            {showActionsCol ? <DataTableRow className="nk-tb-col-tools" /> : null}
          </DataTableItem>
        ) : null}
      </DataTableBody>
      <div className="card-inner">
        {loading ? (
          <div className="admin-table-status">
            <Spinner size="sm" color="primary" />
            <span className="text-silent">Loading...</span>
          </div>
        ) : sortedRows.length > 0 ? (
          <PaginationComponent
            itemPerPage={itemPerPage}
            totalItems={sortedRows.length}
            paginate={onPageChange}
            currentPage={currentPage}
          />
        ) : (
          <div className="admin-table-status">
            <span className="text-silent">No data found</span>
          </div>
        )}
      </div>
    </DataTable>
  );
};

export default ProjectListTable;
