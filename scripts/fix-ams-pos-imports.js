const fs = require("fs");
const path = require("path");

const root = "D:/BODO/KANTOR/REACT/POS_React/src/modules/ams-pos";

const map = [
  ["@/components/pos/", "components/pos/"],
  ["@/components/ui/", "components/ui/"],
  ["@/modules/payment/", "payment/"],
  ["@/modules/payment", "payment"],
  ["@/lib/", "lib/"],
  ["@/store/", "store/"],
  ["@/data/", "data/"],
  ["@/types/", "types/"],
];

function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(tsx?|jsx?)$/.test(e.name)) fix(p);
  }
}

function resolveTarget(spec) {
  for (const [k, v] of map) {
    if (spec === k.replace(/\/$/, "") || spec.startsWith(k) || spec === "@/" + v.replace(/\/$/, "")) {
      if (spec.startsWith(k)) return path.join(root, v, spec.slice(k.length));
      if (spec === "@/modules/payment") return path.join(root, "payment");
    }
  }
  for (const [k, v] of map) {
    if (spec.startsWith(k)) return path.join(root, v + spec.slice(k.length));
  }
  return null;
}

function fix(file) {
  let s = fs.readFileSync(file, "utf8");
  const orig = s;
  s = s.replace(/^"use client";\r?\n/gm, "");
  s = s.replace(/import Image from ["']next\/image["'];?\r?\n/g, "");

  s = s.replace(/from ["'](@\/[^"']+)["']/g, (m, spec) => {
    let target = null;
    for (const [k, v] of map) {
      if (spec === k.replace(/\/$/, "")) {
        target = path.join(root, v.replace(/\/$/, ""));
        break;
      }
      if (spec.startsWith(k)) {
        target = path.join(root, v, spec.slice(k.length));
        break;
      }
    }
    if (!target && spec === "@/modules/payment") {
      target = path.join(root, "payment");
    }
    if (!target) {
      console.log("UNMAPPED", path.relative(root, file), spec);
      return m;
    }
    let rel = path.relative(path.dirname(file), target).replace(/\\/g, "/");
    if (!rel.startsWith(".")) rel = "./" + rel;
    return `from "${rel}"`;
  });

  // next/image JSX -> img (simple)
  s = s.replace(/<Image(\s[^>]*)\/>/g, "<img$1/>");
  s = s.replace(/<Image(\s[^>]*)>/g, "<img$1>");
  s = s.replace(/<\/Image>/g, "</img>");

  if (s !== orig) {
    fs.writeFileSync(file, s);
    console.log("fixed", path.relative(root, file));
  }
}

walk(root);
console.log("done");
