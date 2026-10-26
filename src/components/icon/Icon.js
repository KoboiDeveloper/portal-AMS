import classNames from "classnames";
import React from "react";
import PremiumIcon from "./PremiumIcon";

/**
 * App icon.
 * - Default: DashLite NioIcon font (`ni ni-{name}`)
 * - Premium PNG pack: pack="premium" | pack="png" | name="premium:dashboard"
 *
 * @example
 *   <Icon name="users" />
 *   <Icon pack="premium" name="dashboard" size={28} />
 *   <Icon name="premium:absensi" size={22} />
 */
const Icon = ({ name, id, className, style, pack, size = 24, ...props }) => {
  const raw = String(name || "");
  const wantPremium =
    pack === "premium" || pack === "png" || raw.startsWith("premium:");
  const premiumName = raw.replace(/^premium:/, "");

  if (wantPremium) {
    return (
      <PremiumIcon
        name={premiumName}
        size={size}
        id={id}
        className={className}
        style={style}
        {...props}
      />
    );
  }

  const iconClass = classNames({
    [`${className}`]: className,
    icon: true,
    ni: true,
    [`ni-${name}`]: true,
  });
  return <em className={iconClass} id={id} style={style} {...props}></em>;
};

export default Icon;
