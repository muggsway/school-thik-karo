"use client";

import { useState } from "react";
import { placeInState } from "@/lib/statemap";
import type { CaseRow, StateOption } from "@/components/MapApp";

type Option = { code: number; name: string };

async function fetchOptions(url: string): Promise<Option[]> {
  const res = await fetch(url);
  if (!res.ok) return [];
  return res.json();
}

export default function SubmitModal({
  open,
  onClose,
  states,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  states: StateOption[];
  onCreated: (c: CaseRow) => void;
}) {
  const [schoolName, setSchoolName] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [notes, setNotes] = useState("");

  const [stateCode, setStateCode] = useState<number | "">("");
  const [districtCode, setDistrictCode] = useState<number | "">("");
  const [subdistrictCode, setSubdistrictCode] = useState<number | "">("");
  const [villageCode, setVillageCode] = useState<number | "">("");

  const [districts, setDistricts] = useState<Option[]>([]);
  const [subdistricts, setSubdistricts] = useState<Option[]>([]);
  const [villages, setVillages] = useState<Option[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setSchoolName("");
    setInstagramUrl("");
    setNotes("");
    setStateCode("");
    setDistrictCode("");
    setSubdistrictCode("");
    setVillageCode("");
    setDistricts([]);
    setSubdistricts([]);
    setVillages([]);
    setError(null);
  }

  function handleStateChange(value: string) {
    setStateCode(value ? Number(value) : "");
    setDistrictCode("");
    setSubdistrictCode("");
    setVillageCode("");
    setDistricts([]);
    setSubdistricts([]);
    setVillages([]);
    if (value) fetchOptions(`/api/locations/districts?state=${value}`).then(setDistricts);
  }

  function handleDistrictChange(value: string) {
    setDistrictCode(value ? Number(value) : "");
    setSubdistrictCode("");
    setVillageCode("");
    setSubdistricts([]);
    setVillages([]);
    if (value) fetchOptions(`/api/locations/subdistricts?district=${value}`).then(setSubdistricts);
  }

  function handleSubdistrictChange(value: string) {
    setSubdistrictCode(value ? Number(value) : "");
    setVillageCode("");
    setVillages([]);
    if (value) fetchOptions(`/api/locations/villages?subdistrict=${value}`).then(setVillages);
  }

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!schoolName || !stateCode || !districtCode || !subdistrictCode || !villageCode) {
      setError("Please fill in the school name and full location.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolName,
          stateCode,
          districtCode,
          subdistrictCode,
          villageCode,
          instagramUrl: instagramUrl || null,
          notes: notes || null,
        }),
      });
      if (!res.ok) throw new Error("Submission failed");
      const { id } = await res.json();

      const { x, y } = placeInState(Number(stateCode), String(villageCode));
      const stateName = states.find((s) => String(s.code) === String(stateCode))?.name ?? "";
      const districtName = districts.find((d) => String(d.code) === String(districtCode))?.name ?? "";
      const subdistrictName = subdistricts.find((s) => String(s.code) === String(subdistrictCode))?.name ?? "";
      const villageName = villages.find((v) => String(v.code) === String(villageCode))?.name ?? "";

      onCreated({
        id,
        school_name: schoolName,
        status: "flagged",
        instagram_url: instagramUrl || null,
        notes: notes || null,
        map_x: x,
        map_y: y,
        created_at: new Date().toISOString(),
        village_name: villageName,
        subdistrict_name: subdistrictName,
        district_name: districtName,
        state_name: stateName,
      });
      resetForm();
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <form
        onSubmit={handleSubmit}
        className="relative bg-[var(--paper)] rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto"
      >
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 text-xl cursor-pointer"
          aria-label="Close"
        >
          ×
        </button>
        <h2 className="text-xl" style={{ fontFamily: "var(--font-display)" }}>
          Submit a report
        </h2>
        <p className="text-sm mt-1 mb-5" style={{ color: "var(--ink-soft)" }}>
          Paste a link and select where the audit happened.
        </p>

        <label className="block text-xs font-mono uppercase tracking-wide mb-1" style={{ color: "var(--ink-soft)" }}>
          Instagram link (optional)
        </label>
        <input
          type="url"
          value={instagramUrl}
          onChange={(e) => setInstagramUrl(e.target.value)}
          placeholder="https://instagram.com/reel/..."
          className="w-full mb-3 px-3 py-2 rounded border bg-white text-sm"
          style={{ borderColor: "var(--line)" }}
        />

        <label className="block text-xs font-mono uppercase tracking-wide mb-1" style={{ color: "var(--ink-soft)" }}>
          School name
        </label>
        <input
          type="text"
          required
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
          placeholder="e.g. Panchayat Primary School"
          className="w-full mb-3 px-3 py-2 rounded border bg-white text-sm"
          style={{ borderColor: "var(--line)" }}
        />

        <label className="block text-xs font-mono uppercase tracking-wide mb-1" style={{ color: "var(--ink-soft)" }}>
          State
        </label>
        <select
          required
          value={stateCode}
          onChange={(e) => handleStateChange(e.target.value)}
          className="w-full mb-3 px-3 py-2 rounded border bg-white text-sm"
          style={{ borderColor: "var(--line)" }}
        >
          <option value="">Select state</option>
          {states.map((s) => (
            <option key={s.code} value={s.code}>{s.name}</option>
          ))}
        </select>

        <label className="block text-xs font-mono uppercase tracking-wide mb-1" style={{ color: "var(--ink-soft)" }}>
          District
        </label>
        <select
          required
          disabled={!stateCode}
          value={districtCode}
          onChange={(e) => handleDistrictChange(e.target.value)}
          className="w-full mb-3 px-3 py-2 rounded border bg-white text-sm disabled:opacity-50"
          style={{ borderColor: "var(--line)" }}
        >
          <option value="">{stateCode ? "Select district" : "Select a state first"}</option>
          {districts.map((d) => (
            <option key={d.code} value={d.code}>{d.name}</option>
          ))}
        </select>

        <label className="block text-xs font-mono uppercase tracking-wide mb-1" style={{ color: "var(--ink-soft)" }}>
          Tehsil / block
        </label>
        <select
          required
          disabled={!districtCode}
          value={subdistrictCode}
          onChange={(e) => handleSubdistrictChange(e.target.value)}
          className="w-full mb-3 px-3 py-2 rounded border bg-white text-sm disabled:opacity-50"
          style={{ borderColor: "var(--line)" }}
        >
          <option value="">{districtCode ? "Select tehsil" : "Select a district first"}</option>
          {subdistricts.map((s) => (
            <option key={s.code} value={s.code}>{s.name}</option>
          ))}
        </select>

        <label className="block text-xs font-mono uppercase tracking-wide mb-1" style={{ color: "var(--ink-soft)" }}>
          Village
        </label>
        <select
          required
          disabled={!subdistrictCode}
          value={villageCode}
          onChange={(e) => setVillageCode(e.target.value ? Number(e.target.value) : "")}
          className="w-full mb-3 px-3 py-2 rounded border bg-white text-sm disabled:opacity-50"
          style={{ borderColor: "var(--line)" }}
        >
          <option value="">{subdistrictCode ? "Select village" : "Select a tehsil first"}</option>
          {villages.map((v) => (
            <option key={v.code} value={v.code}>{v.name}</option>
          ))}
        </select>

        <label className="block text-xs font-mono uppercase tracking-wide mb-1" style={{ color: "var(--ink-soft)" }}>
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="What did the audit find?"
          className="w-full mb-4 px-3 py-2 rounded border bg-white text-sm"
          style={{ borderColor: "var(--line)" }}
        />

        {error && <p className="text-sm mb-3" style={{ color: "var(--brick)" }}>{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-full text-sm border cursor-pointer"
            style={{ borderColor: "var(--line)" }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2 rounded-full text-sm text-white cursor-pointer disabled:opacity-60"
            style={{ background: "var(--rust)" }}
          >
            {submitting ? "Sending…" : "Send for review"}
          </button>
        </div>
      </form>
    </div>
  );
}
