import React, { useCallback, useEffect, useRef, useState } from "react";
import { Spinner } from "reactstrap";
import { useQuill } from "react-quilljs";
import "quill/dist/quill.snow.css";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import {
  Block,
  BlockBetween,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Button,
  Icon,
} from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import ErrorState from "../../../components/admin/common/ErrorState";
import { useActionPermissions } from "../../../hooks/useActionPermissions";
import { getSyaratKetentuan, updateSyaratKetentuan } from "../../../services/marcomm/marcomm.service";
import { extractRow, isSuccess, notifyResponse } from "../../../lib/response";

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ indent: "-1" }, { indent: "+1" }],
    [{ align: [] }],
    ["link"],
    ["clean"],
  ],
};

const QUILL_FORMATS = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "list",
  "indent",
  "align",
  "link",
];

const MarcommMasterSyaratKetentuanPage = () => {
  const perms = useActionPermissions("MAR_MST_TNC");
  const canSave = perms.UPDATE && !perms.loading;

  const [detail, setDetail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const seededRef = useRef(false);

  const { quill, quillRef } = useQuill({
    theme: "snow",
    modules: QUILL_MODULES,
    formats: QUILL_FORMATS,
    placeholder: "Tulis syarat & ketentuan…",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    seededRef.current = false;
    try {
      const res = await getSyaratKetentuan();
      if (!isSuccess(res)) {
        setError(res?.responseMessage || "Gagal memuat syarat & ketentuan");
        setDetail("");
        return;
      }
      const row = extractRow(res) || {};
      let raw =
        row.detail ??
        row.content ??
        row.body ??
        row?.syaratKetentuanData?.[0]?.detail ??
        "";
      if (Array.isArray(row?.syaratKetentuanData) && !raw) {
        raw = row.syaratKetentuanData[0]?.detail ?? "";
      }
      try {
        if (typeof raw === "string" && /%[0-9A-Fa-f]{2}/.test(raw)) {
          raw = decodeURIComponent(raw);
        }
      } catch {
        /* keep raw */
      }
      setDetail(raw || "");
    } catch (err) {
      setError(err?.responseMessage || err?.message || "Gagal memuat syarat & ketentuan");
      setDetail("");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!quill || loading || seededRef.current) return;
    const html = detail || "";
    quill.clipboard.dangerouslyPasteHTML(html);
    seededRef.current = true;
    quill.enable(canSave);
  }, [quill, loading, detail, canSave]);

  useEffect(() => {
    if (!quill) return;
    const onChange = () => setDetail(quill.root.innerHTML);
    quill.on("text-change", onChange);
    return () => {
      quill.off("text-change", onChange);
    };
  }, [quill]);

  useEffect(() => {
    if (!quill) return;
    quill.enable(canSave && !loading);
  }, [quill, canSave, loading]);

  const onSave = async () => {
    if (!canSave) return;
    const html = quill ? quill.root.innerHTML : detail;
    const plain = String(html || "")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim();
    if (!plain) {
      notifyResponse({ responseMessage: "Konten tidak boleh kosong" });
      return;
    }
    setSaving(true);
    try {
      const res = await updateSyaratKetentuan({ detail: html });
      if (notifyResponse(res, "Syarat & ketentuan tersimpan")) {
        await load();
      }
    } catch (err) {
      notifyResponse(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AccessGuard moduleCode="MAR_MST_TNC" permission="VIEW">
      <>
        <Head title="Syarat & Ketentuan" />
        <Content>
          <BlockHead size="sm">
            <BlockBetween>
              <BlockHeadContent>
                <BlockTitle page tag="h3">
                  Syarat & Ketentuan
                </BlockTitle>
                <BlockDes className="text-soft">
                  Konten tampil di aplikasi member (rich text / HTML).
                </BlockDes>
              </BlockHeadContent>
              <BlockHeadContent>
                <div className="toggle-wrap nk-block-tools-toggle">
                  <Button
                    color="primary"
                    disabled={!canSave || saving || loading}
                    onClick={onSave}
                  >
                    {saving ? <Spinner size="sm" className="me-1" /> : <Icon name="save" className="me-1" />}
                    Simpan
                  </Button>
                </div>
              </BlockHeadContent>
            </BlockBetween>
          </BlockHead>

          <Block>
            {error && !loading ? (
              <ErrorState message={error} onRetry={load} />
            ) : (
              <div className="card card-bordered">
                <div className="card-inner">
                  <label className="form-label">Detail</label>
                  {loading ? (
                    <div className="text-center py-5">
                      <Spinner color="primary" />
                    </div>
                  ) : null}
                  <div
                    style={{
                      minHeight: 360,
                      display: loading ? "none" : "block",
                      background: "#fff",
                    }}
                  >
                    <div ref={quillRef} style={{ minHeight: 320 }} />
                  </div>
                </div>
              </div>
            )}
          </Block>
        </Content>
      </>
    </AccessGuard>
  );
};

export default MarcommMasterSyaratKetentuanPage;
