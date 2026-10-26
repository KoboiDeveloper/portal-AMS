import React, { useMemo, useState } from "react";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import {
  Block,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  BlockDes,
  Button,
  Icon,
} from "../../../components/Component";
import { Alert, Col, Form, FormGroup, Input, Label, Row, Spinner } from "reactstrap";
import AccessGuard from "../../../components/admin/AccessGuard";
import { hrdProcess } from "../../../services/hrd/hrd.service";
import { notifyResponse, isSuccess } from "../../../lib/response";
import { toast } from "react-toastify";

const defaultFields = [
  { name: "period", label: "Period (YYYY-MM)", type: "text", required: true },
  { name: "store_id", label: "Store ID (opsional)", type: "text" },
];

const HrdProcessPage = ({
  title,
  moduleCode,
  processPath,
  description,
  fields,
  dualActions = false,
}) => {
  const formFields = useMemo(() => (Array.isArray(fields) ? fields : defaultFields), [fields]);
  const [form, setForm] = useState(() =>
    formFields.reduce((acc, f) => {
      acc[f.name] = "";
      return acc;
    }, {})
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const run = async (extra = {}) => {
    setLoading(true);
    setMessage("");
    try {
      const payload = { ...form, ...extra };
      const res = await hrdProcess(processPath, payload);
      notifyResponse(res);
      if (isSuccess(res)) {
        toast.success(res?.responseMessage || "Process OK");
        setMessage(res?.responseMessage || "Process accepted");
      } else {
        setMessage(res?.responseMessage || "Process failed");
      }
    } catch (err) {
      setMessage(err?.responseMessage || err?.message || "Process failed");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    await run(dualActions ? { mode: "payroll" } : {});
  };

  const renderInput = (field) => {
    if (field.type === "select") {
      return (
        <Input
          type="select"
          id={field.name}
          value={form[field.name] || ""}
          onChange={(e) => setField(field.name, e.target.value)}
          required={!!field.required}
        >
          <option value="">-- Select --</option>
          {(field.options || []).map((opt) => (
            <option key={String(opt.value)} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Input>
      );
    }
    return (
      <Input
        id={field.name}
        type={field.type || "text"}
        value={form[field.name] || ""}
        onChange={(e) => setField(field.name, e.target.value)}
        required={!!field.required}
      />
    );
  };

  return (
    <AccessGuard moduleCode={moduleCode} permission="VIEW">
      <Head title={title} />
      <Content>
        <BlockHead size="sm">
          <BlockHeadContent>
            <BlockTitle page>{title}</BlockTitle>
            <BlockDes>
              <p className="text-soft">{description || "Jalankan proses HRD."}</p>
            </BlockDes>
          </BlockHeadContent>
        </BlockHead>
        <Block>
          <div className="card card-bordered">
            <div className="card-inner">
              {message && (
                <Alert color="info" className="alert-icon">
                  <Icon name="info" /> {message}
                </Alert>
              )}
              <Form onSubmit={onSubmit}>
                <Row className="g-3">
                  {formFields.map((field) => (
                    <Col xs="12" md="6" key={field.name}>
                      <FormGroup>
                        <Label for={field.name}>
                          {field.label}
                          {field.required ? " *" : ""}
                        </Label>
                        {renderInput(field)}
                      </FormGroup>
                    </Col>
                  ))}
                  <Col xs="12" className="d-flex flex-wrap gap-2">
                    {dualActions ? (
                      <>
                        <Button
                          color="primary"
                          type="button"
                          disabled={loading}
                          onClick={() => run({ mode: "payroll" })}
                        >
                          {loading ? <Spinner size="sm" /> : <Icon name="play" />}
                          <span className="ms-1">Generate Payroll</span>
                        </Button>
                        <Button
                          color="secondary"
                          type="button"
                          disabled={loading}
                          onClick={() => run({ mode: "prorate" })}
                        >
                          {loading ? <Spinner size="sm" /> : <Icon name="play" />}
                          <span className="ms-1">Generate Payroll Prorate</span>
                        </Button>
                      </>
                    ) : (
                      <Button color="primary" type="submit" disabled={loading}>
                        {loading ? <Spinner size="sm" /> : <Icon name="play" />}
                        <span className="ms-1">
                          {formFields.length === 0 ? "Process" : "Tarik / Jalankan"}
                        </span>
                      </Button>
                    )}
                  </Col>
                </Row>
              </Form>
            </div>
          </div>
        </Block>
      </Content>
    </AccessGuard>
  );
};

export default HrdProcessPage;
