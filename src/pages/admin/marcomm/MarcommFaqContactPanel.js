import React, { useCallback, useEffect, useState } from "react";
import { Spinner } from "reactstrap";
import { Button, Icon } from "../../../components/Component";
import {
  getMarcommContactInfo,
  updateMarcommContactInfo,
} from "../../../services/marcomm/marcomm.service";
import { extractRow, notifyResponse } from "../../../lib/response";

/** Faq.aspx left panel — phone / Instagram / email */
const MarcommFaqContactPanel = ({ canUpdate = false }) => {
  const [form, setForm] = useState({ phone_number: "", instagram: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getMarcommContactInfo();
      const row = extractRow(res) || {};
      setForm({
        phone_number:
          row.phone_number ?? row.phoneNumber ?? row.PHONENUMBER ?? row.phone ?? "",
        instagram: row.instagram ?? row.INSTAGRAM ?? "",
        email: row.email ?? row.EMAIL ?? "",
      });
    } catch (err) {
      notifyResponse(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onChange = (name) => (e) => setForm((prev) => ({ ...prev, [name]: e.target.value }));

  const onSave = async () => {
    if (!canUpdate) return;
    setSaving(true);
    try {
      const res = await updateMarcommContactInfo({
        phone_number: form.phone_number,
        phone: form.phone_number,
        instagram: form.instagram,
        email: form.email,
      });
      notifyResponse(res, "Contact info updated");
    } catch (err) {
      notifyResponse(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card card-bordered">
      <div className="card-inner">
        <div className="d-flex flex-wrap align-items-center justify-content-between g-2 mb-3">
          <h6 className="title mb-0">Contact Info</h6>
          <Button
            color="primary"
            size="sm"
            disabled={!canUpdate || saving || loading}
            onClick={onSave}
          >
            {saving ? <Spinner size="sm" className="me-1" /> : <Icon name="save" className="me-1" />}
            Update Contact
          </Button>
        </div>
        {loading ? (
          <div className="text-center py-3">
            <Spinner size="sm" color="primary" />
          </div>
        ) : (
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label" htmlFor="faq-contact-phone">
                Phone Number
              </label>
              <input
                id="faq-contact-phone"
                className="form-control"
                maxLength={30}
                value={form.phone_number}
                onChange={onChange("phone_number")}
                disabled={!canUpdate}
                autoComplete="off"
              />
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="faq-contact-ig">
                Instagram
              </label>
              <input
                id="faq-contact-ig"
                className="form-control"
                maxLength={30}
                value={form.instagram}
                onChange={onChange("instagram")}
                disabled={!canUpdate}
                autoComplete="off"
              />
            </div>
            <div className="col-md-4">
              <label className="form-label" htmlFor="faq-contact-email">
                Email
              </label>
              <input
                id="faq-contact-email"
                className="form-control"
                maxLength={30}
                value={form.email}
                onChange={onChange("email")}
                disabled={!canUpdate}
                autoComplete="off"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarcommFaqContactPanel;
