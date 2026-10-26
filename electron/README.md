# AMS POS — Electron (shell / webview)

Electron membungkus URL web POS. Cash drawer = ESC/POS ke thermal.

## Cash drawer (CITIZEN CT-D150)

Port USB printer (`USB001`) **tidak bisa** ditulis langsung sebagai file —
`\\.\USB001` selalu gagal dengan "Could not find file". Yang jalan adalah kirim
RAW lewat print spooler Windows ke **nama printer**.

Di `.env`:
```
CASH_DRAWER_MODE=raw
ELECTRON_PRINTER_NAME=CITIZEN CT-D150
CASH_DRAWER_PIN=2
CASH_DRAWER_WITH_CUT=1
```

`ELECTRON_PRINTER_NAME` boleh dikosongkan; Electron auto-detect printer yang
namanya cocok CITIZEN / EPSON / POS / CT-D / TM-.

`ELECTRON_PRINTER_SHARE` hanya dipakai kalau printer di-share
(`\\localhost\NamaShare`) atau colok ke port COM/LPT.

Kalau drawer tidak terbuka, coba pin lain:
```
CASH_DRAWER_PIN=5
```

**Wajib restart** Electron setelah ubah `.env` (Ctrl+C lalu `npm run electron:dev`).

Di log terminal harus muncul:
```
[electron] cash drawer mode → raw
[electron] cash drawer target → CITIZEN CT-D150
[electron] cash drawer RAW OK → spooler:CITIZEN CT-D150 pin 2 +cut
```

Bukan "Simulate OK".

## Tes drawer tanpa buka app

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\electron\test-drawer.ps1 -PrinterName "CITIZEN CT-D150" -Pin 2
```

Tambah `-WithCut` untuk sekalian potong kertas. Output `RAW_OK` = data
diterima printer.

## Jalanin

```bash
npm run electron:dev
```
