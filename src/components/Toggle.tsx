import type { HTMLAttributes } from "react";

type ToggleProps = {
  checked: boolean;
  label?: string;
} & HTMLAttributes<HTMLButtonElement>;

export function Toggle({ checked, label, className = "", ...rest }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`inline-flex items-center gap-2 rounded-full bg-slate-900 px-2 py-1 text-xs text-slate-300 ring-1 ring-slate-700 transition-colors ${
        checked ? "bg-app-accentSoft text-cyan-100 ring-app-accent/60" : ""
      } ${className}`}
      {...rest}
    >
      <span
        className={`h-4 w-7 rounded-full bg-slate-800 transition-colors ${
          checked ? "bg-app-accent" : ""
        }`}
      />
      {label && <span className="font-medium">{label}</span>}
    </button>
  );
}

