import React, { useState } from "react";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import {
  Block,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  BlockDes,
  Icon,
  Button,
} from "../../../components/Component";
import { Alert, Col, Form, FormGroup, Input, Label, Row } from "reactstrap";
import AccessGuard from "../../../components/admin/AccessGuard";
import { createHrdService } from "../../../services/hrd/hrd.service";
import { hrdRptSlipGajiConfig } from "./hrdConfigs";

const service = createHrdService("rpt/slip-gaji", { crud: false });

const HrdSlipGajiPage = () => {
  const fields = hrdRptSlipGajiConfig.fields;
  const [form, setForm] = useState({ emp_code: "", year: "", month: "" });
  const [hint, setHint] = useState("");

  const onSearch = async (e) => {
    e.preventDefault();
    setHint("");
    try {
      const res = await service.list({
        search: form.emp_code,
        year: form.year,
        month: form.month,
      });
      setHint(res?.responseMessage || "Crystal export not available yet");
    } catch (err) {
      setHint(err?.responseMessage || "Crystal export not available yet");
    }
  };

  return (
    <AccessGuard moduleCode="HRD_RPT_SLIP_GAJI" permission="VIEW">
      <Head title="Slip Gaji" />
      <Content>
        <BlockHead size="sm">
          <BlockHeadContent>
            <BlockTitle page>Slip Gaji</BlockTitle>
            <BlockDes>
              <p className="text-soft">
                Filter sama dengan legacy rptslipgaji.aspx (Employee, Year, Month). Export Crystal
                belum diaktifkan.
              </p>
            </BlockDes>
          </BlockHeadContent>
        </BlockHead>
        <Block>
          <div className="card card-bordered">
            <div className="card-inner">
              <Alert color="warning" className="alert-icon">
                <Icon name="alert-circle" /> Export Crystal belum tersedia di web baru. Filter &amp; UI
                tetap tersedia.
              </Alert>
              <Form onSubmit={onSearch}>
                <Row className="g-3">
                  {fields.map((field) => (
                    <Col xs="12" md="4" key={field.name}>
                      <FormGroup>
                        <Label>{field.label}</Label>
                        {field.type === "select" ? (
                          <Input
                            type="select"
                            value={form[field.name] || ""}
                            onChange={(e) =>
                              setForm((prev) => ({ ...prev, [field.name]: e.target.value }))
                            }
                            required={!!field.required}
                          >
                            <option value="">-- Select --</option>
                            {(field.options || []).map((opt) => (
                              <option key={String(opt.value)} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </Input>
                        ) : (
                          <Input
                            value={form[field.name] || ""}
                            onChange={(e) =>
                              setForm((prev) => ({ ...prev, [field.name]: e.target.value }))
                            }
                            required={!!field.required}
                          />
                        )}
                      </FormGroup>
                    </Col>
                  ))}
                  <Col xs="12">
                    <Button color="primary" type="submit">
                      <Icon name="printer" />
                      <span className="ms-1">Print</span>
                    </Button>
                  </Col>
                </Row>
                {hint && <p className="text-soft mt-3 mb-0">{hint}</p>}
              </Form>
            </div>
          </div>
        </Block>
      </Content>
    </AccessGuard>
  );
};

export default HrdSlipGajiPage;
