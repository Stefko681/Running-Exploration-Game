import type { ButtonHTMLAttributes, ReactNode } from "react";

type IconButtonProps = {
  active?: boolean;
  icon: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function IconButton({ active, icon, className = "", ...rest }: IconButtonProps) {
  const base = "icon-btn";
  const activeClass = active ? " icon-btn--active" : "";

  return (
    <button
      type="button"
      className={`${base}${activeClass} ${className}`}
      {...rest}
    >
      {icon}
    </button>
  );
}

