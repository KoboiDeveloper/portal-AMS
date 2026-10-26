import React, { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO, isValid } from "date-fns";
import DatePicker from "../../../../components/AppDatePicker";
import Zoom from "react-medium-image-zoom";
import "react-medium-image-zoom/dist/styles.css";
import { Spinner } from "reactstrap";
import CalendarDateInput from "../../../../components/CalendarDateInput";
import {
  Block,
  BlockBetween,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Button,
  Icon,
} from "../../../../components/Component";
import Content from "../../../../layout/content/Content";
import Head from "../../../../layout/head/Head";
import { useStoreScope } from "../../../../hooks/useStoreScope";
import { extractRows, isSuccess } from "../../../../lib/response";
import { buildImageStorageUrl, isDropboxStoragePath, isMissingImagePath } from "../../../../lib/imageStorage";
import { storeSlipSetoranBankService } from "../../../../services/store-slip-setoran-bank.service";
import { filesService } from "../../../../services/files.service";
import { SsbSmoothScroll } from "./SsbSmoothScroll";
import SlipSetoranUploadModal from "./SlipSetoranUploadModal";
import "./slip-setoran-bank.css";

const isApiOk = (res) => {
  const code = String(res?.responseCode ?? "");
  return isSuccess(res) || code === "00" || code === "2000000";
};

const isNotFoundResponse = (res) => {
  const code = String(res?.responseCode ?? "");
  const msg = String(res?.responseMessage ?? "").toLowerCase();
  return (
    code === "01" ||
    code === "4040000" ||
    code === "4042500" ||
    msg.includes("tidak ditemukan") ||
    msg.includes("not found") ||
    msg.includes("tidak ada")
  );
};

const formatDisplayDate = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "—";
  const first = raw.split(",")[0].trim();
  const parsed = parseISO(first.length <= 10 ? first : first.slice(0, 10));
  if (isValid(parsed)) return format(parsed, "dd MMM yyyy");
  return raw;
};

const formatMoney = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return "0";
  return num.toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

const SlipThumb = ({ filename, label }) => {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    let cancelled = false;
    const value = String(filename ?? "").trim();

    if (!value || isMissingImagePath(value)) {
      setUrl("");
      setStatus("idle");
      return undefined;
    }

    setStatus("loading");

    const applyUrl = (nextUrl) => {
      if (cancelled) return;
      if (!nextUrl) {
        setUrl("");
        setStatus("error");
        return;
      }
      const image = new Image();
      image.onload = () => {
        if (!cancelled) {
          setUrl(nextUrl);
          setStatus("loaded");
        }
      };
      image.onerror = () => {
        if (!cancelled) {
          setUrl("");
          setStatus("error");
        }
      };
      image.src = nextUrl;
    };

    if (isDropboxStoragePath(value)) {
      const path = value.startsWith("/") ? value : `/${value}`;
      filesService
        .getTemporaryLink(path)
        .then((res) => {
          if (!isSuccess(res) && String(res?.responseCode) !== "00") {
            throw res;
          }
          applyUrl(res?.data?.temporaryLink || "");
        })
        .catch(() => {
          if (!cancelled) {
            setUrl("");
            setStatus("error");
          }
        });
      return () => {
        cancelled = true;
      };
    }

    // Path lama → base URL imagestorage (bukan Dropbox)
    applyUrl(buildImageStorageUrl(value));
    return () => {
      cancelled = true;
    };
  }, [filename]);

  if (!filename || status === "error" || status === "idle") {
    return (
      <div className="ssb-thumb ssb-thumb--empty" title={label}>
        <Icon name="img" />
        <span>Belum ada foto</span>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="ssb-thumb ssb-thumb--loading" title={label}>
        <Spinner size="sm" />
      </div>
    );
  }

  return (
    <Zoom zoomMargin={40}>
      <img src={url} alt={label} className="ssb-thumb" />
    </Zoom>
  );
};

const SlipTile = ({ label, amount, filename, showAmount }) => {
  const hasAmount = showAmount && Number(amount) > 0;
  return (
    <div className={`ssb-tile${hasAmount ? " has-value" : ""}`}>
      <div className="ssb-tile-media">
        <SlipThumb filename={filename} label={label} />
      </div>
      <div className="ssb-tile-body">
        <div className="ssb-tile-label">{label}</div>
        {showAmount ? (
          <div className={`ssb-tile-amount${hasAmount ? "" : " is-zero"}`}>
            <span className="ssb-tile-currency">Rp</span>
            {formatMoney(amount)}
          </div>
        ) : (
          <div className="ssb-tile-hint">{filename ? "Klik untuk perbesar" : "Tidak terlampir"}</div>
        )}
      </div>
    </div>
  );
};

const BatchCard = ({ item, onEdit }) => {
  const [tab, setTab] = useState("slip");
  const storeCode = String(item.store || "")
    .split("-")[0]
    .trim()
    .toUpperCase();
  const creBy = String(item.creBy || "").trim();
  const showUploader =
    Boolean(creBy) &&
    creBy.toUpperCase() !== storeCode &&
    !String(item.store || "").toUpperCase().includes(creBy.toUpperCase());

  return (
    <article
      className="ssb-row-card ssb-row-card--editable"
      role="button"
      tabIndex={0}
      onClick={() => onEdit?.(item)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onEdit?.(item);
        }
      }}
    >
      <header className="ssb-row-head">
        <div className="ssb-row-meta">
          <span className="ssb-row-no">{item.no}</span>
          <div className="ssb-row-title-wrap">
            <h5 className="ssb-row-store">{item.store}</h5>
            <div className="ssb-row-sub">
              <span>Upload {formatDisplayDate(item.creDate)}</span>
              {showUploader ? <span className="ssb-row-sub-sep">·</span> : null}
              {showUploader ? <span>oleh {creBy}</span> : null}
            </div>
          </div>
          <div className="ssb-batch-hero">
            <span className="ssb-date-label">Tanggal batch</span>
            <strong>{formatDisplayDate(item.tglBatch)}</strong>
          </div>
        </div>
        <div className="ssb-row-aside">
          <div className="ssb-total-hero">
            <span className="ssb-date-label">Total slip</span>
            <strong>Rp {formatMoney(item.totalSlip)}</strong>
          </div>
          <Button
            color="primary"
            size="sm"
            outline
            className="ssb-row-edit"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(item);
            }}
          >
            <Icon name="edit" />
            <span>Edit</span>
          </Button>
        </div>
      </header>

      <div
        className="ssb-tabs"
        role="tablist"
        aria-label="Jenis bukti"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "slip"}
          className={`ssb-tab${tab === "slip" ? " is-active" : ""}`}
          onClick={() => setTab("slip")}
        >
          <Icon name="wallet" />
          <span>Slip Setoran</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "settlement"}
          className={`ssb-tab${tab === "settlement" ? " is-active" : ""}`}
          onClick={() => setTab("settlement")}
        >
          <Icon name="card-view" />
          <span>Settlement</span>
        </button>
      </div>

      <div className="ssb-row-body">
        <section
          className={`ssb-group${tab !== "slip" ? " is-tab-hidden" : ""}`}
          data-panel="slip"
        >
          <div className="ssb-group-head">
            <div className="ssb-group-title">
              <Icon name="wallet" />
              <span>Slip Setoran</span>
            </div>
            <span className="ssb-group-note">Bukti setor tunai</span>
          </div>
          <div
            className="ssb-tile-grid"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <SlipTile
              label="Mandiri"
              amount={item.nilaiMandiri}
              filename={item.image1}
              showAmount
            />
            <SlipTile
              label="BNI"
              amount={item.nilaiBni}
              filename={item.image2}
              showAmount
            />
            <SlipTile
              label="Direct Selling"
              amount={item.nilaiDirectSelling}
              filename={item.image3}
              showAmount
            />
          </div>
        </section>

        <section
          className={`ssb-group ssb-group--settlement${tab !== "settlement" ? " is-tab-hidden" : ""}`}
          data-panel="settlement"
        >
          <div className="ssb-group-head">
            <div className="ssb-group-title">
              <Icon name="card-view" />
              <span>Settlement</span>
            </div>
            <span className="ssb-group-note">Bukti settlement EDC</span>
          </div>
          <div
            className="ssb-tile-grid"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <SlipTile label="Mandiri" filename={item.image4} />
            <SlipTile label="BNI" filename={item.image5} />
            <SlipTile label="BCA" filename={item.image6} />
          </div>
        </section>
      </div>
    </article>
  );
};

const EmptyState = ({ onRetry, loading }) => (
  <div className="ssb-empty">
    <div className="ssb-empty-visual" aria-hidden="true">
      <div className="ssb-empty-ring ssb-empty-ring--outer" />
      <div className="ssb-empty-ring ssb-empty-ring--inner" />
      <div className="ssb-empty-icon">
        <Icon name="files" />
      </div>
    </div>
    <h4 className="ssb-empty-title">Data DCR tidak ditemukan</h4>
    <p className="ssb-empty-desc">
      Belum ada slip setoran atau settlement untuk toko dan periode yang dipilih. Coba ubah rentang
      tanggal, lalu muat ulang.
    </p>
    <Button color="primary" className="ssb-empty-cta" onClick={onRetry} disabled={loading}>
      <Icon name="reload" />
      <span>Muat ulang</span>
    </Button>
  </div>
);

const ErrorState = ({ message, onRetry, loading }) => (
  <div className="ssb-empty ssb-empty--error">
    <div className="ssb-empty-visual" aria-hidden="true">
      <div className="ssb-empty-icon ssb-empty-icon--error">
        <Icon name="alert-circle" />
      </div>
    </div>
    <h4 className="ssb-empty-title">Gagal memuat data</h4>
    <p className="ssb-empty-desc">{message}</p>
    <Button color="primary" outline className="ssb-empty-cta" onClick={onRetry} disabled={loading}>
      <Icon name="reload" />
      <span>Coba lagi</span>
    </Button>
  </div>
);

const SlipSetoranBankPage = () => {
  const { storeId } = useStoreScope();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fromDate, setFromDate] = useState(new Date());
  const [toDate, setToDate] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add");
  const [editItem, setEditItem] = useState(null);

  const openAddModal = () => {
    setModalMode("add");
    setEditItem(null);
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setModalMode("edit");
    setEditItem(item);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditItem(null);
    setModalMode("add");
  };

  const loadData = useCallback(async () => {
    if (!storeId) return;
    const queryFrom = fromDate;
    const queryTo = toDate || fromDate;
    setLoading(true);
    setError("");
    try {
      const res = await storeSlipSetoranBankService.list({
        store_id: storeId,
        from_date: format(queryFrom, "yyyy-MM-dd"),
        to_date: format(queryTo, "yyyy-MM-dd"),
      });

      if (isApiOk(res)) {
        setRows(extractRows(res));
        return;
      }
      if (isNotFoundResponse(res)) {
        setRows([]);
        return;
      }
      throw res;
    } catch (err) {
      setError(err?.responseMessage || "Gagal memuat data slip setoran");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [storeId, fromDate, toDate]);

  useEffect(() => {
    if (storeId) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const tableRows = useMemo(
    () =>
      rows.map((row, index) => {
        const mandiri = Number(row?.nilaiMandiri) || 0;
        const bni = Number(row?.nilaiBni) || 0;
        const ds = Number(row?.nilaiDirectSelling) || 0;
        return {
          id: row?.id ?? row?.Id ?? null,
          rowKey: `${row?.id ?? row?.storeId ?? "row"}-${index}`,
          no: index + 1,
          store: row?.storeId || "—",
          creDate: row?.creDate,
          creBy: row?.creBy,
          tglBatch: row?.tglBatch,
          nilaiMandiri: mandiri,
          nilaiBni: bni,
          nilaiDirectSelling: ds,
          totalSlip: mandiri + bni + ds,
          image1: isMissingImagePath(row?.image1) ? "" : row?.image1,
          image2: isMissingImagePath(row?.image2) ? "" : row?.image2,
          image3: isMissingImagePath(row?.image3) ? "" : row?.image3,
          image4: isMissingImagePath(row?.image4) ? "" : row?.image4,
          image5: isMissingImagePath(row?.image5) ? "" : row?.image5,
          image6: isMissingImagePath(row?.image6) ? "" : row?.image6,
        };
      }),
    [rows]
  );

  const occupiedBatchKeys = useMemo(() => {
    const keys = [];
    tableRows.forEach((row) => {
      const raw = String(row?.tglBatch ?? "").trim();
      if (!raw) return;
      raw.split(",").forEach((part) => {
        const first = part.trim();
        if (!first) return;
        const parsed = parseISO(first.length <= 10 ? first : first.slice(0, 10));
        if (isValid(parsed)) keys.push(format(parsed, "yyyy-MM-dd"));
        else keys.push(first.slice(0, 10));
      });
    });
    return keys;
  }, [tableRows]);

  return (
    <>
      <Head title="Slip Setoran Bank" />
      <Content>
        <SsbSmoothScroll
          revision={`${loading ? "loading" : "ready"}-${tableRows.length}-${error || "ok"}`}
        >
          <div className="ssb-page">
            <BlockHead size="sm">
              <BlockBetween className="page-head-stack">
                <BlockHeadContent>
                  <BlockTitle page tag="h3">
                    Slip Setoran Bank
                  </BlockTitle>
                  <BlockDes className="text-soft">
                    <p>Monitoring slip setoran &amp; settlement harian per toko</p>
                  </BlockDes>
                </BlockHeadContent>
                <BlockHeadContent>
                  <div className="ssb-filter">
                    <div className="ssb-filter-range">
                      <DatePicker
                        selected={fromDate}
                        onChange={setFromDate}
                        selectsStart
                        startDate={fromDate}
                        endDate={toDate}
                        dateFormat="yyyy-MM-dd"
                        customInput={<CalendarDateInput className="form-control date-picker ssb-filter-date" />}
                      />
                      <span className="ssb-filter-to">s/d</span>
                      <DatePicker
                        selected={toDate}
                        onChange={setToDate}
                        startDate={fromDate}
                        endDate={toDate}
                        selectsEnd
                        minDate={fromDate}
                        dateFormat="yyyy-MM-dd"
                        customInput={<CalendarDateInput className="form-control date-picker ssb-filter-date" />}
                      />
                    </div>
                    <Button
                      color="primary"
                      className="ssb-filter-load"
                      onClick={loadData}
                      disabled={loading || !storeId}
                    >
                      <Icon name="search" />
                      <span>Load</span>
                    </Button>
                    <Button
                      color="primary"
                      outline
                      className="btn-icon"
                      onClick={openAddModal}
                      disabled={!storeId}
                      title="Upload Slip"
                      aria-label="Upload Slip"
                    >
                      <Icon name="upload-cloud" />
                    </Button>
                  </div>
                </BlockHeadContent>
              </BlockBetween>
            </BlockHead>

            <Block>
              {error ? (
                <ErrorState message={error} onRetry={loadData} loading={loading} />
              ) : tableRows.length === 0 ? (
                <EmptyState onRetry={loadData} loading={loading} />
              ) : (
                <div className="ssb-list">
                  {tableRows.map((item) => (
                    <BatchCard key={item.rowKey} item={item} onEdit={openEditModal} />
                  ))}
                </div>
              )}
            </Block>
          </div>
        </SsbSmoothScroll>
      </Content>
      <SlipSetoranUploadModal
        open={modalOpen}
        mode={modalMode}
        item={editItem}
        storeId={storeId}
        occupiedBatchKeys={occupiedBatchKeys}
        periodFrom={fromDate}
        periodTo={toDate || fromDate}
        onClose={closeModal}
        onSuccess={() => loadData()}
      />
    </>
  );
};

export default SlipSetoranBankPage;
