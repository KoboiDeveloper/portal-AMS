const fs = require("fs");
const path = require("path");
const root = "D:/BODO/KANTOR/REACT/POS_React/src/modules/ams-pos";

const replacements = [
  [/#f0efe9/g, "#f5f6fa"],
  [/#f5f4ef/g, "#f5f6fa"],
  [/#f7f6f2/g, "#f5f6fa"],
  [/#e2dfd7/g, "#dbdfea"],
  [/#e8e6de/g, "#dbdfea"],
  [/#dddbd4/g, "#dbdfea"],
  [/#ede9df/g, "#ebeef2"],
  [/#ece9e0/g, "#ebeef2"],
  [/h-screen/g, "h-full"],
  [/bg-amber-400/g, "bg-primary"],
  [/text-amber-400/g, "text-primary"],
  [/ring-amber-400/g, "ring-primary"],
  [/from-amber-400/g, "from-primary"],
  [/to-orange-500/g, "to-primary-700"],
];

function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(tsx?|css)$/.test(e.name)) {
      let s = fs.readFileSync(p, "utf8");
      const o = s;
      for (const [a, b] of replacements) s = s.replace(a, b);
      if (s !== o) {
        fs.writeFileSync(p, s);
        console.log("styled", path.relative(root, p));
      }
    }
  }
}
walk(root);
