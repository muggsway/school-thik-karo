"use client";

import { useState } from "react";
import { placeLocation } from "@/lib/statemap";
import type { CaseRow, StateOption } from "@/components/MapApp";
import VillagePicker, { type PickedLocation } from "@/components/VillagePicker";

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
  const [location, setLocation] = useState<PickedLocation | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setSchoolName("");
    setInstagramUrl("");
    setNotes("");
    setLocation(null);
    setError(null);
  }

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!instagramUrl || !location) {
      setError("Please add the Instagram link and pick a location.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolName: schoolName || null,
          stateCode: location.stateCode,
          districtCode: location.districtCode,
          subdistrictCode: location.subdistrictCode,
          villageCode: location.villageCode,
          instagramUrl: instagramUrl || null,
          notes: notes || null,
        }),
      });
      if (!res.ok) throw new Error("Submission failed");
      const { id } = await res.json();

      const { x, y } = placeLocation(
        location.stateCode,
        location.districtCode,
        location.subdistrictCode,
        location.villageCode !== null ? String(location.villageCode) : null
      );

      onCreated({
        id,
        school_name: schoolName || null,
        status: "flagged",
        instagram_url: instagramUrl || null,
        notes: notes || null,
        map_x: x,
        map_y: y,
        created_at: new Date().toISOString(),
        village_name: location.villageName,
        subdistrict_name: location.subdistrictName,
        district_name: location.districtName,
        state_name: location.stateName,
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
    <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <form
        onSubmit={handleSubmit}
        className="relative bg-[var(--paper)] shadow-2xl w-full sm:max-w-md p-5 sm:p-6 max-h-[92vh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-xl"
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
          Paste a link and search for the location.
        </p>

        <label className="block text-xs font-mono uppercase tracking-wide mb-1" style={{ color: "var(--ink-soft)" }}>
          Instagram link
        </label>
        <input
          type="url"
          required
          value={instagramUrl}
          onChange={(e) => setInstagramUrl(e.target.value)}
          placeholder="https://instagram.com/p/..."
          className="w-full mb-3 px-3 py-2.5 rounded-lg border bg-white text-sm"
          style={{ borderColor: "var(--line)" }}
        />

        <label className="block text-xs font-mono uppercase tracking-wide mb-1" style={{ color: "var(--ink-soft)" }}>
          Village, tehsil, or district/city
        </label>
        <VillagePicker states={states} value={location} onChange={setLocation} />

        <label className="block text-xs font-mono uppercase tracking-wide mb-1" style={{ color: "var(--ink-soft)" }}>
          School name (optional)
        </label>
        <input
          type="text"
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
          placeholder="e.g. Panchayat Primary School"
          className="w-full mb-3 px-3 py-2.5 rounded-lg border bg-white text-sm"
          style={{ borderColor: "var(--line)" }}
        />

        <label className="block text-xs font-mono uppercase tracking-wide mb-1" style={{ color: "var(--ink-soft)" }}>
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="What did the audit find?"
          className="w-full mb-4 px-3 py-2.5 rounded-lg border bg-white text-sm"
          style={{ borderColor: "var(--line)" }}
        />

        {error && <p className="text-sm mb-3" style={{ color: "var(--brick)" }}>{error}</p>}

        <div className="flex justify-end gap-2 pb-[env(safe-area-inset-bottom)]">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2.5 rounded-full text-sm border cursor-pointer"
            style={{ borderColor: "var(--line)" }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 rounded-full text-sm text-white cursor-pointer disabled:opacity-60"
            style={{ background: "var(--rust)" }}
          >
            {submitting ? "Sending…" : "Send for review"}
          </button>
        </div>
      </form>
    </div>
  );
}
