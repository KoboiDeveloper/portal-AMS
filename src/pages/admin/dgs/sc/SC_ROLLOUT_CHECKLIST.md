# DigitalSales × Seller Center — Checklist pantauan

Centang di PR / saat QA. **Routing, API, RBAC, dan business logic lama harus tetap jalan.**

Legenda: `[x]` selesai · `[ ]` belum · `[~]` parsial / deferred

---

## A. Fondasi (Phase 1 + fidelity)

- [x] Design tokens SC teal untuk konten (`sc-tokens.css`) — **top bar AMS tidak diubah**
- [x] Primitives: AttentionBar, FilterChips, SettlementStrip, CaseCard, Tabs, Empty…
- [x] `DgsContentShell` + `DgsSubNav` (di bawah AdminHeader)
- [x] Akses cepat modal (R02) via sub-nav + localStorage
- [x] Module map + nav groups

## B. Beranda — `/dgs/dashboard` (`DGS_DASH`)

- [x] `ScPageHeader` + filter card
- [x] Notice dismissible
- [x] Action Summary Strip (klik → modul terkait)
- [x] KPI klikable → prasales / AR / retur
- [x] Skeleton / empty / error + retry
- [x] Chart & tabel aging (logic lama)

**QA cepat**
- [ ] Refresh & ganti periode memuat ulang data
- [ ] Klik “Pending confirm” → `/dgs/prasales?status=0`
- [ ] Klik baris aging pending → prasales by invoice

## C. Pesanan / Prasales — `/dgs/prasales` (`DGS_PRASALES`)

- [x] Shell SC (header, filter, empty, error)
- [x] Status tabs (Semua / New / Approved / Rejected) + count
- [x] Urgency visual (umur New >7 / >14)
- [x] Modal Confirm Sales tidak diubah

**QA cepat**
- [ ] Tab New filter status `0` + page reset
- [ ] Cari invoice / store tetap berfungsi
- [ ] Klik baris buka Confirm Sales

## D. Pengembalian

### D1. Dashboard retur — `/dgs/retur-dashboard` (`DGS_RETUR_DASH`)
- [x] Shell SC + KPI klikable
- [ ] (opsional) Case urgency strip per SLA

### D2. Retur list — `/dgs/retur-list` (`DGS_RETUR_LIST`)
- [x] Shell SC saat mode DGS
- [x] Notice konteks retur
- [x] Toggle tampilan Tabel / Kartu kasus
- [x] API / filter / modal lama utuh

### D3. Gudang retur — `/dgs/retur` (`DGS_RETUR` / `DGS_RETUR_GUDANG`)
- [x] Shell SC saat `dgs`
- [x] Edit / confirm modal tidak diubah

**QA cepat**
- [ ] Filter + Cari retur-list
- [ ] Toggle kartu menampilkan invoice/status
- [ ] Gudang: Edit baris → konfirmasi

## E. Keuangan

### E1. AR List — `/dgs/ar-list` (`DGS_AR_LIST`)
- [x] Shell SC + notice
- [x] Komisi strip / upload / modal AR tetap
- [ ] (opsional) Settlement equation KPI (R05) bila data API tersedia

### E2. AR Realisasi — `/dgs/ar-realisasi` (`DGS_AR_REALISASI`)
- [x] Shell SC saat `dgs`
- [x] Klik baris Belum → modal realisasi

**QA cepat**
- [ ] Mode store / report AR list
- [ ] Edit AR & upload (store yang diizinkan)
- [ ] Realisasi simpan sukses

## F. Produk & pengaturan

### F1. Analisa barang — `/dgs/analisa-barang` (`DGS_ANALISA_BARANG`)
- [x] Shell SC (header, filter, error)
- [x] Insight / chart / export logic lama

### F2. Setting komisi — `/dgs/komisi-setting` (`DGS_KOMISI`)
- [x] Shell SC
- [x] CRUD komisi tidak diubah

## G. Deferred (sengaja belum / di luar DGS page)

- [~] Global topbar/sidebar SC (tetap DashLite AMS)
- [~] Modal Akses Cepat (R02) + persist preferensi
- [~] Detail pesanan 2-kolom full (R04) — Confirm Sales modal cukup untuk sekarang
- [~] Settlement equation penuh (R05) tanpa kontrak API baru
- [~] Unit/e2e test otomatis

## H. Regresi lintas-mode

- [ ] Regional AR List (`/regional/...`) **tanpa** class SC (tidak rusak layout)
- [ ] Regional MP Retur / Realisasi non-DGS tetap view-only seperti semula
- [ ] Permission `AccessGuard` tiap route DGS

---

## File map singkat

| Area | Path |
|------|------|
| Tokens/UI | `src/pages/admin/dgs/sc/*` |
| Dashboard | `DgsDashboardPage.js` |
| Prasales | `DgsPrasalesPage.js` |
| Retur dash | `DgsReturDashboardPage.js` |
| Analisa | `DgsProductAnalysisPage.js` |
| Komisi | `DgsKomisiSettingPage.js` |
| AR / Retur list | `regional/RegMpArListPage.js` (`dgs` / `dgsReturOnly`) |
| Realisasi | `regional/RegMpArRealisasiPage.js` (`dgs`) |
| Gudang | `regional/RegMpReturPage.js` (`dgs`) |

**Cara pantau:** update centang di section B–F saat QA; deferred G tetap terbuka sampai diprioritaskan.
