"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ManualMileageForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    entry_date: "",
    customer_name: "",
    miles: "",
    reason: "",
  });

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/mileage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entry_date: form.entry_date || null,
        customer_name: form.customer_name || null,
        miles: Number(form.miles) || 0,
        reason: form.reason || "SERVICE",
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Could not save.");
      setBusy(false);
      return;
    }
    setForm({ entry_date: "", customer_name: "", miles: "", reason: "" });
    setBusy(false);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white hover:bg-brand-orange-dark"
      >
        + Add miles manually
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Date</span>
          <input
            type="date"
            value={form.entry_date}
            onChange={(e) => set("entry_date", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-orange"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Customer / place</span>
          <input
            value={form.customer_name}
            onChange={(e) => set("customer_name", e.target.value)}
            placeholder="e.g. Supply run"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-orange"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Miles</span>
          <input
            value={form.miles}
            onChange={(e) => set("miles", e.target.value)}
            placeholder="0"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-orange"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Reason</span>
          <input
            value={form.reason}
            onChange={(e) => set("reason", e.target.value)}
            placeholder="SERVICE"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-orange"
          />
        </label>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-dark disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save entry"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
