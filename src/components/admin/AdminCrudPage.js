import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Input, Label, FormGroup } from "reactstrap";
import { Block, BlockBetween, BlockHead, BlockHeadContent, BlockTitle, Icon } from "../../components/Component";
import DataTable from "./common/DataTable";
import FormModal from "./common/FormModal";
import ConfirmDialog from "./common/ConfirmDialog";
import SearchInput from "./common/SearchInput";
import LoadingState from "./common/LoadingState";
import ErrorState from "./common/ErrorState";
import AccessGuard from "./AccessGuard";
import { extractRows, notifyResponse } from "../../lib/response";
import { useActionPermissions } from "../../hooks/useActionPermissions";

const AdminCrudPage = ({ config }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [isActive, setIsActive] = useState("");
  const [extraFilters, setExtraFilters] = useState({});
  const [modal, setModal] = useState({ open: false, mode: "add" });
  const [formData, setFormData] = useState(config.initialForm);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState({ open: false, row: null });
  const perms = useActionPermissions(config.moduleCode);

  const listParams = useMemo(() => {
    const params = { search: search || undefined };
    if (isActive !== "") params.is_active = isActive;
    (config.extraListParams || []).forEach((key) => {
      if (extraFilters[key]) params[key] = extraFilters[key];
    });
    return params;
  }, [search, isActive, extraFilters, config.extraListParams]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await config.service.list(listParams);
      setRows(extractRows(res));
    } catch (err) {
      setError(err?.responseMessage || "Failed to load data");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [config.service, listParams]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAdd = () => {
    setFormData({ ...config.initialForm });
    setModal({ open: true, mode: "add" });
  };

  const openEdit = (row) => {
    const mapped = { ...config.initialForm };
    config.fields.forEach((field) => {
      mapped[field.name] = row[field.name] ?? mapped[field.name];
    });
    setFormData(mapped);
    setModal({ open: true, mode: "edit", row });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...formData };
      if (payload.sort_no !== undefined && payload.sort_no !== "") {
        payload.sort_no = Number(payload.sort_no);
      }
      if (payload.end_date === "") payload.end_date = null;
      if (payload.store_id === "") payload.store_id = null;
      if (payload.parent_branch_id === "") payload.parent_branch_id = null;
      if (payload.parent_module_code === "") payload.parent_module_code = null;

      let res;
      if (modal.mode === "add") {
        res = await config.service.create(payload);
      } else {
        const id = modal.row[config.idField];
        res = await config.service.update(id, payload);
      }

      if (notifyResponse(res, modal.mode === "add" ? "Created successfully" : "Updated successfully")) {
        setModal({ open: false, mode: "add" });
        loadData();
      }
    } catch (err) {
      notifyResponse(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm.row) return;
    setSaving(true);
    try {
      const id = confirm.row[config.idField];
      const res = await config.service.remove(id);
      if (notifyResponse(res, "Deleted successfully")) {
        setConfirm({ open: false, row: null });
        loadData();
      }
    } catch (err) {
      notifyResponse(err);
    } finally {
      setSaving(false);
    }
  };

  const modalFields = config.fields.map((field) => ({
    ...field,
    disabled: field.disabledOnEdit && modal.mode === "edit",
  }));

  const content = (
    <>
      <BlockHead size="sm">
        <BlockBetween>
          <BlockHeadContent>
            <BlockTitle page tag="h3">{config.title}</BlockTitle>
          </BlockHeadContent>
          <BlockHeadContent>
            <div className="toggle-wrap nk-block-tools-toggle">
              {!perms.loading && perms.CREATE && (
                <Button color="primary" onClick={openAdd}>
                  <Icon name="plus" /><span className="ms-1">Add</span>
                </Button>
              )}
              <Button color="light" className="ms-2" onClick={loadData}>
                <Icon name="reload" />
              </Button>
            </div>
          </BlockHeadContent>
        </BlockBetween>
      </BlockHead>

      <Block>
        <div className="row g-3 mb-3">
          <div className="col-md-4">
            <SearchInput value={search} onChange={setSearch} placeholder={`Search ${config.title}...`} />
          </div>
          <div className="col-md-3">
            <Input type="select" value={isActive} onChange={(e) => setIsActive(e.target.value)}>
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </Input>
          </div>
          {(config.extraListParams || []).map((key) => (
            <div className="col-md-3" key={key}>
              <FormGroup>
                <Label className="form-label">{key.replace(/_/g, " ")}</Label>
                <Input
                  value={extraFilters[key] || ""}
                  onChange={(e) => setExtraFilters((prev) => ({ ...prev, [key]: e.target.value }))}
                />
              </FormGroup>
            </div>
          ))}
        </div>

        {loading && <LoadingState />}
        {!loading && error && <ErrorState message={error} onRetry={loadData} />}
        {!loading && !error && (
          <DataTable
            columns={config.columns}
            rows={rows}
            rowKey={(row, idx) => row[config.idField] || idx}
            actions={(row) => (
              <>
                {!perms.loading && perms.UPDATE && (
                  <Button size="sm" color="primary" className="me-1" onClick={() => openEdit(row)}>
                    Edit
                  </Button>
                )}
                {!perms.loading && perms.DELETE && (
                  <Button size="sm" color="danger" onClick={() => setConfirm({ open: true, row })}>
                    Delete
                  </Button>
                )}
              </>
            )}
          />
        )}
      </Block>

      <FormModal
        isOpen={modal.open}
        title={modal.mode === "add" ? `Add ${config.title}` : `Edit ${config.title}`}
        fields={modalFields}
        formData={formData}
        onChange={(name, value) => setFormData((prev) => ({ ...prev, [name]: value }))}
        onSubmit={handleSave}
        onClose={() => setModal({ open: false, mode: "add" })}
        loading={saving}
      />

      <ConfirmDialog
        isOpen={confirm.open}
        title={`Delete ${config.title}`}
        message={`Delete ${confirm.row?.[config.idField]}?`}
        onConfirm={handleDelete}
        onCancel={() => setConfirm({ open: false, row: null })}
        loading={saving}
      />
    </>
  );

  if (!config.moduleCode) return content;

  return (
    <AccessGuard moduleCode={config.moduleCode} permission="VIEW">
      {content}
    </AccessGuard>
  );
};

export default AdminCrudPage;
