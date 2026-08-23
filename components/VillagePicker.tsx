"use client";

import { useEffect, useRef, useState } from "react";
import type { StateOption } from "@/components/MapApp";

export type PickedLocation = {
  villageCode: number;
  villageName: string;
  subdistrictCode: number;
  subdistrictName: string;
  districtCode: number;
  districtName: string;
  stateCode: number;
  stateName: string;
};

type SearchResult = {
  village_code: number;
  village_name: string;
  subdistrict_code: number;
  subdistrict_name: string;
  district_code: number;
  district_name: string;
  state_code: number;
  state_name: string;
};

type Option = { code: number; name: string };

async function fetchOptions(url: string): Promise<Option[]> {
  const res = await fetch(url);
  if (!res.ok) return [];
  return res.json();
}

export default function VillagePicker({
  states,
  value,
  onChange,
}: {
  states: StateOption[];
  value: PickedLocation | null;
  onChange: (loc: PickedLocation | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [stateCode, setStateCode] = useState<number | "">("");
  const [districtCode, setDistrictCode] = useState<number | "">("");
  const [subdistrictCode, setSubdistrictCode] = useState<number | "">("");
  const [districts, setDistricts] = useState<Option[]>([]);
  const [subdistricts, setSubdistricts] = useState<Option[]>([]);
  const [villages, setVillages] = useState<Option[]>([]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) return;
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/locations/search-villages?q=${encodeURIComponent(query.trim())}`);
      const data = res.ok ? await res.json() : [];
      setResults(data);
      setSearching(false);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function pick(r: SearchResult) {
    onChange({
      villageCode: r.village_code,
      villageName: r.village_name,
      subdistrictCode: r.subdistrict_code,
      subdistrictName: r.subdistrict_name,
      districtCode: r.district_code,
      districtName: r.district_name,
      stateCode: r.state_code,
      stateName: r.state_name,
    });
    setShowResults(false);
    setQuery("");
  }

  function change() {
    onChange(null);
    setQuery("");
    setManualMode(false);
  }

  function handleStateChange(v: string) {
    setStateCode(v ? Number(v) : "");
    setDistrictCode("");
    setSubdistrictCode("");
    setDistricts([]);
    setSubdistricts([]);
    setVillages([]);
    if (v) fetchOptions(`/api/locations/districts?state=${v}`).then(setDistricts);
  }

  function handleDistrictChange(v: string) {
    setDistrictCode(v ? Number(v) : "");
    setSubdistrictCode("");
    setSubdistricts([]);
    setVillages([]);
    if (v) fetchOptions(`/api/locations/subdistricts?district=${v}`).then(setSubdistricts);
  }

  function handleSubdistrictChange(v: string) {
    setSubdistrictCode(v ? Number(v) : "");
    setVillages([]);
    if (v) fetchOptions(`/api/locations/villages?subdistrict=${v}`).then(setVillages);
  }

  function handleManualVillage(v: string) {
    if (!v) return;
    const village = villages.find((x) => String(x.code) === v);
    const subdistrict = subdistricts.find((x) => String(x.code) === String(subdistrictCode));
    const district = districts.find((x) => String(x.code) === String(districtCode));
    const state = states.find((x) => String(x.code) === String(stateCode));
    if (!village || !subdistrict || !district || !state) return;
    onChange({
      villageCode: village.code,
      villageName: village.name,
      subdistrictCode: subdistrict.code,
      subdistrictName: subdistrict.name,
      districtCode: district.code,
      districtName: district.name,
      stateCode: state.code,
      stateName: state.name,
    });
  }

  if (value) {
    return (
      <div
        className="w-full mb-3 px-3 py-2.5 rounded-lg border bg-white text-sm flex items-center justify-between gap-2"
        style={{ borderColor: "var(--line)" }}
      >
        <div>
          <div className="font-medium">📍 {value.villageName}</div>
          <div className="text-xs mt-0.5" style={{ color: "var(--ink-soft)" }}>
            {value.subdistrictName} · {value.districtName}, {value.stateName}
          </div>
        </div>
        <button
          type="button"
          onClick={change}
          className="text-xs underline shrink-0 cursor-pointer"
          style={{ color: "var(--rust)" }}
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="mb-3">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
            if (e.target.value.trim().length < 2) setResults([]);
            else setSearching(true);
          }}
          onFocus={() => setShowResults(true)}
          placeholder="Search village name…"
          className="w-full px-3 py-2.5 rounded-lg border bg-white text-sm"
          style={{ borderColor: "var(--line)" }}
        />
        {showResults && query.trim().length >= 2 && (
          <div
            className="absolute z-10 left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-64 overflow-y-auto"
            style={{ borderColor: "var(--line)" }}
          >
            {searching && (
              <div className="px-3 py-2.5 text-sm" style={{ color: "var(--ink-soft)" }}>
                Searching…
              </div>
            )}
            {!searching && results.length === 0 && (
              <div className="px-3 py-2.5 text-sm" style={{ color: "var(--ink-soft)" }}>
                No villages found. Try a different spelling, or select manually below.
              </div>
            )}
            {!searching &&
              results.map((r) => (
                <button
                  type="button"
                  key={r.village_code}
                  onClick={() => pick(r)}
                  className="w-full text-left px-3 py-2.5 hover:bg-[var(--paper-dim)] cursor-pointer border-b last:border-b-0"
                  style={{ borderColor: "var(--line)" }}
                >
                  <div className="text-sm font-medium">{r.village_name}</div>
                  <div className="text-xs" style={{ color: "var(--ink-soft)" }}>
                    {r.subdistrict_name} · {r.district_name}, {r.state_name}
                  </div>
                </button>
              ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setManualMode((m) => !m)}
        className="text-xs underline mt-1.5 cursor-pointer"
        style={{ color: "var(--ink-soft)" }}
      >
        {manualMode ? "Hide manual selection" : "Can't find it? Select manually"}
      </button>

      {manualMode && (
        <div className="mt-2 space-y-2">
          <select
            value={stateCode}
            onChange={(e) => handleStateChange(e.target.value)}
            className="w-full px-3 py-2 rounded border bg-white text-sm"
            style={{ borderColor: "var(--line)" }}
          >
            <option value="">Select state</option>
            {states.map((s) => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </select>
          <select
            disabled={!stateCode}
            value={districtCode}
            onChange={(e) => handleDistrictChange(e.target.value)}
            className="w-full px-3 py-2 rounded border bg-white text-sm disabled:opacity-50"
            style={{ borderColor: "var(--line)" }}
          >
            <option value="">{stateCode ? "Select district" : "Select a state first"}</option>
            {districts.map((d) => (
              <option key={d.code} value={d.code}>{d.name}</option>
            ))}
          </select>
          <select
            disabled={!districtCode}
            value={subdistrictCode}
            onChange={(e) => handleSubdistrictChange(e.target.value)}
            className="w-full px-3 py-2 rounded border bg-white text-sm disabled:opacity-50"
            style={{ borderColor: "var(--line)" }}
          >
            <option value="">{districtCode ? "Select tehsil" : "Select a district first"}</option>
            {subdistricts.map((s) => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </select>
          <select
            disabled={!subdistrictCode}
            value=""
            onChange={(e) => handleManualVillage(e.target.value)}
            className="w-full px-3 py-2 rounded border bg-white text-sm disabled:opacity-50"
            style={{ borderColor: "var(--line)" }}
          >
            <option value="">{subdistrictCode ? "Select village" : "Select a tehsil first"}</option>
            {villages.map((v) => (
              <option key={v.code} value={v.code}>{v.name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
