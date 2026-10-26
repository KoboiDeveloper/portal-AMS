type IconProps = {
  size?: number;
  className?: string;
};

/** Storefront — transaksi di toko */
export function StoreTypeIcon({ size = 22, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M4.55 4.35h14.9c.55 0 1.04.34 1.23.85L22 9.55V11.2h-1.2v8.55c0 .95-.77 1.7-1.7 1.7H4.9c-.93 0-1.7-.75-1.7-1.7V11.2H2V9.55l1.32-4.35c.2-.51.68-.85 1.23-.85ZM6.95 5.65l.85 2.35h2.35l-.85-2.35H6.95Zm4.15 0 .85 2.35h2.35l-.85-2.35h-2.35Zm4.15 0 .85 2.35H18.4l-.85-2.35h-2.3ZM10.35 14.35h3.3V21.1h-3.3v-6.75ZM6.65 13.4h2.45v2.25H6.65V13.4Zm8.25 0h2.45v2.25h-2.45V13.4Z"
      />
    </svg>
  );
}

/** Chat bubble + handset — transaksi online (gaya WhatsApp) */
export function WhatsAppTypeIcon({ size = 22, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M12 2.2C6.72 2.2 2.45 6.35 2.45 11.5c0 1.64.44 3.2 1.25 4.57L2 21.8l5.58-1.78c1.38.75 2.95 1.16 4.42 1.16 5.28 0 9.55-4.15 9.55-9.3C21.55 6.35 17.28 2.2 12 2.2Zm4.05 12.72c-.25.7-1.24 1.2-2.04 1.36-.55.12-1.27.22-3.68-.78-2.9-1.2-4.76-4.14-4.9-4.34-.14-.2-1.18-1.57-1.18-3 0-1.42.74-2.12 1-2.4.26-.29.58-.36.77-.36h.56c.18 0 .43-.07.67.5.24.6.82 2 .88 2.14.07.15.1.32.02.52-.08.2-.13.32-.26.5-.13.17-.27.38-.38.51-.13.15-.26.3-.1.59.15.29.64 1.07 1.38 1.76 1.18 1.1 2.18 1.3 2.46 1.45.18.1.28.09.38-.06.1-.15.45-.53.58-.7.12-.18.25-.15.41-.09.17.06 1.08.51 1.27.6.18.1.3.14.34.22.05.08.05.67-.2 1.36Z"
      />
    </svg>
  );
}
