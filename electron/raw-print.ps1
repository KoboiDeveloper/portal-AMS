param(
  [Parameter(Mandatory = $true)][string]$PrinterName,
  [Parameter(Mandatory = $true)][string]$FilePath
)

$ErrorActionPreference = 'Stop'

# Port USB (USB001) tidak bisa dibuka sebagai file. Kirim RAW lewat spooler Windows.
$code = @'
using System;
using System.Runtime.InteropServices;

public static class AmsRawPrinter
{
    [StructLayout(LayoutKind.Sequential)]
    public struct DOCINFOA
    {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }

    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, ref DOCINFOA di);

    [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

    public static void SendBytes(string printerName, byte[] bytes)
    {
        IntPtr hPrinter;
        if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero))
            throw new Exception("OpenPrinter gagal (" + printerName + ") err=" + Marshal.GetLastWin32Error());

        try
        {
            DOCINFOA di = new DOCINFOA();
            di.pDocName = "AMS POS RAW";
            di.pDataType = "RAW";

            if (!StartDocPrinter(hPrinter, 1, ref di))
                throw new Exception("StartDocPrinter gagal err=" + Marshal.GetLastWin32Error());
            try
            {
                if (!StartPagePrinter(hPrinter))
                    throw new Exception("StartPagePrinter gagal err=" + Marshal.GetLastWin32Error());
                try
                {
                    IntPtr buf = Marshal.AllocCoTaskMem(bytes.Length);
                    try
                    {
                        Marshal.Copy(bytes, 0, buf, bytes.Length);
                        int written;
                        if (!WritePrinter(hPrinter, buf, bytes.Length, out written))
                            throw new Exception("WritePrinter gagal err=" + Marshal.GetLastWin32Error());
                    }
                    finally { Marshal.FreeCoTaskMem(buf); }
                }
                finally { EndPagePrinter(hPrinter); }
            }
            finally { EndDocPrinter(hPrinter); }
        }
        finally { ClosePrinter(hPrinter); }
    }
}
'@

Add-Type -TypeDefinition $code -Language CSharp | Out-Null

$bytes = [System.IO.File]::ReadAllBytes($FilePath)
[AmsRawPrinter]::SendBytes($PrinterName, $bytes)
Write-Output "RAW_OK"
