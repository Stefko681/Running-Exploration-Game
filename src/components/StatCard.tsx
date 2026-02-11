import type { ReactNode } from "react";

type StatCardProps = {
  label: string;
  value: ReactNode;
  align?: "left" | "right";
  accent?: boolean;
};

export function StatCard({ label, value, align = "left", accent }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-card-label">{label}</div>
      <div
        className={`stat-card-value ${
          align === "right" ? "text-right" : ""
        } ${accent ? "text-emerald-300" : ""}`}
      >
        {value}
      </div>
    </div>
  );
}

