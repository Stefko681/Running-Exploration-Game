import { useMemo, useState } from "react";
import { NumberTicker } from "../components/NumberTicker";
import { useRunStore } from "../state/useRunStore";
import { useDistrictStore } from "../state/useDistrictStore";
import type { LatLngPoint, RunSummary } from "../types";
import { formatKm } from "../utils/geo";
import { getRank } from "../utils/gamification";
import { ShareCard } from "../components/ShareCard";
import { RunDetailModal } from "../components/RunDetailModal";
import { Trash2, CheckCircle, AlertTriangle } from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────

function formatDurationMs(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  if (m <= 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function calcPace(distMeters: number, durationMs: number): string {
  if (distMeters < 10 || durationMs < 1000) return "--:--";
  const secPerKm = (durationMs / 1000) / (distMeters / 1000);
  if (secPerKm > 30 * 60) return "--:--";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Get ISO week key, e.g. "2026-W07" */
function getWeekKey(ts: number): string {
  const d = new Date(ts);
  // Get the Monday of the week
  const day = d.getDay() || 7; // Sunday = 7
  d.setDate(d.getDate() + 4 - day); // Thursday
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${weekNo.toString().padStart(2, "0")}`;
}

function getWeekLabel(key: string): string {
  // Parse "2026-W07" and give a human label
  const [yearStr, weekPart] = key.split("-");
  const weekNum = parseInt(weekPart.replace("W", ""), 10);
  const year = parseInt(yearStr, 10);

  // Get the date of the Monday of the ISO week
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const mondayOfWeek1 = new Date(jan4);
  mondayOfWeek1.setDate(jan4.getDate() - dayOfWeek + 1);
  const monday = new Date(mondayOfWeek1);
  monday.setDate(mondayOfWeek1.getDate() + (weekNum - 1) * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

  // Check if it's the current week
  const now = new Date();
  if (getWeekKey(now.getTime()) === key) return "This Week";

  // Check previous week
  const lastWeek = new Date(now);
  lastWeek.setDate(lastWeek.getDate() - 7);
  if (getWeekKey(lastWeek.getTime()) === key) return "Last Week";

  return `${fmt(monday)} – ${fmt(sunday)}`;
}

// ── Toast System ──────────────────────────────────────────────

function Toast({ message, type, onDismiss }: { message: string; type: "success" | "error"; onDismiss: () => void }) {
  return (
    <div className={`fixed top-4 left-4 right-4 z-[200] flex justify-center pointer-events-none animate-in slide-in-from-top-4 fade-in duration-300`}>
      <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-md max-w-sm pointer-events-auto ${type === "success"
          ? "border-emerald-500/30 bg-slate-900/90 text-emerald-400"
          : "border-rose-500/30 bg-slate-900/90 text-rose-400"
        }`}>
        {type === "success" ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
        <span className="text-sm font-medium text-white flex-1">{message}</span>
        <button onClick={onDismiss} className="text-slate-500 hover:text-white text-xs">✕</button>
      </div>
    </div>
  );
}

// ── Run Item ──────────────────────────────────────────────────

function RunItem({
  run,
  onShare,
  onDelete,
}: {
  run: RunSummary;
  onShare: (run: RunSummary) => void;
  onDelete: (run: RunSummary) => void;
}) {
  const duration = run.endedAt - run.startedAt;
  const pace = calcPace(run.distanceMeters, duration);

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
          {formatDate(run.startedAt)}
        </div>
        <div className="mt-1 flex items-baseline gap-3">
          <span className="text-sm font-semibold text-slate-50">
            {formatKm(run.distanceMeters)} km
          </span>
          <span className="text-xs text-cyan-400 font-mono font-bold">
            {pace} /km
          </span>
        </div>
        <div className="mt-1 text-xs text-slate-400">
          {formatDurationMs(duration)} • {run.points.length} pts
        </div>
      </div>
      <div className="flex flex-none items-center gap-1.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onShare(run);
          }}
          className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 ring-1 ring-slate-700 transition-colors hover:bg-slate-800 min-h-[44px] flex items-center"
        >
          Share
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(run);
          }}
          className="rounded-xl bg-slate-900 px-2 py-2 text-xs text-rose-400 ring-1 ring-slate-700 transition-colors hover:bg-rose-950/40 min-h-[44px] flex items-center"
          title="Delete run"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ── Week Summary Card ─────────────────────────────────────────

function WeekSummary({ runs }: { runs: RunSummary[] }) {
  const totalDist = runs.reduce((a, r) => a + r.distanceMeters, 0);
  const totalDuration = runs.reduce(
    (a, r) => a + (r.endedAt - r.startedAt),
    0
  );
  const avgPace = calcPace(totalDist, totalDuration);

  return (
    <div className="grid grid-cols-3 gap-2 text-center">
      <div className="rounded-xl bg-slate-800/40 border border-slate-700/30 px-2 py-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Distance</div>
        <div className="text-sm font-bold text-white">{formatKm(totalDist)} km</div>
      </div>
      <div className="rounded-xl bg-slate-800/40 border border-slate-700/30 px-2 py-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Runs</div>
        <div className="text-sm font-bold text-white">{runs.length}</div>
      </div>
      <div className="rounded-xl bg-slate-800/40 border border-slate-700/30 px-2 py-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Avg Pace</div>
        <div className="text-sm font-bold text-cyan-400 font-mono">{avgPace}</div>
      </div>
    </div>
  );
}

// ── Rank Card ─────────────────────────────────────────────────

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
          <div
            className={`mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight ${rank.current.color}`}
          >
            <rank.current.icon className="h-6 w-6" />
            {rank.current.title}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Lifetime Distance</div>
          <div className="text-lg font-semibold text-slate-200">
            <NumberTicker value={totalDistance / 1000} />{" "}
            <span className="text-sm text-slate-500">km</span>
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
              className={`h-full rounded-full transition-all duration-1000 ${rank.current.color.replace("text-", "bg-")}`}
              style={{ width: `${rank.progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Delete Confirmation ───────────────────────────────────────

function DeleteConfirmation({
  run,
  onConfirm,
  onCancel,
}: {
  run: RunSummary;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-2xl border border-rose-500/20 bg-slate-900 p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-white mb-2">Delete Run?</h3>
        <p className="text-sm text-slate-400 mb-1">
          {formatDate(run.startedAt)} — {formatKm(run.distanceMeters)} km
        </p>
        <p className="text-xs text-slate-500 mb-6">
          This will permanently remove this run from your history. Revealed fog will be kept.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl bg-slate-800 py-3 text-sm font-bold text-slate-300 ring-1 ring-slate-700 hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-rose-600 py-3 text-sm font-bold text-white hover:bg-rose-500 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Screen ───────────────────────────────────────────────

export function HistoryScreen() {
  const runs = useRunStore((s) => s.runs);
  const revealed = useRunStore((s) => s.revealed);
  const hydrateFromExport = useRunStore((s) => s.hydrateFromExport);
  const recalculateUnlocks = useDistrictStore((s) => s.recalculateUnlocks);

  const [shareRun, setShareRun] = useState<RunSummary | null>(null);
  const [selectedRun, setSelectedRun] = useState<RunSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RunSummary | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Delete run handler
  const deleteRun = useRunStore((s) => s.deleteRun);
  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteRun(deleteTarget.id);
      setDeleteTarget(null);
      showToast("Run deleted successfully.");
    }
  };

  const handleExport = () => {
    const payload: { revealed: LatLngPoint[]; runs: RunSummary[] } = { revealed, runs };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "city-fog-data.json";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Data exported successfully.");
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
          showToast("Invalid export file.", "error");
          return;
        }
        hydrateFromExport({ revealed: parsed.revealed, runs: parsed.runs });
        recalculateUnlocks(parsed.revealed);
        showToast(`Imported ${parsed.runs.length} runs successfully.`);
      } catch {
        showToast("Failed to import data.", "error");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  // Group runs by week
  const weekGroups = useMemo(() => {
    const sorted = [...runs].sort((a, b) => b.startedAt - a.startedAt);
    const groups: { key: string; label: string; runs: RunSummary[] }[] = [];
    const map = new Map<string, RunSummary[]>();
    const order: string[] = [];

    for (const run of sorted) {
      const key = getWeekKey(run.startedAt);
      if (!map.has(key)) {
        map.set(key, []);
        order.push(key);
      }
      map.get(key)!.push(run);
    }

    for (const key of order) {
      groups.push({
        key,
        label: getWeekLabel(key),
        runs: map.get(key)!,
      });
    }

    return groups;
  }, [runs]);

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      {shareRun && (
        <ShareCard run={shareRun} mode="single" onClose={() => setShareRun(null)} />
      )}

      {selectedRun && (
        <RunDetailModal run={selectedRun} onClose={() => setSelectedRun(null)} />
      )}

      {deleteTarget && (
        <DeleteConfirmation
          run={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="h-full overflow-y-auto px-3 pb-20 pt-2">
        <div className="mx-auto flex w-full max-w-md flex-col gap-3">
          {/* Header */}
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

          {weekGroups.length === 0 ? (
            <div className="mt-8 flex flex-col items-center justify-center px-6 text-center text-sm text-slate-400">
              <div className="mb-2 text-base font-semibold text-slate-100">
                No runs yet
              </div>
              <p>
                Start your first run from the map screen to see your history and
                track your exploration progress here.
              </p>
            </div>
          ) : (
            weekGroups.map((group) => (
              <div key={group.key} className="flex flex-col gap-2">
                {/* Week Header */}
                <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 pl-1">
                  {group.label}
                </div>

                {/* Week Summary */}
                <WeekSummary runs={group.runs} />

                {/* Individual Runs */}
                {group.runs.map((run) => (
                  <div
                    key={run.id}
                    onClick={() => setSelectedRun(run)}
                    className="cursor-pointer active:scale-[0.98] transition-transform"
                  >
                    <RunItem
                      run={run}
                      onShare={(r) => setShareRun(r)}
                      onDelete={(r) => setDeleteTarget(r)}
                    />
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
