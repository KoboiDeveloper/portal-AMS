import React, { useEffect, useState } from "react";
import Zoom from "react-medium-image-zoom";
import "react-medium-image-zoom/dist/styles.css";
import { Spinner } from "reactstrap";
import { Icon } from "../../../../components/Component";
import {
  buildImageStorageUrl,
  isDropboxStoragePath,
  isMissingImagePath,
} from "../../../../lib/imageStorage";
import { isSuccess } from "../../../../lib/response";
import { filesService } from "../../../../services/files.service";

const resolveKasPhotoUrl = async (filename) => {
  const value = String(filename ?? "").trim();
  if (!value || isMissingImagePath(value)) return "";

  if (isDropboxStoragePath(value)) {
    try {
      const path = value.startsWith("/") ? value : `/${value}`;
      const res = await filesService.getTemporaryLink(path);
      if ((isSuccess(res) || String(res?.responseCode) === "00") && res?.data?.temporaryLink) {
        return res.data.temporaryLink;
      }
    } catch {
      /* keep empty — jangan fallback ke imagestorage untuk path dropbox */
    }
    return "";
  }

  return buildImageStorageUrl(value);
};

/** Thumbnail grid — support path lama (imagestorage) + Dropbox */
export const KasPhotoThumb = ({ filename }) => {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    let cancelled = false;
    const value = String(filename ?? "").trim();
    if (!value || isMissingImagePath(value)) {
      setUrl("");
      setStatus("empty");
      return undefined;
    }

    setStatus("loading");
    resolveKasPhotoUrl(value).then((next) => {
      if (cancelled) return;
      setUrl(next || "");
      setStatus(next ? "ready" : "error");
    });

    return () => {
      cancelled = true;
    };
  }, [filename]);

  if (status === "loading") {
    return <Spinner size="sm" className="kas-photo-spinner" />;
  }
  if (!url || status === "error" || status === "empty" || status === "idle") {
    return <span className="kas-photo-empty">—</span>;
  }

  return (
    <Zoom zoomMargin={40}>
      <img src={url} alt="Bukti" className="kas-photo-thumb" />
    </Zoom>
  );
};

/** Preview besar di modal detail — support path lama + Dropbox */
export const KasPhotoPreview = ({ filename, className = "kas-detail-img" }) => {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState("idle");

  useEffect(() => {
    let cancelled = false;
    const value = String(filename ?? "").trim();
    if (!value || isMissingImagePath(value)) {
      setUrl("");
      setStatus("empty");
      return undefined;
    }

    setStatus("loading");
    resolveKasPhotoUrl(value).then((next) => {
      if (cancelled) return;
      setUrl(next || "");
      setStatus(next ? "ready" : "error");
    });

    return () => {
      cancelled = true;
    };
  }, [filename]);

  if (status === "loading") {
    return (
      <div className={`${className} kas-detail-img--empty`}>
        <Spinner size="sm" />
        <span>Memuat foto…</span>
      </div>
    );
  }

  if (!url || status === "error" || status === "empty") {
    return (
      <div className={`${className} kas-detail-img--empty`}>
        <Icon name="img" />
        <span>Tidak ada foto</span>
      </div>
    );
  }

  return (
    <Zoom zoomMargin={40}>
      <img src={url} alt="Bukti kas" className={className} />
    </Zoom>
  );
};

export { resolveKasPhotoUrl };
