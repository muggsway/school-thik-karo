"use client";

import { useMemo, useState } from "react";
import { TransformWrapper, TransformComponent, useControls } from "react-zoom-pan-pinch";
import indiaMap from "@svg-maps/india";
import { STATE_MAP, stateLabelPosition } from "@/lib/statemap";
import { cleanVillageName } from "@/lib/format";
import SubmitModal from "@/components/SubmitModal";
import InstagramEmbed from "@/components/InstagramEmbed";

export type CaseRow = {
  id: number;
  school_name: string | null;
  status: "flagged" | "in_progress" | "resolved";
  instagram_url: string | null;
  notes: string | null;
  map_x: number;
  map_y: number;
  created_at: string;
  posted_at: string | null;
  village_name: string | null;
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

function PinMarker({
  x,
  y,
  color,
  selected,
  onClick,
}: {
  x: number;
  y: number;
  color: string;
  selected: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  const s = selected ? 0.68 : 0.52;
  const tx = x - 12 * s;
  const ty = y - 23 * s;
  return (
    <g
      onClick={onClick}
      className="cursor-pointer"
      style={{ transition: "transform 120ms" }}
      transform={`translate(${tx} ${ty}) scale(${s})`}
    >
      <g transform="rotate(22 12 23)">
        {/* needle */}
        <polygon points="12,23 9.3,15 14.7,15" fill="#C7C7C7" stroke="#8A8A8A" strokeWidth={0.4} />
        <line x1="11.2" y1="20.5" x2="12.9" y2="16" stroke="white" strokeOpacity={0.7} strokeWidth={0.5} />
        {/* head shadow where needle meets head */}
        <ellipse cx="12" cy="14.6" rx="4.1" ry="1.6" fill="rgba(0,0,0,0.22)" />
        {/* head */}
        <ellipse cx="12" cy="9" rx="7.2" ry="6.4" fill={color} stroke="var(--ink)" strokeWidth={selected ? 0.9 : 0.6} />
        {/* glossy highlight */}
        <ellipse cx="9.2" cy="6" rx="2.3" ry="1.6" fill="white" opacity={0.5} transform="rotate(-20 9.2 6)" />
      </g>
    </g>
  );
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

  const stateLabels = useMemo(
    () =>
      Object.keys(STATE_MAP)
        .map((code) => {
          const pos = stateLabelPosition(Number(code));
          return pos ? { key: code, name: STATE_MAP[code].svgName, ...pos } : null;
        })
        .filter((l): l is { key: string; name: string; x: number; y: number } => l !== null),
    []
  );

  function handleCreated(newCase: CaseRow) {
    setCases((prev) => [newCase, ...prev]);
    setSubmitOpen(false);
    setSelected(newCase);
  }

  const anyPanelOpen = !!selected || legendOpen || submitOpen || aboutOpen;

  return (
    <div className="fixed inset-0 bg-[#f5f0e2]">
      <TransformWrapper
        initialScale={1}
        minScale={1}
        maxScale={18}
        limitToBounds={true}
        smooth={true}
        doubleClick={{ mode: "zoomIn", step: 0.5, animationTime: 200 }}
        wheel={{ step: 0.1 }}
        pinch={{ step: 3 }}
      >
        <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }} contentStyle={{ width: "100%", height: "100%" }}>
          <svg
            viewBox={indiaMap.viewBox}
            className="w-full h-full block"
            onClick={() => {
              setSelected(null);
              setAboutOpen(false);
            }}
          >
            {indiaMap.locations.map((loc: { id: string; name: string; path: string }) => (
              <path key={loc.id} d={loc.path} fill="var(--paper)" stroke="var(--line)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            ))}

            {stateLabels.map((l) => (
              <text
                key={`st-${l.key}`}
                x={l.x}
                y={l.y}
                textAnchor="middle"
                fontFamily="var(--font-body)"
                fontSize={9}
                fill="var(--ink-soft)"
                opacity={0.75}
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {l.name}
              </text>
            ))}

            {cases.map((c) => (
              <PinMarker
                key={c.id}
                x={c.map_x}
                y={c.map_y}
                color={STATUS_COLOR[c.status]}
                selected={selected?.id === c.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected(c);
                  setAboutOpen(false);
                }}
              />
            ))}
          </svg>
        </TransformComponent>
        <ZoomControls />
      </TransformWrapper>

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
        className="fixed top-0 right-0 h-full w-full sm:w-[440px] sm:max-w-[90vw] bg-white z-20 shadow-2xl transition-transform"
        style={{ transform: selected ? "translateX(0)" : "translateX(100%)" }}
      >
        {selected && (
          <div className="h-full overflow-y-auto">
            <div className="p-5 border-b relative" style={{ borderColor: "var(--line)" }}>
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
                {selected.village_name ? cleanVillageName(selected.village_name) : selected.subdistrict_name}
              </h2>
              {selected.school_name && (
                <p className="text-sm mt-0.5">{selected.school_name}</p>
              )}
              <p className="text-xs font-mono mt-1" style={{ color: "var(--ink-soft)" }}>
                {selected.village_name && `${selected.subdistrict_name} · `}{selected.district_name}, {selected.state_name}
              </p>
            </div>
            <div className="pt-5 pb-5 px-2 border-b" style={{ borderColor: "var(--line)" }}>
              <h4 className="text-[10px] font-mono uppercase tracking-wide mb-2 px-3" style={{ color: "var(--ink-soft)" }}>
                Source
              </h4>
              {selected.instagram_url ? (
                <InstagramEmbed url={selected.instagram_url} />
              ) : (
                <p className="text-sm px-3" style={{ color: "var(--ink-soft)" }}>No link provided.</p>
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
              <h4 className="text-[10px] font-mono uppercase tracking-wide mb-3" style={{ color: "var(--ink-soft)" }}>
                Timeline
              </h4>
              <div className="space-y-3">
                <TimelineEntry
                  date={selected.posted_at ?? selected.created_at}
                  label={selected.posted_at ? "Posted on Instagram" : "Added to this map"}
                />
                {selected.posted_at && <TimelineEntry date={selected.created_at} label="Added to this map" />}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* about / campaign panel */}
      <div
        className="fixed top-0 left-0 h-full w-full sm:w-[340px] sm:max-w-[90vw] bg-white z-20 shadow-2xl transition-transform p-6"
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

function TimelineEntry({ date, label }: { date: string; label: string }) {
  return (
    <div className="flex gap-3">
      <div className="w-1.5 h-1.5 rounded-full mt-[7px] shrink-0" style={{ background: "var(--ink-soft)" }} />
      <div>
        <div className="text-sm">{label}</div>
        <div className="text-xs font-mono mt-0.5" style={{ color: "var(--ink-soft)" }}>
          {new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
        </div>
      </div>
    </div>
  );
}

function ZoomControls() {
  const { zoomIn, zoomOut, resetTransform } = useControls();
  return (
    <div className="fixed top-1/2 right-3 sm:right-4 -translate-y-1/2 z-10 flex flex-col shadow-md rounded-lg overflow-hidden border" style={{ borderColor: "var(--line)" }}>
      <button
        onClick={() => zoomIn()}
        className="w-9 h-9 sm:w-10 sm:h-10 bg-white flex items-center justify-center text-lg cursor-pointer border-b"
        style={{ borderColor: "var(--line)" }}
        aria-label="Zoom in"
      >
        +
      </button>
      <button
        onClick={() => zoomOut()}
        className="w-9 h-9 sm:w-10 sm:h-10 bg-white flex items-center justify-center text-lg cursor-pointer border-b"
        style={{ borderColor: "var(--line)" }}
        aria-label="Zoom out"
      >
        −
      </button>
      <button
        onClick={() => resetTransform()}
        className="w-9 h-9 sm:w-10 sm:h-10 bg-white flex items-center justify-center text-xs cursor-pointer"
        aria-label="Reset zoom"
      >
        ⟲
      </button>
    </div>
  );
}
