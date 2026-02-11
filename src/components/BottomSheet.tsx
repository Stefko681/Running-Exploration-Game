import type { ReactNode } from "react";

type BottomSheetProps = {
  children: ReactNode;
};

export function BottomSheet({ children }: BottomSheetProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-3 safe-pb">
      <div className="bottom-bar">{children}</div>
    </div>
  );
}

