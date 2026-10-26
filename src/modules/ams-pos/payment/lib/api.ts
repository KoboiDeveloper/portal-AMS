import type {
  EdcStartPayload,
  EdcStartResult,
  EdcStatusResult,
} from "../types";

/**
 * EDC calls go to local bridge on store PC (ITILPOS-style).
 * Default: http://127.0.0.1:8787  →  POST /api/payment/edc/*
 *
 * Other AMS APIs still use REACT_APP_API_BASE_URL (Render/cloud).
 */
function edcApiBase() {
  const raw = (process.env.REACT_APP_EDC_API_BASE_URL || "http://127.0.0.1:8787").trim();
  return raw.replace(/\/+$/, "");
}

async function postEdcJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${edcApiBase()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      data?.error || data?.responseMessage || data?.message || `HTTP ${res.status}`
    );
  }
  return data as T;
}

export function edcStart(payload: EdcStartPayload) {
  return postEdcJson<EdcStartResult>("/api/payment/edc/start", payload);
}

export function edcStatus(body: {
  bankKey: string;
  amount: number;
  tipeBayar: string;
  ecrTransId?: string;
  partnerReferenceNo?: string;
  storeId?: string;
}) {
  return postEdcJson<EdcStatusResult>("/api/payment/edc/status", body);
}

export function edcCancel(body: {
  bankKey: string;
  amount: number;
  tipeBayar: string;
  ecrTransId?: string;
  storeId?: string;
}) {
  return postEdcJson<{ ok: boolean; message?: string }>("/api/payment/edc/cancel", body);
}
