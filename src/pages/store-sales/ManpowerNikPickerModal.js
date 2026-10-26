import React, { useEffect, useMemo, useState } from "react";
import { Modal, ModalBody, Col } from "reactstrap";
import { Button, Icon } from "../../components/Component";

const ManpowerNikPickerModal = ({
  isOpen,
  toggle,
  options,
  value,
  onConfirm,
  loading,
  error,
}) => {
  const [search, setSearch] = useState("");
  const [draftNik, setDraftNik] = useState("");

  useEffect(() => {
    if (isOpen) {
      setDraftNik(value || "");
      setSearch("");
    }
  }, [isOpen, value]);

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return options;
    return options.filter(
      (option) =>
        option.name.toLowerCase().includes(query) ||
        option.nik.toLowerCase().includes(query) ||
        option.label.toLowerCase().includes(query)
    );
  }, [options, search]);

  const handleConfirm = () => {
    if (!draftNik) return;
    onConfirm(draftNik);
    toggle();
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} className="modal-dialog-centered admin-form-modal manpower-nik-picker-modal">
      <ModalBody>
        <a
          href="#close"
          className="close"
          onClick={(e) => {
            e.preventDefault();
            toggle();
          }}
        >
          <Icon name="cross-sm" />
        </a>
        <div className="p-2">
          <h5 className="title">Pilih Karyawan</h5>
          <div className="form-control-wrap mt-3">
            <input
              type="text"
              className="form-control"
              placeholder="Cari nama atau NIK"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="manpower-nik-list mt-3">
            {loading ? (
              <div className="text-center py-4 text-soft">Memuat daftar karyawan...</div>
            ) : error ? (
              <div className="text-center py-4 text-danger">{error}</div>
            ) : filteredOptions.length === 0 ? (
              <div className="text-center py-4 text-soft">
                {search ? "Karyawan tidak ditemukan" : "Belum ada karyawan"}
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`manpower-nik-list__item${draftNik === option.value ? " active" : ""}`}
                  onClick={() => setDraftNik(option.value)}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>

          <Col size="12" className="mt-4 px-0">
            <ul className="align-center flex-wrap flex-sm-nowrap gx-4 gy-2">
              <li>
                <Button color="primary" size="md" onClick={handleConfirm} disabled={!draftNik || loading}>
                  <Icon name="check-thick" />
                  <span>Pilih</span>
                </Button>
              </li>
              <li>
                <Button type="button" className="link link-light" color="link" onClick={toggle}>
                  <Icon name="cross" />
                  <span>Batal</span>
                </Button>
              </li>
            </ul>
          </Col>
        </div>
      </ModalBody>
    </Modal>
  );
};

export default ManpowerNikPickerModal;
