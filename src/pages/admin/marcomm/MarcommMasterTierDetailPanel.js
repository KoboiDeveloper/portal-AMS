import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Col, Form, Input, Label, Row, Spinner } from "reactstrap";
import { Button, Icon } from "../../../components/Component";
import ErrorState from "../../../components/admin/common/ErrorState";
import { extractRow, notifyResponse } from "../../../lib/response";
import { marcommMasterTierService } from "../../../services/marcomm/marcomm.service";

const num = (v) => {
  const n = Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const boolField = (row, ...keys) => {
  const raw = keys.reduce((acc, k) => (acc !== undefined && acc !== null ? acc : row?.[k]), undefined);
  if (raw === true || raw === 1 || raw === "1") return true;
  if (raw === false || raw === 0 || raw === "0") return false;
  const s = String(raw ?? "").toLowerCase();
  return s === "true" || s === "yes";
};

const emptyForm = {
  amount_from: "",
  amount_to: "",
  is_point_increase: false,
  purchase_amount: "",
  point_persen: "",
  point_rupiah: "",
  is_birthday_treats: false,
  is_bigday_treats: false,
  is_birthday_gift: false,
  min_brithday_gift_amount: "",
  birthday_gift_voucher_amount: "",
  is_limited_item_access: false,
  is_freebies_on_purchase_limited_item: false,
  is_free_merchandise: false,
};

const rowToForm = (row) => ({
  ...emptyForm,
  amount_from: row.amount_from ?? row.amount_From ?? "",
  amount_to: row.amount_to ?? "",
  is_point_increase: boolField(row, "is_point_increase"),
  purchase_amount: row.purchase_amount ?? "",
  point_persen: row.point_persen ?? "",
  point_rupiah: row.point_rupiah ?? "",
  is_birthday_treats: boolField(row, "is_birthday_treats"),
  is_bigday_treats: boolField(row, "is_bigday_treats"),
  is_birthday_gift: boolField(row, "is_birthday_gift"),
  min_brithday_gift_amount: row.min_brithday_gift_amount ?? "",
  birthday_gift_voucher_amount: row.birthday_gift_voucher_amount ?? "",
  is_limited_item_access: boolField(row, "is_limited_item_access"),
  is_freebies_on_purchase_limited_item: boolField(row, "is_freebies_on_purchase_limited_item"),
  is_free_merchandise: boolField(row, "is_free_merchandise"),
});

const Toggle = ({ id, label, checked, disabled, onChange }) => (
  <div className="mar-tier-toggle">
    <span className="mar-tier-toggle__label">{label}</span>
    <div className="custom-control custom-switch mar-tier-toggle__switch">
      <Input
        type="checkbox"
        className="custom-control-input"
        id={id}
        checked={!!checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <Label className="custom-control-label" htmlFor={id}>
        {checked ? "Ya" : "Tidak"}
      </Label>
    </div>
  </div>
);

/** Form body for tier benefit edit (list drawer / full page). */
const MarcommMasterTierDetailPanel = ({
  id,
  canSave = false,
  initialName = "",
  onNameLoaded,
  onSaved,
}) => {
  const [tierName, setTierName] = useState(initialName || "");
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const load = useCallback(async () => {
    if (id === undefined || id === null || id === "") return;
    setLoading(true);
    setError("");
    try {
      const res = await marcommMasterTierService.get(id);
      const row = extractRow(res) || {};
      const name = row.tier_name ?? row.TIER_NAME ?? (initialName || `Tier ${id}`);
      setTierName(name);
      if (typeof onNameLoaded === "function") onNameLoaded(name);
      setForm(rowToForm(row));
    } catch (err) {
      setError(err?.responseMessage || "Gagal memuat tier");
      setForm(emptyForm);
    } finally {
      setLoading(false);
    }
  }, [id, initialName]); // eslint-disable-line react-hooks/exhaustive-deps -- avoid loop on onNameLoaded

  useEffect(() => {
    load();
  }, [load]);

  const pointPreview = useMemo(() => {
    if (!form.is_point_increase) return form.point_rupiah || "0";
    const purchase = num(form.purchase_amount);
    const pct = num(form.point_persen);
    if (!purchase || !pct) return "0";
    return ((purchase * pct) / 100).toFixed(2);
  }, [form.is_point_increase, form.purchase_amount, form.point_persen, form.point_rupiah]);

  useEffect(() => {
    if (form.is_point_increase) {
      setForm((prev) => ({ ...prev, point_rupiah: pointPreview }));
    }
  }, [pointPreview, form.is_point_increase]);

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        is_point_increase: form.is_point_increase ? "1" : "0",
        is_birthday_treats: form.is_birthday_treats ? "1" : "0",
        is_bigday_treats: form.is_bigday_treats ? "1" : "0",
        is_birthday_gift: form.is_birthday_gift ? "1" : "0",
        is_limited_item_access: form.is_limited_item_access ? "1" : "0",
        is_freebies_on_purchase_limited_item: form.is_freebies_on_purchase_limited_item ? "1" : "0",
        is_free_merchandise: form.is_free_merchandise ? "1" : "0",
      };
      const res = await marcommMasterTierService.update(id, payload);
      if (notifyResponse(res, "Tier tersimpan")) {
        await load();
        if (typeof onSaved === "function") onSaved();
      }
    } catch (err) {
      notifyResponse(err);
    } finally {
      setSaving(false);
    }
  };

  if (error && !loading) {
    return <ErrorState message={error} onRetry={load} />;
  }

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner color="primary" />
      </div>
    );
  }

  return (
    <>
      <div className="d-flex align-items-center justify-content-between g-2 mb-3">
        <div className="text-soft small">{tierName ? `Edit benefit — ${tierName}` : "Edit benefit"}</div>
        <Button color="primary" size="sm" disabled={!canSave || saving} onClick={onSave}>
          {saving ? <Spinner size="sm" className="me-1" /> : <Icon name="save" className="me-1" />}
          Simpan
        </Button>
      </div>
      <Form>
        <h6 className="title mb-3">Total Belanja</h6>
        <Row className="gy-3">
          <Col md="6">
            <Label>Min Amount</Label>
            <Input
              value={form.amount_from}
              onChange={(e) => setField("amount_from", e.target.value)}
              disabled={!canSave}
            />
          </Col>
          <Col md="6">
            <Label>Max Amount</Label>
            <Input
              value={form.amount_to}
              onChange={(e) => setField("amount_to", e.target.value)}
              disabled={!canSave}
            />
          </Col>
        </Row>

        <hr />
        <Toggle
          id="tier-point-increase"
          label="Point Increase"
          checked={form.is_point_increase}
          disabled={!canSave}
          onChange={(v) => setField("is_point_increase", v)}
        />
        <Row className="gy-3 mt-2">
          <Col md="4">
            <Label>Min Purchase</Label>
            <Input
              value={form.purchase_amount}
              onChange={(e) => setField("purchase_amount", e.target.value)}
              disabled={!canSave || !form.is_point_increase}
            />
          </Col>
          <Col md="4">
            <Label>% Point</Label>
            <Input
              value={form.point_persen}
              onChange={(e) => setField("point_persen", e.target.value)}
              disabled={!canSave || !form.is_point_increase}
            />
          </Col>
          <Col md="4">
            <Label>Point</Label>
            <Input value={pointPreview} readOnly disabled className="bg-lighter" />
          </Col>
        </Row>

        <hr />
        <Toggle
          id="tier-bday-treats"
          label="Birthday Treats"
          checked={form.is_birthday_treats}
          disabled={!canSave}
          onChange={(v) => setField("is_birthday_treats", v)}
        />
        <Toggle
          id="tier-bigday"
          label="Big Days Treat"
          checked={form.is_bigday_treats}
          disabled={!canSave}
          onChange={(v) => setField("is_bigday_treats", v)}
        />
        <Toggle
          id="tier-bday-gift"
          label="Birthday Gift Voucher"
          checked={form.is_birthday_gift}
          disabled={!canSave}
          onChange={(v) => setField("is_birthday_gift", v)}
        />
        <Row className="gy-3 mt-2">
          <Col md="6">
            <Label>Min Purchase (Birthday Gift)</Label>
            <Input
              value={form.min_brithday_gift_amount}
              onChange={(e) => setField("min_brithday_gift_amount", e.target.value)}
              disabled={!canSave || !form.is_birthday_gift}
            />
          </Col>
          <Col md="6">
            <Label>Voucher Amount</Label>
            <Input
              value={form.birthday_gift_voucher_amount}
              onChange={(e) => setField("birthday_gift_voucher_amount", e.target.value)}
              disabled={!canSave || !form.is_birthday_gift}
            />
          </Col>
        </Row>

        <hr />
        <Toggle
          id="tier-limited"
          label="Access to Member-only Limited Items"
          checked={form.is_limited_item_access}
          disabled={!canSave}
          onChange={(v) => setField("is_limited_item_access", v)}
        />
        <Toggle
          id="tier-freebies"
          label="Freebies on Purchase Limited Item"
          checked={form.is_freebies_on_purchase_limited_item}
          disabled={!canSave}
          onChange={(v) => setField("is_freebies_on_purchase_limited_item", v)}
        />
        <Toggle
          id="tier-merch"
          label="Free Merchandise"
          checked={form.is_free_merchandise}
          disabled={!canSave}
          onChange={(v) => setField("is_free_merchandise", v)}
        />
      </Form>
    </>
  );
};

export default MarcommMasterTierDetailPanel;
