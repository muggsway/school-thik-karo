"use client";

import { useMemo, useState } from "react";
import indiaMap from "@svg-maps/india";
import stateMapData from "@/data/state-map.json";
import SubmitModal from "@/components/SubmitModal";
import InstagramEmbed from "@/components/InstagramEmbed";

export type CaseRow = {
  id: number;
  school_name: string;
  status: "flagged" | "in_progress" | "resolved";
  instagram_url: string | null;
  notes: string | null;
  map_x: number;
  map_y: number;
  created_at: string;
  village_name: string;
  subdistrict_name: string;
  district_name: string;
  state_name: string;
};

export type StateOption = { code: number; name: string };

const STATUS_COLOR: Record<CaseRow["status"], string> = {
  flagged: "var(--brick)",
  in_progress: "var(--rust)",
  resolved: "var(--moss)",
};

const STATUS_LABEL: Record<CaseRow["status"], string> = {
  flagged: "Flagged",
  in_progress: "In progress",
  resolved: "Resolved",
};

const stateMap = stateMapData as unknown as Record<
  string,
  { svgId: string; svgName: string; bbox: [number, number, number, number] }
>;
const svgIdToLgdCodes = new Map<string, string[]>();
for (const [code, entry] of Object.entries(stateMap)) {
  const list = svgIdToLgdCodes.get(entry.svgId) ?? [];
  list.push(code);
  svgIdToLgdCodes.set(entry.svgId, list);
}

export default function MapApp({
  initialCases,
  states,
}: {
  initialCases: CaseRow[];
  states: StateOption[];
}) {
  const [cases, setCases] = useState(initialCases);
  const [selected, setSelected] = useState<CaseRow | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const stats = useMemo(() => {
    const flagged = cases.filter((c) => c.status === "flagged").length;
    const progress = cases.filter((c) => c.status === "in_progress").length;
    const resolved = cases.filter((c) => c.status === "resolved").length;
    return { flagged, progress, resolved, total: cases.length };
  }, [cases]);

  function handleCreated(newCase: CaseRow) {
    setCases((prev) => [newCase, ...prev]);
    setSubmitOpen(false);
    setSelected(newCase);
  }

  const anyPanelOpen = !!selected || legendOpen || submitOpen || aboutOpen;

  return (
    <div className="fixed inset-0 bg-[#f5f0e2]">
      <svg
        viewBox={indiaMap.viewBox}
        className="w-full h-full block"
        onClick={() => {
          setSelected(null);
          setAboutOpen(false);
        }}
      >
        {indiaMap.locations.map((loc: { id: string; name: string; path: string }) => (
          <path
            key={loc.id}
            d={loc.path}
            fill="var(--paper)"
            stroke="var(--line)"
            strokeWidth={1}
          />
        ))}
        {cases.map((c) => (
          <g
            key={c.id}
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setSelected(c);
              setAboutOpen(false);
            }}
          >
            <circle
              cx={c.map_x}
              cy={c.map_y}
              r={selected?.id === c.id ? 6 : 4.5}
              fill={STATUS_COLOR[c.status]}
              stroke="var(--ink)"
              strokeWidth={selected?.id === c.id ? 1.4 : 0}
              opacity={0.92}
            />
          </g>
        ))}
      </svg>

      {/* wordmark seal */}
      <button
        onClick={() => setAboutOpen(true)}
        className="fixed top-3 left-3 sm:top-4 sm:left-4 z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white border-2 flex items-center justify-center text-center leading-tight shadow-lg -rotate-6 cursor-pointer"
        style={{ borderColor: "var(--rust)" }}
      >
        <span
          className="text-[7px] sm:text-[9px] font-bold tracking-tight"
          style={{ fontFamily: "var(--font-display)", color: "var(--rust)" }}
        >
          SCHOOL
          <br />
          THIK
          <br />
          KARO
        </span>
      </button>

      {/* stats chip */}
      <div
        className="fixed top-3 right-3 sm:top-4 sm:right-4 z-10 bg-white/90 border rounded-full px-2.5 py-1.5 sm:px-4 sm:py-2 shadow-md text-[9px] sm:text-xs font-mono flex gap-1.5 sm:gap-3 max-w-[62vw] sm:max-w-none"
        style={{ borderColor: "var(--line)" }}
      >
        <span style={{ color: "var(--brick)" }}>{stats.flagged} flagged</span>
        <span style={{ color: "var(--rust)" }} className="hidden xs:inline">{stats.progress} in progress</span>
        <span style={{ color: "var(--moss)" }}>{stats.resolved} resolved</span>
      </div>

      {/* legend */}
      <div className="fixed bottom-4 left-3 sm:bottom-5 sm:left-4 z-10 flex flex-col items-start gap-2">
        {legendOpen && (
          <div
            className="bg-white border rounded-lg px-3 py-2.5 shadow-lg text-xs font-mono space-y-1.5"
            style={{ borderColor: "var(--line)" }}
          >
            {(Object.keys(STATUS_LABEL) as CaseRow["status"][]).map((s) => (
              <div key={s} className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ background: STATUS_COLOR[s] }}
                />
                {STATUS_LABEL[s]}
              </div>
            ))}
          </div>
        )}
        <button
          onClick={() => setLegendOpen((o) => !o)}
          className="w-11 h-11 rounded-full bg-white border shadow-md flex items-center justify-center cursor-pointer"
          style={{ borderColor: "var(--line)" }}
          aria-label="Legend"
        >
          🔑
        </button>
      </div>

      {/* submit FAB */}
      <button
        onClick={() => setSubmitOpen(true)}
        className="fixed bottom-4 right-3 sm:bottom-5 sm:right-5 z-10 rounded-full text-white px-4 sm:px-5 flex items-center gap-2 shadow-lg cursor-pointer font-semibold text-sm"
        style={{ background: "var(--ink)", height: 52 }}
      >
        <span className="text-lg leading-none">+</span>
        <span className="hidden xs:inline">Submit a report</span>
        <span className="inline xs:hidden">Submit</span>
      </button>

      {/* scrim */}
      {anyPanelOpen && (
        <div
          className="fixed inset-0 bg-black/25 z-15"
          onClick={() => {
            setSelected(null);
            setAboutOpen(false);
          }}
        />
      )}

      {/* case drawer */}
      <div
        className="fixed top-0 right-0 h-full w-full sm:w-[380px] sm:max-w-[90vw] bg-white z-20 shadow-2xl transition-transform"
        style={{ transform: selected ? "translateX(0)" : "translateX(100%)" }}
      >
        {selected && (
          <div className="h-full overflow-y-auto">
            <div className="p-5 border-b" style={{ borderColor: "var(--line)" }}>
              <button
                className="absolute top-4 right-4 text-xl cursor-pointer"
                onClick={() => setSelected(null)}
                aria-label="Close"
              >
                ×
              </button>
              <span
                className="text-[10px] font-mono uppercase tracking-wide px-2 py-1 rounded"
                style={{
                  background:
                    selected.status === "flagged"
                      ? "var(--brick-soft)"
                      : selected.status === "in_progress"
                      ? "var(--rust-soft)"
                      : "var(--moss-soft)",
                  color: STATUS_COLOR[selected.status],
                }}
              >
                {STATUS_LABEL[selected.status]}
              </span>
              <h2
                className="text-xl mt-3"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {selected.school_name}
              </h2>
              <p className="text-xs font-mono mt-1" style={{ color: "var(--ink-soft)" }}>
                {selected.village_name} · {selected.subdistrict_name} · {selected.district_name}, {selected.state_name}
              </p>
            </div>
            <div className="p-5 border-b" style={{ borderColor: "var(--line)" }}>
              <h4 className="text-[10px] font-mono uppercase tracking-wide mb-2" style={{ color: "var(--ink-soft)" }}>
                Source
              </h4>
              {selected.instagram_url ? (
                <InstagramEmbed url={selected.instagram_url} />
              ) : (
                <p className="text-sm" style={{ color: "var(--ink-soft)" }}>No link provided.</p>
              )}
            </div>
            {selected.notes && (
              <div className="p-5 border-b" style={{ borderColor: "var(--line)" }}>
                <h4 className="text-[10px] font-mono uppercase tracking-wide mb-2" style={{ color: "var(--ink-soft)" }}>
                  Notes
                </h4>
                <p className="text-sm leading-relaxed">{selected.notes}</p>
              </div>
            )}
            <div className="p-5">
              <h4 className="text-[10px] font-mono uppercase tracking-wide mb-2" style={{ color: "var(--ink-soft)" }}>
                Timeline
              </h4>
              <div className="text-sm flex gap-2">
                <span className="font-mono text-xs" style={{ color: "var(--ink-soft)" }}>
                  {new Date(selected.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
                <span>Initial flag submitted</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* about / campaign panel */}
      <div
        className="fixed top-0 left-0 h-full w-[340px] max-w-[90vw] bg-white z-20 shadow-2xl transition-transform p-6"
        style={{ transform: aboutOpen ? "translateX(0)" : "translateX(-100%)" }}
      >
        <button
          className="absolute top-4 right-4 text-xl cursor-pointer"
          onClick={() => setAboutOpen(false)}
          aria-label="Close"
        >
          ×
        </button>
        <p className="text-[11px] font-mono uppercase tracking-wide" style={{ color: "var(--rust)" }}>
          This Independence Day
        </p>
        <h2 className="text-2xl mt-2" style={{ fontFamily: "var(--font-display)" }}>
          School Thik Karo
        </h2>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          Volunteers audit government schools against a 10-point checklist and post what they find.
          This map turns that into an accountability record — what&apos;s been flagged, where, and
          whether it actually got fixed.
        </p>
        <p className="mt-4 text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          A demo build for <span style={{ fontFamily: "var(--font-accent)", fontStyle: "italic", color: "var(--moss)" }}>Cockroach Janta Party</span>.
        </p>
      </div>

      <SubmitModal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        states={states}
        onCreated={handleCreated}
      />
    </div>
  );
}
