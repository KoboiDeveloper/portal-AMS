import React, { useState } from "react";
import Head from "../../../../layout/head/Head";
import Content from "../../../../layout/content/Content";
import { Button, Input, Alert, Card } from "reactstrap";
import {
  Block,
  BlockBetween,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  BlockDes,
  Icon,
} from "../../../../components/Component";
import { accessService } from "../../../../services/access.service";
import { getAuthNik } from "../../../../lib/auth";
import { isSuccess } from "../../../../lib/response";

const AccessCheckPage = () => {
  const [form, setForm] = useState({
    nik: getAuthNik(),
    module_code: "SEC_ROLE",
    permission_code: "VIEW",
    branch_id: "",
    store_id: "",
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCheck = async () => {
    setLoading(true);
    try {
      const res = await accessService.check({
        nik: form.nik,
        module_code: form.module_code,
        permission_code: form.permission_code,
        branch_id: form.branch_id || null,
        store_id: form.store_id || null,
      });
      setResult(res);
    } catch (err) {
      setResult(err);
    } finally {
      setLoading(false);
    }
  };

  const allowed =
    result &&
    isSuccess(result) &&
    (result.allowed === true ||
      result.isAllowed === true ||
      result.data?.allowed === true ||
      result.data?.is_allowed === true);

  const fields = ["nik", "module_code", "permission_code", "branch_id", "store_id"];

  return (
    <>
      <Head title="Access Check" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page tag="h3">Access Check Tester</BlockTitle>
              <BlockDes className="text-soft">
                Test apakah user punya akses module dan permission tertentu
              </BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <ul className="nk-block-tools g-3 align-items-center">
                <li className="nk-block-tools-opt">
                  <Button color="primary" onClick={handleCheck} disabled={loading}>
                    <Icon name="check-circle" />
                    <span>{loading ? "Checking..." : "Check Access"}</span>
                  </Button>
                </li>
              </ul>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Block>
          <Card className="card-bordered card-stretch">
            <div className="card-inner">
              <div className="row g-3 align-items-end">
                {fields.map((key) => (
                  <div className="col-md-4 col-lg" key={key}>
                    <label className="form-label">{key.replace(/_/g, " ")}</label>
                    <Input
                      bsSize="sm"
                      value={form[key]}
                      onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              {result && (
                <div className="mt-4">
                  <Alert color={allowed ? "success" : "danger"} className="alert-icon">
                    <Icon name={allowed ? "check-circle" : "cross-circle"} />
                    {allowed ? "ALLOWED" : "DENIED"} — {result.responseMessage}
                  </Alert>
                  <pre className="bg-lighter p-3 rounded small mb-0">{JSON.stringify(result, null, 2)}</pre>
                </div>
              )}
            </div>
          </Card>
        </Block>
      </Content>
    </>
  );
};

export default AccessCheckPage;
