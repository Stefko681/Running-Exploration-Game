import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "default" | "danger";

type PrimaryButtonProps = {
  variant?: Variant;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function PrimaryButton({
  variant = "default",
  leftIcon,
  rightIcon,
  className = "",
  children,
  ...rest
}: PrimaryButtonProps) {
  const base = "primary-btn";
  const variantClass = variant === "danger" ? " primary-btn--danger" : "";

  return (
    <button type="button" className={`${base}${variantClass} ${className}`} {...rest}>
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}

