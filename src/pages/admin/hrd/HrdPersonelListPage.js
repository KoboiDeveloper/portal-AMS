import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  Input,
  UncontrolledDropdown,
} from "reactstrap";
import Head from "../../../layout/head/Head";
import Content from "../../../layout/content/Content";
import {
  Block,
  BlockBetween,
  BlockDes,
  BlockHead,
  BlockHeadContent,
  BlockTitle,
  Icon,
} from "../../../components/Component";
import AccessGuard from "../../../components/admin/AccessGuard";
import LoadingState from "../../../components/admin/common/LoadingState";
import ErrorState from "../../../components/admin/common/ErrorState";
import ProjectListTable from "../../../components/admin/common/ProjectListTable";
import { createHrdService } from "../../../services/hrd/hrd.service";
import { extractRows } from "../../../lib/response";

const service = createHrdService("abs/personel", { crud: true });

const ADD_TYPES = [
  { value: "HO", label: "KARYAWAN HO", icon: "building", color: "primary" },
  { value: "MAGANG", label: "MAGANG", icon: "user", color: "success" },
  { value: "MT", label: "MT", icon: "user-list", color: "info" },
  { value: "AMK", label: "AMK", icon: "truck", color: "warning" },
  { value: "AMV", label: "AMV", icon: "eye-off", color: "danger" },
  { value: "MF", label: "MOSTFLY", icon: "map-pin", color: "purple" },
];

const columns = [
  { key: "brand", label: "BRAND", size: "md" },
  { key: "branch_name", label: "CABANG", size: "lg" },
  {
    key: "employee_name",
    label: "PEGAWAI",
    type: "title",
    titleKey: "employee_name",
    subtitleKey: "nik",
  },
  { key: "pangkat", label: "PANGKAT", size: "md" },
  { key: "job_title", label: "JABATAN", size: "md" },
  {
    key: "status",
    label: "STATUS",
    size: "sm",
    render: (row) => row.status || (row.is_active ? "Aktif" : "Nonaktif") || "-",
  },
];

const HrdPersonelListPage = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [currentPage, setCurrentPage] = useState(1);
  const itemPerPage = 25;

  const params = useMemo(
    () => ({
      ...(search ? { search } : {}),
      status,
    }),
    [search, status]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await service.list(params);
      setRows(extractRows(res));
      setCurrentPage(1);
    } catch (err) {
      setError(err?.responseMessage || "Gagal memuat employee list");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openDetail = (row) => {
    navigate(`/admin/hrd/abs/personel/${row.id}`);
  };

  const openAdd = (vType) => {
    navigate(`/admin/hrd/abs/personel/new?vType=${encodeURIComponent(vType)}`);
  };

  return (
    <AccessGuard moduleCode="HRD_ABS_PERSONEL" permission="VIEW">
      <Head title="EMPLOYEE LIST" />
      <Content>
        <BlockHead size="sm">
          <BlockBetween>
            <BlockHeadContent>
              <BlockTitle page tag="h3">
                EMPLOYEE LIST
              </BlockTitle>
              <BlockDes className="text-soft">
                Sesuai legacy personel_list.aspx — filter Status + Keywords, detail buka employee info.
              </BlockDes>
            </BlockHeadContent>
            <BlockHeadContent>
              <ul className="nk-block-tools g-3">
                <li>
                  <Input
                    type="select"
                    bsSize="sm"
                    className="w-140px"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="ALL">ALL</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="NON ACTIVE">NON ACTIVE</option>
                  </Input>
                </li>
                <li>
                  <div className="form-control-wrap w-220px">
                    <div className="form-icon form-icon-left">
                      <Icon name="search" />
                    </div>
                    <Input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Nik/Nama/jabatan/brand"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && loadData()}
                    />
                  </div>
                </li>
                <li>
                  <Button color="info" size="sm" onClick={loadData}>
                    <Icon name="search" />
                    <span>Search</span>
                  </Button>
                </li>
                <li>
                  <Button color="light" size="sm" className="btn-icon" onClick={loadData}>
                    <Icon name="reload" />
                  </Button>
                </li>
                <li>
                  <UncontrolledDropdown>
                    <DropdownToggle caret color="primary" size="sm">
                      Add
                    </DropdownToggle>
                    <DropdownMenu end className="dropdown-menu-md">
                      {ADD_TYPES.map((t) => (
                        <DropdownItem
                          key={t.value}
                          tag="a"
                          href="#add"
                          onClick={(e) => {
                            e.preventDefault();
                            openAdd(t.value);
                          }}
                        >
                          <Icon name={t.icon} />
                          <span>{t.label}</span>
                        </DropdownItem>
                      ))}
                    </DropdownMenu>
                  </UncontrolledDropdown>
                </li>
              </ul>
            </BlockHeadContent>
          </BlockBetween>
        </BlockHead>

        <Block>
          {loading && <LoadingState />}
          {!loading && error && <ErrorState message={error} onRetry={loadData} />}
          {!loading && !error && (
            <ProjectListTable
              columns={columns}
              rows={rows}
              idField="id"
              rowKey={(row) => row.id}
              canEdit={false}
              canDelete={false}
              extraActions={[
                {
                  key: "detail",
                  label: "Detail",
                  icon: "chevron-right",
                  onClick: openDetail,
                },
              ]}
              currentPage={currentPage}
              itemPerPage={itemPerPage}
              onPageChange={setCurrentPage}
            />
          )}
        </Block>
      </Content>
    </AccessGuard>
  );
};

export default HrdPersonelListPage;
