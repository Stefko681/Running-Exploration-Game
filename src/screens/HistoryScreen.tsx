import { useMemo } from "react";
import { NumberTicker } from "../components/NumberTicker";
import { useRunStore } from "../state/useRunStore";
import type { LatLngPoint, RunSummary } from "../types";
import { formatKm } from "../utils/geo";
import { getRank } from "../utils/gamification";
import { ShareCard } from "../components/ShareCard";
import { useState } from "react";

function formatDurationMs(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}



function RunItem({ run, onShare }: { run: RunSummary; onShare: (run: RunSummary) => void }) {
  const duration = run.endedAt - run.startedAt;

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 px-4 py-3">
      <div className="min-w-0">
        <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
          {formatDate(run.startedAt)}
        </div>
        <div className="mt-1 text-sm font-semibold text-slate-50">
          {formatKm(run.distanceMeters)} km
        </div>
        <div className="mt-1 text-xs text-slate-400">
          {formatDurationMs(duration)} • {run.points.length} pts
        </div>
      </div>
      <div className="flex flex-none items-center gap-2">
        <button
          type="button"
          onClick={() => onShare(run)}
          className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 ring-1 ring-slate-700 transition-colors hover:bg-slate-800"
        >
          Share
        </button>
      </div>
    </div>
  );
}

function RankCard() {
  const getLifetimeStats = useRunStore((s) => s.getLifetimeStats);
  const { totalDistance } = getLifetimeStats();
  const rank = getRank(totalDistance);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-glow">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Current Rank
          </div>
          <div className={`mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight ${rank.current.color}`}>
            <rank.current.icon className="h-6 w-6" />
            {rank.current.title}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Lifetime Distance</div>
          <div className="text-lg font-semibold text-slate-200">
            <NumberTicker value={totalDistance / 1000} /> <span className="text-sm text-slate-500">km</span>
          </div>
        </div>
      </div>

      {rank.next && (
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-[10px] font-medium uppercase text-slate-500">
            <span>Progress to {rank.next.title}</span>
            <span>{Math.round(rank.remaining / 1000)} km left</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${rank.current.color.replace('text-', 'bg-')}`}
              style={{ width: `${rank.progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function HistoryScreen() {
  const runs = useRunStore((s) => s.runs);
  const revealed = useRunStore((s) => s.revealed);
  const hydrateFromExport = useRunStore((s) => s.hydrateFromExport);

  const handleExport = () => {
    const payload: { revealed: LatLngPoint[]; runs: RunSummary[] } = {
      revealed,
      runs
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "city-fog-data.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = reader.result;
        if (typeof raw !== "string") return;
        const parsed = JSON.parse(raw) as {
          revealed?: LatLngPoint[];
          runs?: RunSummary[];
        };
        if (!parsed || !Array.isArray(parsed.revealed) || !Array.isArray(parsed.runs)) {
          // eslint-disable-next-line no-alert
          alert("Invalid export file.");
          return;
        }
        hydrateFromExport({
          revealed: parsed.revealed,
          runs: parsed.runs
        });
        // eslint-disable-next-line no-alert
        alert("Data imported successfully.");
      } catch {
        // eslint-disable-next-line no-alert
        alert("Failed to import data.");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  /* ... */

  const [shareRun, setShareRun] = useState<RunSummary | null>(null);

  const sortedRuns = useMemo(
    () => [...runs].sort((a, b) => b.startedAt - a.startedAt),
    [runs]
  );

  return (
    <>
      {shareRun && (
        <ShareCard
          run={shareRun}
          mode="single"
          onClose={() => setShareRun(null)}
        />
      )}

      <div className="h-full overflow-y-auto px-3 pb-6 pt-2">
        <div className="mx-auto flex w-full max-w-md flex-col gap-3">
          {/* ... Header ... */}
          <div className="flex items-center justify-between gap-3 pb-1 pt-2">
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
              History
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={handleExport}
                className="rounded-xl bg-slate-900 px-3 py-1.5 font-semibold text-slate-100 ring-1 ring-slate-700 transition-colors hover:bg-slate-800"
              >
                Export
              </button>
              <label className="cursor-pointer rounded-xl bg-slate-900 px-3 py-1.5 font-semibold text-slate-100 ring-1 ring-slate-700 transition-colors hover:bg-slate-800">
                Import
                <input
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={handleImport}
                />
              </label>
            </div>
          </div>

          <RankCard />

          {sortedRuns.length === 0 ? (
            <div className="mt-8 flex flex-col items-center justify-center px-6 text-center text-sm text-slate-400">
              <div className="mb-2 text-base font-semibold text-slate-100">
                No runs yet
              </div>
              <p>
                Start your first run from the map screen to see your history and track your
                exploration progress here.
              </p>
            </div>
          ) : (
            sortedRuns.map((run) => (
              <RunItem key={run.id} run={run} onShare={setShareRun} />
            ))
          )}
        </div>
      </div>
    </>
  );
}
