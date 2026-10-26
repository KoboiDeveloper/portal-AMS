import React from "react";
import classNames from "classnames";

const Button = ({ color, size, className, outline, disabled, type = "button", children, ...props }) => {
  const buttonClass = classNames({
    btn: true,
    [`btn-${color}`]: !outline,
    [`btn-outline-${color}`]: outline,
    [`btn-${size}`]: size,
    disabled: disabled,
    [`${className}`]: className,
  });
  return (
    <button type={type} className={buttonClass} disabled={disabled} {...props}>
      {children}
    </button>
  );
};
export default Button;
