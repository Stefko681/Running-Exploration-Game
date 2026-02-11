import type { ReactNode } from "react";

import { NumberTicker } from "./NumberTicker";

type StatCardProps = {
  label: string;
  value: ReactNode | number;
  align?: "left" | "right";
  accent?: boolean;
};

export function StatCard({ label, value, align = "left", accent }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-card-label">{label}</div>
      <div
        className={`stat-card-value ${align === "right" ? "text-right" : ""
          } ${accent ? "text-app-accent" : ""}`}
      >
        {typeof value === "number" ? (
          <NumberTicker value={value} />
        ) : (
          value
        )}
      </div>
    </div>
  );
}

