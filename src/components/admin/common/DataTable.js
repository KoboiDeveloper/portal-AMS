import React from "react";
import { Card } from "reactstrap";
import {
  DataTableHead,
  DataTableBody,
  DataTableRow,
  DataTableItem,
} from "../../../components/Component";

const DataTable = ({ columns, rows, rowKey, actions }) => (
  <Card className="card-bordered card-stretch">
    <div className="card-inner p-0">
      <div className="table-responsive">
        <table className="table table-tranx">
          <DataTableHead>
            <DataTableRow>
              {columns.map((col) => (
                <DataTableItem key={col.key} className={col.className}>
                  {col.label}
                </DataTableItem>
              ))}
              {actions && <DataTableItem className="text-end">Actions</DataTableItem>}
            </DataTableRow>
          </DataTableHead>
          <DataTableBody>
            {!rows.length && (
              <DataTableRow>
                <DataTableItem colSpan={columns.length + (actions ? 1 : 0)}>
                  <span className="text-soft">No data found</span>
                </DataTableItem>
              </DataTableRow>
            )}
            {rows.map((row, idx) => (
              <DataTableRow key={rowKey ? rowKey(row, idx) : idx}>
                {columns.map((col) => (
                  <DataTableItem key={col.key} className={col.className}>
                    {col.render ? col.render(row) : row[col.key]}
                  </DataTableItem>
                ))}
                {actions && <DataTableItem className="text-end">{actions(row)}</DataTableItem>}
              </DataTableRow>
            ))}
          </DataTableBody>
        </table>
      </div>
    </div>
  </Card>
);

export default DataTable;
