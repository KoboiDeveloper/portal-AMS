import React, { useEffect, useMemo, useState } from "react";
import { Modal, ModalBody } from "reactstrap";
import { useNavigate } from "react-router-dom";
import { Icon } from "../../../../components/Component";
import { appPath } from "../../../../lib/paths";
import { isSuperAdmin } from "../../../../lib/auth";
import { DGS_SC_MODULES } from "./dgsModuleMap";
import useDgsNavAccess from "../shell/useDgsNavAccess";
import ScBtn from "./ScBtn";

const STORAGE_KEY = "dgs.quickAccess";
const MAX = 10;

const loadSaved = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
};

const moduleCodesOf = (x) =>
  Array.isArray(x.moduleCodes) && x.moduleCodes.length ? x.moduleCodes : x.moduleCode ? [x.moduleCode] : [];

/** R02 — Akses cepat (konten), max 10, localStorage. Filter RBAC VIEW. */
const ScQuickAccessModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(() => loadSaved());
  const [initial, setInitial] = useState(() => loadSaved());

  const allCodes = useMemo(
    () => DGS_SC_MODULES.flatMap((x) => moduleCodesOf(x)),
    []
  );
  const { allowed, loading: accessLoading } = useDgsNavAccess(allCodes);

  const allowedModules = useMemo(() => {
    if (isSuperAdmin()) return DGS_SC_MODULES;
    return DGS_SC_MODULES.filter((x) =>
      moduleCodesOf(x).some((c) => allowed.has(String(c).toUpperCase()))
    );
  }, [allowed]);

  useEffect(() => {
    if (!isOpen || accessLoading) return;
    const s = loadSaved().filter(
      (route) => isSuperAdmin() || allowedModules.some((m) => m.route === route)
    );
    setSelected(s);
    setInitial(s);
  }, [isOpen, accessLoading, allowedModules]);

  const byRoute = useMemo(() => {
    const m = new Map();
    DGS_SC_MODULES.forEach((x) => m.set(x.route, x));
    return m;
  }, []);

  const available = allowedModules.filter((x) => !selected.includes(x.route));
  const groups = useMemo(() => {
    const g = { Pesanan: [], Pengembalian: [], Keuangan: [], Lainnya: [] };
    available.forEach((x) => {
      if (x.sc.startsWith("Pesanan") || x.route.includes("prasales")) g.Pesanan.push(x);
      else if (x.sc.includes("Pengembalian") || x.route.includes("retur")) g.Pengembalian.push(x);
      else if (x.sc.includes("Keuangan") || x.route.includes("ar-")) g.Keuangan.push(x);
      else g.Lainnya.push(x);
    });
    return g;
  }, [available]);

  const add = (route) => {
    if (selected.length >= MAX || selected.includes(route)) return;
    setSelected((s) => [...s, route]);
  };
  const remove = (route) => setSelected((s) => s.filter((r) => r !== route));

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
    setInitial(selected);
    onClose?.();
  };
  const cancel = () => {
    setSelected(initial);
    onClose?.();
  };

  return (
    <Modal isOpen={isOpen} toggle={cancel} className="modal-dialog-centered" size="lg" contentClassName="dgs-modal-content">
      <div className="rsd-detail-hero">
        <div>
          <h5 className="rsd-detail-title">Pengelolaan Akses Cepat</h5>
          <p className="rsd-detail-sub">Maksimum {MAX} shortcut DigitalSales</p>
        </div>
        <button type="button" className="btn btn-icon btn-trigger" onClick={cancel} aria-label="Tutup">
          <Icon name="cross" />
        </button>
      </div>
      <ModalBody className="rsd-detail-body dgs-modal-body">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <div className="sc-section__meta" style={{ marginBottom: 8 }}>
              Pilih menu yang akan ditambahkan
            </div>
            {Object.entries(groups).map(([label, items]) =>
              items.length ? (
                <div key={label} style={{ marginBottom: 12 }}>
                  <div className="dgs-subnav__label">{label}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {items.map((it) => (
                      <button
                        key={it.route}
                        type="button"
                        className="sc-chip"
                        disabled={selected.length >= MAX}
                        onClick={() => add(it.route)}
                      >
                        {it.dgs} <Icon name="plus" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null
            )}
          </div>
          <div>
            <div className="sc-toolbar-row" style={{ marginBottom: 8 }}>
              <span className="sc-section__meta">Terpilih</span>
              <strong>
                {selected.length}/{MAX}
              </strong>
            </div>
            {selected.length === 0 ? (
              <div className="sc-empty" style={{ minHeight: 180 }}>
                <p className="sc-empty__hint">Belum ada Menu Akses Cepat yang ditambahkan</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selected.map((route) => {
                  const it = byRoute.get(route);
                  return (
                    <div key={route} className="sc-chip is-active" style={{ justifyContent: "space-between" }}>
                      <button
                        type="button"
                        className="dgs-link"
                        style={{ border: 0, background: "transparent", fontWeight: 700 }}
                        onClick={() => {
                          navigate(appPath(route));
                          onClose?.();
                        }}
                      >
                        {it?.dgs || route}
                      </button>
                      <button type="button" className="dgs-link" onClick={() => remove(route)} aria-label="Hapus">
                        <Icon name="cross" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </ModalBody>
      <div className="dgs-modal-foot">
        <span className="dgs-spacer" />
        <ScBtn variant="soft" onClick={cancel}>
          Batal
        </ScBtn>
        <ScBtn onClick={save}>Simpan</ScBtn>
      </div>
    </Modal>
  );
};

export default ScQuickAccessModal;
