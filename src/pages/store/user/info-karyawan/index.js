import React, { useCallback, useEffect, useMemo, useState } from "react";
import Head from "../../../../layout/head/Head";
import Content from "../../../../layout/content/Content";
import {
  Block,
  BlockBetween,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Button,
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTableItem,
  DataTableRow,
  Icon,
  PaginationComponent,
  UserAvatar,
} from "../../../../components/Component";
import { DropdownItem, DropdownMenu, DropdownToggle, UncontrolledDropdown, Modal, ModalBody } from "reactstrap";
import { Link } from "react-router-dom";
import { useStoreScope } from "../../../../hooks/useStoreScope";
import { storeEmployeeService } from "../../../../services/store-employee.service";
import { extractRows, isSuccess } from "../../../../lib/response";
import { findUpper } from "../../../../utils/Utils";
import { buildImageProfileUrl } from "../../../../lib/imageProfile";
import { appPath } from "../../../../lib/paths";

/** Field names from xsp_ams_new_personal_list_store_api_getrows response. */
const mapEmployeeRow = (row, index, offset = 0) => {
  const photo = row?.Photo ?? row?.photo ?? "";
  return {
    no: offset + index + 1,
    nik: row?.NomorIndukStr || "-",
    pegawai: row?.NamaLengkapStr || "-",
    pangkat: row?.PangkatStr || "-",
    jabatan: row?.JabatanStr || "-",
    status: row?.StatusPegawaiStr || "-",
    isInactive: Number(row?.PegawaiNonAktifInt) === 1,
    photoUrl: buildImageProfileUrl(photo),
    detailKey: row?.NomorIndukStr?.trim() || String(row?.ID ?? index),
    id: row?.ID ?? `${row?.NomorIndukStr || "row"}-${index}`,
  };
};

const statusTone = (status, isInactive) => {
  if (isInactive) return "danger";
  const value = String(status || "").toLowerCase();
  if (["kontrak", "tetap", "permanent"].includes(value)) return "success";
  if (["temporer", "temporary"].includes(value)) return "warning";
  return "secondary";
};

const InfoKaryawanPage = () => {
  const { storeId, storeName } = useStoreScope();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sm, setSm] = useState(false);
  const [tableSm, setTableSm] = useState(false);
  const [onSearch, setOnSearch] = useState(true);
  const [keywords, setKeywords] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemPerPage, setItemPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState("");
  const [photoPreview, setPhotoPreview] = useState({ open: false, url: "", name: "", nik: "" });

  const openPhotoPreview = (item) => {
    if (!item.photoUrl) return;
    setPhotoPreview({
      open: true,
      url: item.photoUrl,
      name: item.pegawai,
      nik: item.nik,
    });
  };

  const closePhotoPreview = () => {
    setPhotoPreview({ open: false, url: "", name: "", nik: "" });
  };

  const loadData = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    setError("");
    try {
      const res = await storeEmployeeService.list({
        keywords: keywords.trim(),
        store_id: storeId,
      });
      if (!isSuccess(res)) {
        throw res;
      }
      setRows(extractRows(res));
      setCurrentPage(1);
    } catch (err) {
      setError(err?.responseMessage || "Gagal memuat data karyawan");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [storeId, keywords]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredRows = useMemo(() => {
    if (statusFilter === "active") {
      return rows.filter((row) => Number(row?.PegawaiNonAktifInt) !== 1);
    }
    if (statusFilter === "inactive") {
      return rows.filter((row) => Number(row?.PegawaiNonAktifInt) === 1);
    }
    return rows;
  }, [rows, statusFilter]);

  const indexOfLastItem = currentPage * itemPerPage;
  const indexOfFirstItem = indexOfLastItem - itemPerPage;
  const currentItems = useMemo(() => {
    const slice = filteredRows.slice(indexOfFirstItem, indexOfLastItem);
    return slice.map((row, index) => mapEmployeeRow(row, index, indexOfFirstItem));
  }, [filteredRows, indexOfFirstItem, indexOfLastItem]);

  const applyStatusFilter = (value) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  const toggleSearch = () => setOnSearch((prev) => !prev);

  const submitSearch = (ev) => {
    ev?.preventDefault();
    setKeywords(searchInput);
  };

  return (
    <>
      <Head title="Info Karyawan" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle tag="h3" page>
                Info Karyawan
              </BlockTitle>
              <BlockDes className="text-soft">
                <p>
                  Daftar karyawan store {storeName ? `${storeName} (${storeId})` : storeId || "-"}
                  {statusFilter === ""
                    ? ` — total ${rows.length} pegawai.`
                    : ` — menampilkan ${filteredRows.length} dari ${rows.length} pegawai.`}
                </p>
              </BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <div className="toggle-wrap nk-block-tools-toggle">
                <Button
                  className={`btn-icon btn-trigger toggle-expand me-n1 ${sm ? "active" : ""}`}
                  onClick={() => setSm((prev) => !prev)}
                >
                  <Icon name="menu-alt-r"></Icon>
                </Button>
                <div className="toggle-expand-content" style={{ display: sm ? "block" : "none" }}>
                  <ul className="nk-block-tools g-3">
                    <li>
                      <Button color="light" outline className="btn-white" onClick={loadData} disabled={loading}>
                        <Icon name="reload"></Icon>
                        <span>Refresh</span>
                      </Button>
                    </li>
                  </ul>
                </div>
              </div>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Block className="info-karyawan-page">
          <DataTable className="card-stretch">
            <div className="card-inner position-relative card-tools-toggle">
              <div className="card-title-group">
                <div className="card-tools">
                  <ul className="card-tools-nav">
                    <li className={statusFilter === "" ? "active" : ""}>
                      <a
                        href="#all"
                        onClick={(ev) => {
                          ev.preventDefault();
                          applyStatusFilter("");
                        }}
                      >
                        <span>All</span>
                      </a>
                    </li>
                    <li className={statusFilter === "active" ? "active" : ""}>
                      <a
                        href="#aktif"
                        onClick={(ev) => {
                          ev.preventDefault();
                          applyStatusFilter("active");
                        }}
                      >
                        <span>Aktif</span>
                      </a>
                    </li>
                    <li className={statusFilter === "inactive" ? "active" : ""}>
                      <a
                        href="#nonaktif"
                        onClick={(ev) => {
                          ev.preventDefault();
                          applyStatusFilter("inactive");
                        }}
                      >
                        <span>Non Aktif</span>
                      </a>
                    </li>
                  </ul>
                </div>
                <div className="card-tools me-n1">
                  <ul className="btn-toolbar gx-1">
                    <li>
                      <a
                        href="#search"
                        onClick={(ev) => {
                          ev.preventDefault();
                          toggleSearch();
                        }}
                        className="btn btn-icon search-toggle toggle-search"
                      >
                        <Icon name="search"></Icon>
                      </a>
                    </li>
                    <li className="btn-toolbar-sep"></li>
                    <li>
                      <div className="toggle-wrap">
                        <Button
                          className={`btn-icon btn-trigger toggle ${tableSm ? "active" : ""}`}
                          onClick={() => setTableSm(true)}
                        >
                          <Icon name="menu-right"></Icon>
                        </Button>
                        <div className={`toggle-content ${tableSm ? "content-active" : ""}`}>
                          <ul className="btn-toolbar gx-1">
                            <li className="toggle-close">
                              <Button className="btn-icon btn-trigger toggle" onClick={() => setTableSm(false)}>
                                <Icon name="arrow-left"></Icon>
                              </Button>
                            </li>
                            <li>
                              <UncontrolledDropdown>
                                <DropdownToggle color="tranparent" className="btn btn-trigger btn-icon dropdown-toggle">
                                  <Icon name="setting"></Icon>
                                </DropdownToggle>
                                <DropdownMenu end className="dropdown-menu-xs">
                                  <ul className="link-check">
                                    <li>
                                      <span>Show</span>
                                    </li>
                                    <li className={itemPerPage === 10 ? "active" : ""}>
                                      <DropdownItem
                                        tag="a"
                                        href="#dropdownitem"
                                        onClick={(ev) => {
                                          ev.preventDefault();
                                          setItemPerPage(10);
                                          setCurrentPage(1);
                                        }}
                                      >
                                        10
                                      </DropdownItem>
                                    </li>
                                    <li className={itemPerPage === 15 ? "active" : ""}>
                                      <DropdownItem
                                        tag="a"
                                        href="#dropdownitem"
                                        onClick={(ev) => {
                                          ev.preventDefault();
                                          setItemPerPage(15);
                                          setCurrentPage(1);
                                        }}
                                      >
                                        15
                                      </DropdownItem>
                                    </li>
                                    <li className={itemPerPage === 25 ? "active" : ""}>
                                      <DropdownItem
                                        tag="a"
                                        href="#dropdownitem"
                                        onClick={(ev) => {
                                          ev.preventDefault();
                                          setItemPerPage(25);
                                          setCurrentPage(1);
                                        }}
                                      >
                                        25
                                      </DropdownItem>
                                    </li>
                                  </ul>
                                </DropdownMenu>
                              </UncontrolledDropdown>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
              <div className={`card-search search-wrap ${!onSearch && "active"}`}>
                <div className="card-body">
                  <form className="search-content" onSubmit={submitSearch}>
                    <Button
                      type="button"
                      className="search-back btn-icon toggle-search active"
                      onClick={() => {
                        setSearchInput("");
                        setKeywords("");
                        toggleSearch();
                      }}
                    >
                      <Icon name="arrow-left"></Icon>
                    </Button>
                    <input
                      type="text"
                      className="border-transparent form-focus-none form-control"
                      placeholder="Cari NIK, nama, jabatan..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                    />
                    <Button type="submit" className="search-submit btn-icon">
                      <Icon name="search"></Icon>
                    </Button>
                  </form>
                </div>
              </div>
            </div>

            <DataTableBody>
              <DataTableHead>
                <DataTableRow className="nk-tb-col-check">
                  <span className="sub-text">No</span>
                </DataTableRow>
                <DataTableRow size="md">
                  <span className="sub-text">Photo</span>
                </DataTableRow>
                <DataTableRow size="md">
                  <span className="sub-text">NIK</span>
                </DataTableRow>
                <DataTableRow>
                  <span className="sub-text">Pegawai</span>
                </DataTableRow>
                <DataTableRow size="md">
                  <span className="sub-text">Pangkat</span>
                </DataTableRow>
                <DataTableRow size="lg">
                  <span className="sub-text">Jabatan</span>
                </DataTableRow>
                <DataTableRow size="md">
                  <span className="sub-text">Status</span>
                </DataTableRow>
                <DataTableRow className="nk-tb-col-tools text-end">
                  <span className="sub-text">Action</span>
                </DataTableRow>
              </DataTableHead>

              {!loading && !error && currentItems.length > 0 ? (
                currentItems.map((item) => (
                  <DataTableItem key={item.id}>
                    <DataTableRow className="nk-tb-col-check">
                      <span>{item.no}</span>
                    </DataTableRow>
                    <DataTableRow size="md">
                      {item.photoUrl ? (
                        <span
                          role="button"
                          tabIndex={0}
                          className="employee-photo-trigger"
                          title="Klik untuk lihat foto"
                          onClick={() => openPhotoPreview(item)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openPhotoPreview(item);
                            }
                          }}
                        >
                          <UserAvatar
                            theme="purple-dim"
                            image={item.photoUrl}
                            imageAlt={item.pegawai}
                            text={findUpper(item.pegawai === "-" ? "?" : item.pegawai).slice(0, 2)}
                          />
                        </span>
                      ) : (
                        <UserAvatar
                          theme="purple-dim"
                          imageAlt={item.pegawai}
                          text={findUpper(item.pegawai === "-" ? "?" : item.pegawai).slice(0, 2)}
                        />
                      )}
                    </DataTableRow>
                    <DataTableRow size="md">
                      <span className="tb-lead">{item.nik}</span>
                    </DataTableRow>
                    <DataTableRow>
                      <span className="tb-lead">{item.pegawai}</span>
                    </DataTableRow>
                    <DataTableRow size="md">
                      <span>{item.pangkat}</span>
                    </DataTableRow>
                    <DataTableRow size="lg">
                      <span>{item.jabatan}</span>
                    </DataTableRow>
                    <DataTableRow size="md">
                      <span className={`tb-status text-${statusTone(item.status, item.isInactive)}`}>
                        {item.isInactive ? `${item.status} (Nonaktif)` : item.status}
                      </span>
                    </DataTableRow>
                    <DataTableRow className="nk-tb-col-tools">
                      <Link
                        to={appPath(`/store/user/info-karyawan/${encodeURIComponent(item.detailKey)}`)}
                        className="btn btn-trigger btn-icon btn-sm"
                        title="Detail"
                      >
                        <Icon name="eye" />
                      </Link>
                    </DataTableRow>
                  </DataTableItem>
                ))
              ) : null}
            </DataTableBody>

            <div className="card-inner">
              {loading ? (
                <div className="text-center py-4">
                  <span className="text-soft">Memuat data...</span>
                </div>
              ) : error ? (
                <div className="text-center py-4">
                  <span className="text-danger">{error}</span>
                </div>
              ) : currentItems.length > 0 ? (
                <PaginationComponent
                  itemPerPage={itemPerPage}
                  totalItems={filteredRows.length}
                  paginate={paginate}
                  currentPage={currentPage}
                />
              ) : (
                <div className="text-center">
                  <span className="text-silent">
                    {statusFilter === "active"
                      ? "Tidak ada karyawan aktif"
                      : statusFilter === "inactive"
                        ? "Tidak ada karyawan non aktif"
                        : "Tidak ada data karyawan"}
                  </span>
                </div>
              )}
            </div>
          </DataTable>
        </Block>
      </Content>

      <Modal isOpen={photoPreview.open} toggle={closePhotoPreview} centered size="lg" className="admin-form-modal">
        <ModalBody className="text-center p-4">
          <button type="button" className="close" aria-label="Close" onClick={closePhotoPreview}>
            <span aria-hidden="true">&times;</span>
          </button>
          <h5 className="title mb-1">{photoPreview.name}</h5>
          <p className="text-soft mb-4">{photoPreview.nik !== "-" ? photoPreview.nik : ""}</p>
          <img
            src={photoPreview.url}
            alt={photoPreview.name}
            className="img-fluid rounded"
            style={{ maxHeight: "70vh", objectFit: "contain" }}
          />
        </ModalBody>
      </Modal>
    </>
  );
};

export default InfoKaryawanPage;
