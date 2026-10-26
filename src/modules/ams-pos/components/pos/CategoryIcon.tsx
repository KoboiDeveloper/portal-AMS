import type { ReactNode } from "react";

type IconDef = {
  fg: string;
  bg: string;
  art: ReactNode;
};

const ICONS = {
  tshirt: {
    fg: "#4F46E5",
    bg: "#EEF0FF",
    art: (
      <>
        <path
          d="M18 8h12l10 5-4 8-4-2v21a2 2 0 0 1-2 2H20a2 2 0 0 1-2-2V19l-4 2-4-8z"
          fill="currentColor"
          fillOpacity=".14"
        />
        <path d="M18 8c1.8 2.9 3.6 4.3 6 4.3S28.2 10.9 30 8" />
      </>
    ),
  },
  shirt: {
    fg: "#0EA5E9",
    bg: "#E6F6FE",
    art: (
      <>
        <path
          d="M17 9h14l9 5-4 8-3.5-2v20a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V20l-3.5 2-4-8z"
          fill="currentColor"
          fillOpacity=".14"
        />
        <path d="M19.5 9 24 15l4.5-6M24 15v26" />
      </>
    ),
  },
  dress: {
    fg: "#DB2777",
    bg: "#FDECF5",
    art: (
      <>
        <path
          d="M18 8h12l7 4-3 6-3-1.5 1 6 6 18H12l6-18-1-6-3 1.5-3-6z"
          fill="currentColor"
          fillOpacity=".14"
        />
        <path d="M18 8c1.8 2.8 3.6 4.2 6 4.2S28.2 10.8 30 8M17.4 22.5h13.2" />
      </>
    ),
  },
  pants: {
    fg: "#0F766E",
    bg: "#E3F5F2",
    art: (
      <>
        <path
          d="M14 8h20v6l-2 28h-7l-1-18-1 18h-7l-2-28z"
          fill="currentColor"
          fillOpacity=".14"
        />
        <path d="M14 14h20" />
      </>
    ),
  },
  shorts: {
    fg: "#0891B2",
    bg: "#E4F6FA",
    art: (
      <>
        <path
          d="M14 10h20v5l-1.5 15h-7L24 21l-1.5 9h-7L14 15z"
          fill="currentColor"
          fillOpacity=".14"
        />
        <path d="M14 15h20" />
      </>
    ),
  },
  skirt: {
    fg: "#9333EA",
    bg: "#F4EAFE",
    art: (
      <>
        <path
          d="M15 10h18l1 6 4 24H10l4-24z"
          fill="currentColor"
          fillOpacity=".14"
        />
        <path d="M14 16h20M20 17l-1 23M28 17l1 23" />
      </>
    ),
  },
  jacket: {
    fg: "#B45309",
    bg: "#FCF1E1",
    art: (
      <>
        <path
          d="M18 8h12l9 5-4 8-3-1.5V40a2 2 0 0 1-2 2H20a2 2 0 0 1-2-2V19.5L15 21l-4-8z"
          fill="currentColor"
          fillOpacity=".14"
        />
        <path d="M18 8l6 7 6-7M24 15v27M17 31h4M27 31h4" />
      </>
    ),
  },
  hoodie: {
    fg: "#4338CA",
    bg: "#EEF0FF",
    art: (
      <>
        <path
          d="M18 14h12c2.5 0 4.5-2.2 4.5-5 0-2.8-2-5-4.5-5h-12c-2.5 0-4.5 2.2-4.5 5 0 2.8 2 5 4.5 5z"
          fill="currentColor"
          fillOpacity=".1"
        />
        <path
          d="M17 14h14l8 4v10a2 2 0 0 1-2 2h-2.5v12a2 2 0 0 1-2 2H19.5a2 2 0 0 1-2-2V30H15a2 2 0 0 1-2-2V18z"
          fill="currentColor"
          fillOpacity=".14"
        />
        <path d="M18 9c1.6 2.4 3.4 3.6 6 3.6S28.4 11.4 30 9M24 14v28M14 28h4M30 28h4" />
      </>
    ),
  },
  sweater: {
    fg: "#C2410C",
    bg: "#FDEEE6",
    art: (
      <>
        <path
          d="M18 9h12l9 4v11a2 2 0 0 1-2 2h-3v13a2 2 0 0 1-2 2H20a2 2 0 0 1-2-2V26h-3a2 2 0 0 1-2-2V13z"
          fill="currentColor"
          fillOpacity=".14"
        />
        <path d="M18 9c1.8 2.8 3.6 4.2 6 4.2S28.2 11.8 30 9M18 37h16M13 22h5M34 22h5" />
      </>
    ),
  },
  vest: {
    fg: "#475569",
    bg: "#EEF1F5",
    art: (
      <>
        <path
          d="M17 9h5l2 6 2-6h5l3 3v28a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2V12z"
          fill="currentColor"
          fillOpacity=".14"
        />
        <path d="M24 15v27" />
      </>
    ),
  },
  tank: {
    fg: "#E11D48",
    bg: "#FDEAEE",
    art: (
      <>
        <path
          d="M16 12l3-4c1 4 2.2 5 5 5s4-1 5-5l3 4v26a2 2 0 0 1-2 2H18a2 2 0 0 1-2-2z"
          fill="currentColor"
          fillOpacity=".14"
        />
        <path d="M19 22h10M19 27h10" />
      </>
    ),
  },
  belt: {
    fg: "#92400E",
    bg: "#F5EDE6",
    art: (
      <>
        <path
          d="M6 22h36v6H6z"
          fill="currentColor"
          fillOpacity=".14"
        />
        <rect x="18" y="20" width="12" height="10" rx="1.5" />
        <path d="M24 20v10M21 25h6" />
      </>
    ),
  },
  bag: {
    fg: "#7C4A2A",
    bg: "#F5EDE7",
    art: (
      <>
        <path
          d="M12 18h24l-2 22a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2z"
          fill="currentColor"
          fillOpacity=".14"
        />
        <path d="M18 18v-3a6 6 0 0 1 12 0v3" />
      </>
    ),
  },
  suitcase: {
    fg: "#1E3A5F",
    bg: "#E8EEF5",
    art: (
      <>
        <path
          d="M10 18h28a2 2 0 0 1 2 2v18a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V20a2 2 0 0 1 2-2z"
          fill="currentColor"
          fillOpacity=".14"
        />
        <path d="M18 18v-4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4M8 28h32M16 26v4M32 26v4" />
      </>
    ),
  },
  shoes: {
    fg: "#334155",
    bg: "#EDF0F4",
    art: (
      <>
        <path
          d="M10 30l3-7c.6-1.4 2.3-1.8 3.4-.8l3.6 3.2 6.5 1.4c4 .9 7.4 2.9 9.5 5.6l1 1.3V38a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2z"
          fill="currentColor"
          fillOpacity=".14"
        />
        <path d="M20 26l2-2M24.5 27l2-2.5M10 36h27" />
      </>
    ),
  },
  hat: {
    fg: "#CA8A04",
    bg: "#FBF3DC",
    art: (
      <>
        <path
          d="M13 31c0-7 4.9-13 11-13s11 6 11 13z"
          fill="currentColor"
          fillOpacity=".14"
        />
        <path
          d="M9 31h30a2 2 0 0 1 0 4H9a2 2 0 0 1 0-4z"
          fill="currentColor"
          fillOpacity=".14"
        />
      </>
    ),
  },
  socks: {
    fg: "#2563EB",
    bg: "#E8EFFD",
    art: (
      <>
        <path
          d="M18 8h8v16.5c0 2.2-.8 4.3-2.3 5.9l-4.3 4.6a5.2 5.2 0 1 1-7.6-7.1l4.3-4.6c1.2-1.3 1.9-3 1.9-4.8z"
          fill="currentColor"
          fillOpacity=".14"
        />
        <path d="M18 13h8" />
      </>
    ),
  },
  scarf: {
    fg: "#0D9488",
    bg: "#E2F5F2",
    art: (
      <path
        d="M24 8a12 12 0 0 1 12 12v6h-6v-6a6 6 0 0 0-12 0v20h-6V20A12 12 0 0 1 24 8z"
        fill="currentColor"
        fillOpacity=".14"
      />
    ),
  },
  tag: {
    fg: "#64748B",
    bg: "#EFF1F4",
    art: (
      <>
        <path
          d="M28 8h10a2 2 0 0 1 2 2v10L22 38a3 3 0 0 1-4.2 0L8 28.2a3 3 0 0 1 0-4.2z"
          fill="currentColor"
          fillOpacity=".14"
        />
        <circle cx="33.5" cy="14.5" r="2" />
      </>
    ),
  },
} satisfies Record<string, IconDef>;

type IconKey = keyof typeof ICONS;

/** Urutan penting: kata yang lebih spesifik harus dicek lebih dulu. */
const KEYWORD_MAP: Array<[string, IconKey]> = [
  ["LIFE STYLE", "suitcase"],
  ["LIFESTYLE", "suitcase"],
  ["KOPER", "suitcase"],
  ["SUITCASE", "suitcase"],
  ["LUGGAGE", "suitcase"],
  ["SINGLET", "tank"],
  ["KAOS DALAM", "tank"],
  ["INNER", "tank"],
  ["UNDERWEAR", "tank"],
  ["TANK", "tank"],
  ["CAMISOLE", "tank"],
  ["HEAD", "hat"],
  ["TOPI", "hat"],
  ["HAT", "hat"],
  ["CAP", "hat"],
  ["BEANIE", "hat"],
  ["BODY", "belt"],
  ["SABUK", "belt"],
  ["BELT", "belt"],
  ["TSHIRT", "tshirt"],
  ["TEE", "tshirt"],
  ["KAOS KAKI", "socks"],
  ["KAOS", "tshirt"],
  ["POLO", "tshirt"],
  ["BLOUSE", "shirt"],
  ["BLUS", "shirt"],
  ["KEMEJA", "shirt"],
  ["SHIRT", "shirt"],
  ["DRESS", "dress"],
  ["GAUN", "dress"],
  ["TERUSAN", "dress"],
  ["JUMPSUIT", "dress"],
  ["CARDIGAN", "sweater"],
  ["SWEATER", "sweater"],
  ["HOODIE", "hoodie"],
  ["KNIT", "sweater"],
  ["RAJUT", "sweater"],
  ["JACKET", "hoodie"],
  ["JAKET", "hoodie"],
  ["BLAZER", "jacket"],
  ["COAT", "jacket"],
  ["OUTER", "jacket"],
  ["VEST", "vest"],
  ["ROMPI", "vest"],
  ["SHORT", "shorts"],
  ["SKIRT", "skirt"],
  ["ROK", "skirt"],
  ["JEANS", "pants"],
  ["DENIM", "pants"],
  ["TROUSER", "pants"],
  ["LEGGING", "pants"],
  ["CULOTTE", "pants"],
  ["PANT", "pants"],
  ["CELANA", "pants"],
  ["BOTTOM", "pants"],
  ["SOCK", "socks"],
  ["SHOE", "shoes"],
  ["SEPATU", "shoes"],
  ["SANDAL", "shoes"],
  ["SNEAKER", "shoes"],
  ["BOOT", "shoes"],
  ["HEELS", "shoes"],
  ["FOOTWEAR", "shoes"],
  ["BAG", "bag"],
  ["TAS", "bag"],
  ["POUCH", "bag"],
  ["WALLET", "bag"],
  ["DOMPET", "bag"],
  ["HIJAB", "scarf"],
  ["SCARF", "scarf"],
  ["PASHMINA", "scarf"],
  ["SYAL", "scarf"],
  ["KERUDUNG", "scarf"],
  ["ACCESS", "hat"],
  ["AKSESO", "hat"],
  ["TOP", "tshirt"],
  ["ATASAN", "tshirt"],
];

function iconKeyFor(label: string): IconKey {
  const key = (label || "").toUpperCase();
  for (const [keyword, icon] of KEYWORD_MAP) {
    if (key.includes(keyword)) return icon;
  }
  return "tag";
}

type CategoryIconProps = {
  label: string;
  className?: string;
};

export function CategoryIcon({ label, className }: CategoryIconProps) {
  const icon = ICONS[iconKeyFor(label)];

  return (
    <span
      className={className}
      style={{ background: icon.bg, color: icon.fg }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {icon.art}
      </svg>
    </span>
  );
}
