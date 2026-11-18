import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge, Form, Input, Label, Spinner } from "reactstrap";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import {
  Block,
  BlockBetween,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Button,
  Icon,
} from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import ConfirmDialog from "../../../components/admin/common/ConfirmDialog";
import ErrorState from "../../../components/admin/common/ErrorState";
import ProjectListTable from "../../../components/admin/common/ProjectListTable";
import { useActionPermissions } from "../../../hooks/useActionPermissions";
import { marcommNotificationService } from "../../../services/marcomm/marcomm.service";
import { extractRow, extractRows, isSuccess, notifyResponse } from "../../../lib/response";
import { createdIdFromRes, pick } from "./marcommDetailShared";
import "../hrd/hrd-personel.css";

const poolCols = [
  { key: "id_member", label: "ID", size: "sm" },
  { key: "nama", label: "Member", size: "lg", type: "title", titleKey: "nama", subtitleKey: "email" },
  { key: "nohp", label: "HP", size: "md" },
];

const selectedCols = [
  { key: "id_member", label: "ID", size: "sm" },
  { key: "nama", label: "Member", size: "lg", type: "title", titleKey: "nama", subtitleKey: "email" },
];

const MarcommNotificationDetailPage = () => {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const isNew = routeId === "new";
  const notifId = isNew ? "" : routeId;

  const perms = useActionPermissions("MAR_MBR_NOTIF");
  const canSave = !perms.loading && (isNew ? perms.CREATE : perms.UPDATE);

  const [title, setTitle] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [status, setStatus] = useState("");
  const [pool, setPool] = useState([]);
  const [selected, setSelected] = useState([]);
  const [poolKw, setPoolKw] = useState("");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sendConfirm, setSendConfirm] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState({ open: false, row: null });

  const isSent = String(status || "").toUpperCase() === "TERKIRIM";
  const canEditBody = canSave && !isSent;

  const loadSelected = useCallback(async (nid) => {
    if (!nid) return;
    const res = await marcommNotificationService.listMembers(nid);
    if (isSuccess(res)) setSelected(extractRows(res));
  }, []);

  const loadPool = useCallback(async (nid, keywords) => {
    if (!nid) return;
    const res = await marcommNotificationService.memberPool(nid, keywords ? { keywords } : {});
    if (isSuccess(res)) setPool(extractRows(res));
  }, []);

  const loadHeader = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    setError("");
    try {
      const res = await marcommNotificationService.get(notifId);
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal memuat notifikasi");
        return;
      }
      const row = extractRow(res) || {};
      setTitle(pick(row, "title", "TITLE"));
      setKeterangan(pick(row, "keterangan", "KETERANGAN"));
      setStatus(pick(row, "status", "STATUS"));
      await Promise.all([loadSelected(notifId), loadPool(notifId, "")]);
    } catch (err) {
      setError(err?.responseMessage || "Gagal memuat notifikasi");
    } finally {
      setLoading(false);
    }
  }, [isNew, notifId, loadSelected, loadPool]);

  useEffect(() => {
    loadHeader();
  }, [loadHeader]);

  const onSave = async () => {
    if (!canEditBody) return;
    setSaving(true);
    try {
      const payload = { title, keterangan };
      let res;
      if (isNew) {
        res = await marcommNotificationService.create(payload);
      } else {
        res = await marcommNotificationService.update(notifId, payload);
      }
      if (!notifyResponse(res, isNew ? "Notifikasi dibuat" : "Notifikasi disimpan")) return;
      if (isNew) {
        const newId = createdIdFromRes(res);
        if (newId) {
          navigate(`/admin/marcomm/member/notification/${encodeURIComponent(newId)}`, { replace: true });
        } else {
          navigate("/admin/marcomm/member/notification");
        }
      } else {
        await loadHeader();
      }
    } catch (err) {
      notifyResponse(err);
    } finally {
      setSaving(false);
    }
  };

  const addMember = async (row) => {
    if (!notifId || isSent) return;
    setSaving(true);
    try {
      const res = await marcommNotificationService.addMembers(notifId, {
        members: [
          {
            id_member: pick(row, "id_member", "ID_MEMBER"),
            token_member: pick(row, "token_member", "token", "TOKEN_MEMBER"),
          },
        ],
      });
      if (notifyResponse(res, "Member ditambahkan")) {
        await Promise.all([loadSelected(notifId), loadPool(notifId, poolKw)]);
      }
    } catch (err) {
      notifyResponse(err);
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async () => {
    if (!removeConfirm.row || !notifId) return;
    setSaving(true);
    try {
      const memberId = pick(removeConfirm.row, "id_member", "ID_MEMBER");
      const detailId = pick(removeConfirm.row, "id", "ID", "detail_id");
      const res = await marcommNotificationService.removeMember(notifId, memberId, { detail_id: detailId });
      if (notifyResponse(res, "Member dihapus")) {
        setRemoveConfirm({ open: false, row: null });
        await Promise.all([loadSelected(notifId), loadPool(notifId, poolKw)]);
      }
    } catch (err) {
      notifyResponse(err);
    } finally {
      setSaving(false);
    }
  };

  const onSend = async () => {
    if (!notifId || isSent) return;
    setSaving(true);
    try {
      const res = await marcommNotificationService.send(notifId);
      if (notifyResponse(res, "Notifikasi dikirim")) {
        setSendConfirm(false);
        await loadHeader();
      }
    } catch (err) {
      notifyResponse(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AccessGuard moduleCode="MAR_MBR_NOTIF" permission="VIEW">
      <>
        <Head title={isNew ? "Notifikasi Baru" : "Detail Notifikasi"} />
        <Content>
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle page tag="h3">
                  {isNew ? "Notifikasi Baru" : "Detail Notifikasi"}
                </BlockTitle>
                {!isNew && status && (
                  <Badge color={isSent ? "success" : "secondary"} className="ms-2">
                    {status}
                  </Badge>
                )}
              </BlockHeadContent>
              <BlockHeadContent className="d-flex gap-2 flex-wrap justify-content-end">
                <Button color="light" onClick={() => navigate("/admin/marcomm/member/notification")}>
                  <Icon name="arrow-left" className="me-1" />
                  Kembali
                </Button>
                {canEditBody && (
                  <Button color="primary" disabled={saving || loading} onClick={onSave}>
                    {saving ? <Spinner size="sm" className="me-1" /> : <Icon name="save" className="me-1" />}
                    Simpan
                  </Button>
                )}
                {!isNew && !isSent && perms.UPDATE && (
                  <Button color="success" disabled={saving || loading} onClick={() => setSendConfirm(true)}>
                    <Icon name="send" className="me-1" />
                    Kirim
                  </Button>
                )}
              </BlockHeadContent>
            </BlockBetween>
          </BlockHead>

          {error && !loading ? (
            <ErrorState message={error} onRetry={loadHeader} />
          ) : loading ? (
            <Block>
              <div className="text-center py-5">
                <Spinner color="primary" />
              </div>
            </Block>
          ) : (
            <>
              <Block>
                <div className="card card-bordered">
                  <div className="card-inner">
                    <Form>
                      <div className="row g-gs">
                        <div className="col-12">
                          <Label>Judul</Label>
                          <Input value={title} disabled={!canEditBody} onChange={(e) => setTitle(e.target.value)} />
                        </div>
                        <div className="col-12">
                          <Label>Keterangan</Label>
                          <Input
                            type="textarea"
                            rows={4}
                            value={keterangan}
                            disabled={!canEditBody}
                            onChange={(e) => setKeterangan(e.target.value)}
                          />
                        </div>
                      </div>
                    </Form>
                  </div>
                </div>
              </Block>

              {!isNew && (
                <>
                  <BlockHead size="sm">
                    <BlockBetween>
                      <BlockTitle tag="h5">Pool Member</BlockTitle>
                      <div className="d-flex gap-2 align-items-center">
                        <Input
                          bsSize="sm"
                          placeholder="Keywords…"
                          value={poolKw}
                          disabled={isSent}
                          onChange={(e) => setPoolKw(e.target.value)}
                          className="w-200px"
                        />
                        <Button
                          size="sm"
                          color="light"
                          disabled={isSent}
                          onClick={() => loadPool(notifId, poolKw)}
                        >
                          <Icon name="search" />
                        </Button>
                      </div>
                    </BlockBetween>
                  </BlockHead>
                  <Block>
                    <ProjectListTable
                      columns={poolCols}
                      rows={pool}
                      idField="id_member"
                      extraActions={
                        !isSent && perms.UPDATE
                          ? [
                              {
                                key: "add",
                                label: "Tambah",
                                icon: "plus",
                                onClick: addMember,
                              },
                            ]
                          : []
                      }
                      currentPage={1}
                      itemPerPage={25}
                      onPageChange={() => {}}
                      loading={false}
                    />
                  </Block>

                  <BlockHead size="sm">
                    <BlockTitle tag="h5">Member Terpilih</BlockTitle>
                  </BlockHead>
                  <Block>
                    <ProjectListTable
                      columns={selectedCols}
                      rows={selected}
                      idField="id_member"
                      canDelete={!isSent && perms.UPDATE}
                      onDelete={(row) => setRemoveConfirm({ open: true, row })}
                      currentPage={1}
                      itemPerPage={50}
                      onPageChange={() => {}}
                      loading={false}
                    />
                  </Block>
                </>
              )}
            </>
          )}

          <ConfirmDialog
            isOpen={sendConfirm}
            variant="sc"
            title="Kirim Notifikasi"
            message="Kirim push notification ke member terpilih?"
            confirmLabel="Kirim"
            onConfirm={onSend}
            onCancel={() => setSendConfirm(false)}
            loading={saving}
          />

          <ConfirmDialog
            isOpen={removeConfirm.open}
            variant="sc"
            title="Hapus Member"
            message="Hapus member dari daftar terpilih?"
            confirmLabel="Hapus"
            onConfirm={removeMember}
            onCancel={() => setRemoveConfirm({ open: false, row: null })}
            loading={saving}
          />
        </Content>
      </>
    </AccessGuard>
  );
};

export default MarcommNotificationDetailPage;