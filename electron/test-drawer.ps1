param(
  [string]$PrinterName = "CITIZEN CT-D150",
  [ValidateSet("2", "5")][string]$Pin = "2",
  [switch]$WithCut
)

$ErrorActionPreference = 'Stop'

$kick = if ($Pin -eq "5") {
  [byte[]](0x1B, 0x70, 0x01, 0x19, 0xFA)
} else {
  [byte[]](0x1B, 0x70, 0x00, 0x19, 0xFA)
}

$payload = $kick
if ($WithCut) {
  $payload = $kick + [byte[]](0x1D, 0x56, 0x01)
}

$tmp = Join-Path $env:TEMP "ams-kick-test.bin"
[System.IO.File]::WriteAllBytes($tmp, $payload)

Write-Output ("Printer : " + $PrinterName)
Write-Output ("Pin     : " + $Pin)
Write-Output ("Bytes   : " + $payload.Length)

& (Join-Path $PSScriptRoot "raw-print.ps1") -PrinterName $PrinterName -FilePath $tmp

Remove-Item $tmp -ErrorAction SilentlyContinue
