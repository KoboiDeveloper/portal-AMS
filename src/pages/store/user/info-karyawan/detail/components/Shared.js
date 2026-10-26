import React from "react";
import { Button, Col, Row } from "reactstrap";
import {
  Block,
  BlockBetween,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableItem,
  DataTableRow,
  Icon,
} from "../../../../../../components/Component";

export const TabBlock = ({ title, description, icon, onSave, children }) => (
  <Block>
    <BlockHead>
      <BlockBetween>
        <BlockHeadContent>
          <BlockTitle tag="h5" className="d-flex align-items-center gap-2">
            {icon ? <Icon name={icon} /> : null}
            <span>{title}</span>
          </BlockTitle>
          {description ? <p className="text-soft mb-0">{description}</p> : null}
        </BlockHeadContent>
        {onSave ? (
          <BlockHeadContent>
            <Button color="primary" size="sm" onClick={onSave}>
              <Icon name="save" />
              <span className="ms-1">Save</span>
            </Button>
          </BlockHeadContent>
        ) : null}
      </BlockBetween>
    </BlockHead>
    {children}
  </Block>
);

export const ProfileList = ({ items = [] }) => (
  <div className="profile-ud-list">
    {items.map(({ label, value }) => (
      <div className="profile-ud-item" key={label}>
        <div className="profile-ud wider">
          <span className="profile-ud-label">{label}</span>
          <span className="profile-ud-value">{value || "-"}</span>
        </div>
      </div>
    ))}
  </div>
);

export const SectionDivider = () => <div className="nk-divider divider md"></div>;

export const ProfileSection = ({ title, items, divider, topDivider }) => (
  <>
    {topDivider ? <SectionDivider /> : null}
    {divider ? (
      <BlockHead className="nk-block-head-line">
        <BlockTitle tag="h6" className="overline-title text-base">
          {title}
        </BlockTitle>
      </BlockHead>
    ) : (
      <h6 className="overline-title-alt mb-3">{title}</h6>
    )}
    <ProfileList items={items} />
  </>
);

export const NoteBlock = ({ title, text, topDivider }) => (
  <>
    {topDivider ? <SectionDivider /> : null}
    <div className={topDivider ? "" : "mt-3"}>
      <h6 className="overline-title-alt mb-2">{title}</h6>
      <div className="bq-note">
        <div className="bq-note-item">
          <div className="bq-note-text">
            <p className="mb-0">{text || "-"}</p>
          </div>
        </div>
      </div>
    </div>
  </>
);

export const ListSection = ({ title, icon, columns, rows, emptyText = "No data available", topDivider }) => (
  <>
    {topDivider ? <SectionDivider /> : null}
    <Block className={topDivider ? "" : "mt-4"}>
    <BlockHead size="sm">
      <BlockBetween>
        <BlockHeadContent>
          <BlockTitle tag="h6" className="d-flex align-items-center gap-2">
            {icon ? <Icon name={icon} /> : null}
            <span>{title}</span>
          </BlockTitle>
        </BlockHeadContent>
        <BlockHeadContent>
          <div className="d-flex gap-1">
            <Button color="danger" size="sm" outline disabled className="btn-icon">
              <Icon name="trash" />
            </Button>
            <Button color="primary" size="sm" disabled className="btn-icon">
              <Icon name="plus" />
            </Button>
          </div>
        </BlockHeadContent>
      </BlockBetween>
    </BlockHead>
    <DataTable className="card-bordered">
      <DataTableBody>
        <DataTableHead>
          <DataTableRow>
            <span className="sub-text">No</span>
          </DataTableRow>
          {columns.map((col) => (
            <DataTableRow key={col.key} size={col.size}>
              <span className="sub-text">{col.label}</span>
            </DataTableRow>
          ))}
          <DataTableRow className="nk-tb-col-tools text-end">
            <span className="sub-text">Action</span>
          </DataTableRow>
        </DataTableHead>
        {rows?.length ? (
          rows.map((row, index) => (
            <DataTableItem key={index}>
              <DataTableRow>
                <span>{index + 1}</span>
              </DataTableRow>
              {columns.map((col) => (
                <DataTableRow key={col.key} size={col.size}>
                  <span>{row[col.key] || "-"}</span>
                </DataTableRow>
              ))}
              <DataTableRow className="nk-tb-col-tools">
                <Button color="primary" size="xs" outline disabled>
                  <Icon name="edit" /> Edit
                </Button>
              </DataTableRow>
            </DataTableItem>
          ))
        ) : (
          <DataTableItem>
            <DataTableRow>
              <span className="text-soft">{emptyText}</span>
            </DataTableRow>
          </DataTableItem>
        )}
      </DataTableBody>
    </DataTable>
  </Block>
  </>
);

export const FormGrid = ({ children }) => <Row className="g-gs">{children}</Row>;

export const TwoColProfile = ({ left = [], right = [] }) => (
  <Row className="g-gs">
    <Col lg={6}>
      <ProfileList items={left} />
    </Col>
    <Col lg={6}>
      <ProfileList items={right} />
    </Col>
  </Row>
);
