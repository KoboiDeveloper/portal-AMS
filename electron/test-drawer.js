const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");

const kick = Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]);
const tmp = path.join(os.tmpdir(), "ams-drawer-test.bin");
const target = "\\\\.\\USB001";

fs.writeFileSync(tmp, kick);
execFile("cmd.exe", ["/c", "copy", "/b", tmp, target], { windowsHide: true }, (err, stdout, stderr) => {
  console.log("stdout:", stdout);
  console.log("stderr:", stderr);
  console.log("err:", err && err.message);
  try { fs.unlinkSync(tmp); } catch {}
  process.exit(err ? 1 : 0);
});
