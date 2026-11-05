import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Spinner } from "reactstrap";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import { Icon } from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import { PageSmoothScroll } from "../../../components/PageSmoothScroll";
import { createHrdService } from "../../../services/hrd/hrd.service";
import { extractRow, notifyResponse } from "../../../lib/response";
import { ScBadge, ScBtn, ScNotice, ScPageHeader, ScStatusTabs } from "../dgs/sc";
import HrdHScrollRail from "./HrdHScrollRail";
import { resolvePhotoUrl } from "./personel-info/shared";
import IdentitasTab from "./personel-info/tabs/IdentitasTab";
import AlamatTab from "./personel-info/tabs/AlamatTab";
import SipilTab from "./personel-info/tabs/SipilTab";
import PendidikanTab from "./personel-info/tabs/PendidikanTab";
import KeahlianTab from "./personel-info/tabs/KeahlianTab";
import PekerjaanTab from "./personel-info/tabs/PekerjaanTab";
import AktifitasTab from "./personel-info/tabs/AktifitasTab";
import KesehatanTab from "./personel-info/tabs/KesehatanTab";
import KontrakTab from "./personel-info/tabs/KontrakTab";
import StatusTab from "./personel-info/tabs/StatusTab";
import JabatanTab from "./personel-info/tabs/JabatanTab";
import PenempatanTab from "./personel-info/tabs/PenempatanTab";
import BankTab from "./personel-info/tabs/BankTab";
import UploadTab from "./personel-info/tabs/UploadTab";
import "../dgs/dgs.css";
import "./hrd-personel.css";

const service = createHrdService("abs/personel", { crud: true });

const TABS = [
  { id: "identitas", label: "Identitas" },
  { id: "alamat", label: "Alamat", Component: AlamatTab },
  { id: "sipil", label: "Sipil", Component: SipilTab },
  { id: "pendidikan", label: "Pendidikan", Component: PendidikanTab },
  { id: "keahlian", label: "Keahlian", Component: KeahlianTab },
  { id: "pekerjaan", label: "Pekerjaan", Component: PekerjaanTab },
  { id: "aktifitas", label: "Aktifitas", Component: AktifitasTab },
  { id: "kesehatan", label: "Kesehatan", Component: KesehatanTab },
  { id: "kontrak", label: "Kontrak", Component: KontrakTab },
  { id: "status", label: "Status", Component: StatusTab },
  { id: "jabatan", label: "Jabatan", Component: JabatanTab },
  { id: "penempatan", label: "Penempatan", Component: PenempatanTab },
  { id: "bank", label: "Bank", Component: BankTab },
  { id: "upload", label: "Upload", Component: UploadTab },
];

const HrdPersonelInfoPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isNew = !id || id === "new";
  const vType = searchParams.get("vType") || "HO";

  const [activeTab, setActiveTab] = useState("identitas");
  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(!isNew);
  const [photoBroken, setPhotoBroken] = useState(false);

  const photo = row ? row.photo || row.Photo || row.foto || row.FOTO || "" : "";
  const photoUrl = resolvePhotoUrl(photo);

  useEffect(() => {
    setPhotoBroken(false);
  }, [photoUrl]);

  useEffect(() => {
    if (isNew) setActiveTab("identitas");
  }, [isNew]);

  const loadData = useCallback(async (silent) => {
    if (isNew) {
      setRow(null);
      return;
    }
    if (silent !== true) setLoading(true);
    try {
      const res = await service.get(id);
      setRow(extractRow(res) || {});
    } catch (err) {
      notifyResponse(err);
    } finally {
      setLoading(false);
    }
  }, [id, isNew]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const pegawai = useMemo(
    () => ({ id, nik: row?.nik || "", employee_name: row?.employee_name || "" }),
    [id, row?.nik, row?.employee_name]
  );

  const title = isNew
    ? `Tambah karyawan (${vType})`
    : row?.employee_name || "Employee info";

  const isActive = String(row?.status_aktif ?? "0") === "0";

  const tabItems = useMemo(
    () => TABS.map((t) => ({ id: t.id, label: t.label, disabled: isNew && t.id !== "identitas" })),
    [isNew]
  );

  const handleTabChange = (tabId) => {
    if (isNew && tabId !== "identitas") return;
    setActiveTab(tabId);
  };

  const active = TABS.find((t) => t.id === activeTab);
  const ActiveComponent = active?.Component;

  const renderTab = () => {
    if (activeTab === "identitas") {
      return (
        <IdentitasTab
          id={id}
          isNew={isNew}
          vType={vType}
          row={row}
          onSaved={() => loadData(true)}
          onCreated={(newId) => navigate(`/admin/hrd/abs/personel/${newId}`, { replace: true })}
        />
      );
    }
    if (isNew || !ActiveComponent) {
      return (
        <ScNotice tone="warn">
          Simpan tab Identitas dulu. Tab {active?.label || ""} aktif setelah pegawai tersimpan.
        </ScNotice>
      );
    }
    return (
      <ActiveComponent
        key={activeTab}
        pegawai={pegawai}
        photo={photo}
        onPhotoChanged={() => loadData(true)}
      />
    );
  };

  return (
    <AccessGuard moduleCode="HRD_ABS_PERSONEL" permission="VIEW">
      <Head title={title} />
      <Content>
        <PageSmoothScroll revision={`${id || "new"}-${activeTab}-${loading ? 1 : 0}`} className="riv-page-scroll">
          <div className="hrd-sc dgs-dash sc-scope">
            <ScPageHeader
              title={title}
              description={
                isNew
                  ? `Input pegawai baru tipe ${vType}`
                  : [row?.nik, row?.jabatan, row?.branch_name].filter(Boolean).join(" · ") ||
                    "Detail identitas & riwayat pegawai"
              }
              actions={
                <div className="d-flex flex-wrap gap-2">
                  <ScBtn variant="ghost" onClick={() => navigate("/admin/hrd/abs/personel")}>
                    <Icon name="arrow-left" /> Kembali
                  </ScBtn>
                  {!isNew ? (
                    <ScBtn variant="soft" disabled={loading} onClick={() => loadData()}>
                      <Icon name="reload" /> Refresh
                    </ScBtn>
                  ) : null}
                </div>
              }
            />

            {isNew ? (
              <ScNotice tone="info">
                Simpan tab Identitas dulu. Tab lain aktif setelah pegawai tersimpan.
              </ScNotice>
            ) : null}

            {loading ? (
              <div className="sc-empty" role="status">
                <Spinner size="sm" />
                <h3 className="sc-empty__title" style={{ marginTop: 12 }}>
                  Memuat data pegawai…
                </h3>
              </div>
            ) : (
              <div
                id="hrd-emp-layout"
                className={`hrd-emp-layout${isNew ? " hrd-emp-layout--new" : ""}`}
              >
                <div className="hrd-emp-main">
                  <div className="sc-panel sc-panel--flush hrd-emp-tabs-panel">
                    <HrdHScrollRail
                      className="hrd-emp-tabs-rail"
                      trackClassName="hrd-emp-tabs-track"
                      ariaLabel="Tab detail pegawai"
                    >
                      <ScStatusTabs value={activeTab} onChange={handleTabChange} items={tabItems} />
                    </HrdHScrollRail>
                  </div>

                  <div className="sc-panel">
                    <div className="hrd-tab-panel">{renderTab()}</div>
                  </div>
                </div>

                {!isNew ? (
                  <aside
                    className="hrd-emp-side"
                    data-scroll=""
                    data-scroll-sticky=""
                    data-scroll-target="#hrd-emp-layout"
                    data-scroll-offset="-72,0"
                  >
                    <div className="sc-card hrd-emp-side__card">
                      <h6 className="sc-card__title">Ringkasan</h6>
                      {photoUrl && !photoBroken ? (
                        <div className="hrd-emp-side__photo">
                          <img src={photoUrl} alt="" onError={() => setPhotoBroken(true)} />
                        </div>
                      ) : null}
                      <div className="hrd-emp-side__head">
                        <div className="hrd-emp-side__who">
                          <p className="hrd-emp-side__name">{row?.employee_name || "—"}</p>
                          <p className="hrd-emp-side__nik">{row?.nik || "—"}</p>
                        </div>
                        <ScBadge tone={isActive ? "ok" : "bad"}>
                          {isActive ? "Aktif" : "Nonaktif"}
                        </ScBadge>
                      </div>
                      <dl className="hrd-emp-side__dl">
                        {[
                          ["Jabatan", row?.jabatan],
                          ["Divisi", row?.divisi || row?.department],
                          ["Status", row?.status_pegawai],
                          ["Cabang", row?.branch_name],
                          ["Brand", row?.brand],
                          ["Lokasi absen", row?.lokasi_absen],
                        ].map(([label, value]) => (
                          <div key={label} className="hrd-emp-side__row">
                            <dt>{label}</dt>
                            <dd>{value || "—"}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </aside>
                ) : null}
              </div>
            )}
          </div>
        </PageSmoothScroll>
      </Content>
    </AccessGuard>
  );
};

export default HrdPersonelInfoPage;
