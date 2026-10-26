import React from "react";
import classNames from "classnames";
import { resolvePremiumIcon } from "../../assets/icons/premiumIcons";

/**
 * Premium PNG icon pack (100 bisnis icons).
 *
 * @example
 *   <PremiumIcon name="dashboard" size={28} />
 *   <PremiumIcon name="072" size={20} />
 *   <PremiumIcon name="absensi" />
 */
const PremiumIcon = ({
  name,
  size = 24,
  alt,
  className,
  style,
  title,
  ...props
}) => {
  const entry = resolvePremiumIcon(name);
  if (!entry) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(`[PremiumIcon] unknown icon: ${name}`);
    }
    return (
      <span
        className={classNames("premium-icon premium-icon--missing", className)}
        style={{ width: size, height: size, ...style }}
        title={title || name}
        aria-hidden
        {...props}
      />
    );
  }

  return (
    <img
      src={entry.src}
      alt={alt ?? ""}
      title={title || entry.judul}
      width={size}
      height={size}
      className={classNames("premium-icon", className)}
      style={{ width: size, height: size, objectFit: "contain", ...style }}
      draggable={false}
      {...props}
    />
  );
};

export default PremiumIcon;
