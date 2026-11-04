import React from "react";

/** Line icons bergaya Seller Center (stroke ~1.75, 24×24 viewBox). */
const Svg = ({ children, className = "" }) => (
  <svg
    className={`dgs-nav-icon ${className}`.trim()}
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const stroke = {
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

/** Beranda — rumah outline */
export const IconHome = () => (
  <Svg>
    <path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1h-5.2v-6.2H9.7V21H4.5a1 1 0 0 1-1-1v-9.5Z" {...stroke} />
  </Svg>
);

/** Akses cepat — lingkaran + bintang */
export const IconQuick = () => (
  <Svg>
    <circle cx="12" cy="12" r="9" {...stroke} />
    <path
      d="M12 7.2l1.15 2.55 2.75.3-2.1 1.9.65 2.7L12 13.4l-2.45 1.25.65-2.7-2.1-1.9 2.75-.3L12 7.2Z"
      {...stroke}
    />
  </Svg>
);

/** Pesanan — clipboard + aksen teal di isi */
export const IconOrders = () => (
  <Svg className="dgs-nav-icon--orders">
    <path
      d="M9 4.5h6a1.5 1.5 0 0 1 1.5 1.5v1H7.5V6A1.5 1.5 0 0 1 9 4.5Z"
      {...stroke}
    />
    <path
      d="M7.5 7h9A1.5 1.5 0 0 1 18 8.5v11A1.5 1.5 0 0 1 16.5 21h-9A1.5 1.5 0 0 1 6 19.5v-11A1.5 1.5 0 0 1 7.5 7Z"
      {...stroke}
    />
    <rect className="dgs-nav-icon__accent" x="9.2" y="11" width="5.6" height="3.2" rx="0.6" />
  </Svg>
);

/** Pengembalian — paket + panah putar */
export const IconReturns = () => (
  <Svg>
    <path d="M4.5 9.5 12 5l7.5 4.5v7L12 21l-7.5-4.5v-7Z" {...stroke} />
    <path d="M12 12v9" {...stroke} />
    <path d="M4.5 9.5 12 14l7.5-4.5" {...stroke} />
    <path d="M8.2 15.2a3.6 3.6 0 0 0 5.2 1.1" {...stroke} />
    <path d="M14.6 14.8h1.6v1.6" {...stroke} />
  </Svg>
);

/** Produk — shopping bag */
export const IconProduct = () => (
  <Svg>
    <path
      d="M6.2 8.5h11.6l-.7 10.2a1.6 1.6 0 0 1-1.6 1.5H8.5a1.6 1.6 0 0 1-1.6-1.5L6.2 8.5Z"
      {...stroke}
    />
    <path d="M9.2 8.5V7a2.8 2.8 0 0 1 5.6 0v1.5" {...stroke} />
  </Svg>
);

/** Analitik / analisa — bar chart + panah naik */
export const IconAnalytics = () => (
  <Svg>
    <path d="M4.5 19.5h15" {...stroke} />
    <path d="M7 19.5V13" {...stroke} />
    <path d="M12 19.5V9.5" {...stroke} />
    <path d="M17 19.5V15" {...stroke} />
    <path d="M10.5 8.5 14 5l3.2 2.2 2.3-2.8" {...stroke} />
    <path d="M16.8 4.4h2.7v2.7" {...stroke} />
  </Svg>
);

/** Keuangan — dompet */
export const IconFinance = () => (
  <Svg>
    <path
      d="M3.8 8.2h16.4A1.8 1.8 0 0 1 22 10v8.2a1.8 1.8 0 0 1-1.8 1.8H3.8A1.8 1.8 0 0 1 2 18.2V10a1.8 1.8 0 0 1 1.8-1.8Z"
      {...stroke}
    />
    <path d="M2.2 8.5 9.5 4.2a1.4 1.4 0 0 1 1.5.1L14.8 7" {...stroke} />
    <circle cx="16.2" cy="14.2" r="1.35" {...stroke} />
  </Svg>
);

/** Pengaturan — gear */
export const IconSettings = () => (
  <Svg>
    <circle cx="12" cy="12" r="3.1" {...stroke} />
    <path
      d="M19.4 12a7.4 7.4 0 0 0-.1-1l1.7-1.3-1.6-2.8-2 .8a7.6 7.6 0 0 0-1.7-1l-.3-2.1H9.6l-.3 2.1a7.6 7.6 0 0 0-1.7 1l-2-.8-1.6 2.8L5.7 11a7.4 7.4 0 0 0 0 2l-1.7 1.3 1.6 2.8 2-.8a7.6 7.6 0 0 0 1.7 1l.3 2.1h3.8l.3-2.1a7.6 7.6 0 0 0 1.7-1l2 .8 1.6-2.8-1.7-1.3c.1-.3.1-.7.1-1Z"
      {...stroke}
    />
  </Svg>
);

export const DGS_NAV_ICONS = {
  home: IconHome,
  quick: IconQuick,
  orders: IconOrders,
  returns: IconReturns,
  product: IconProduct,
  analytics: IconAnalytics,
  finance: IconFinance,
  settings: IconSettings,
};

export default DGS_NAV_ICONS;
