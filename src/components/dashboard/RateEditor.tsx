"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CustomerRate } from "@/lib/queries";

function RateRow({ company, mileage_rate }: CustomerRate) {
  const router = useRouter();
  const [value, setValue] = useState(mileage_rate == null ? "" : String(mileage_rate));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const dirty = (mileage_rate == null ? "" : String(mileage_rate)) !== value.trim();

  async function save() {
    setBusy(true);
    setError("");
    setSaved(false);
    const res = await fetch("/api/mileage-rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company,
        mileage_rate: value.trim() === "" ? null : Number(value),
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error || "Could not save.");
      return;
    }
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <tr className="border-t border-slate-100">
      <td className="px-4 py-2 font-medium text-slate-800">{company}</td>
      <td className="px-4 py-2">
        <div className="flex items-center justify-end gap-2">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="—"
            inputMode="decimal"
            className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-right outline-none focus:border-brand-orange"
          />
          <span className="text-xs text-slate-400">mi/hr</span>
          <button
            onClick={save}
            disabled={busy || !dirty}
            className="rounded-lg bg-brand-green px-3 py-1 text-xs font-semibold text-white hover:bg-brand-green-dark disabled:opacity-40"
          >
            {busy ? "…" : saved ? "Saved ✓" : "Save"}
          </button>
        </div>
        {error && <p className="mt-1 text-right text-xs text-red-600">{error}</p>}
      </td>
    </tr>
  );
}

function AddCustomerRate() {
  const router = useRouter();
  const [company, setCompany] = useState("");
  const [rate, setRate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!company.trim()) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/mileage-rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company: company.trim(),
        mileage_rate: rate.trim() === "" ? null : Number(rate),
      }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(json.error || "Could not save.");
      return;
    }
    setCompany("");
    setRate("");
    router.refresh();
  }

  return (
    <form onSubmit={add} className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
      <label className="text-sm">
        <span className="mb-1 block font-medium text-slate-600">New customer name</span>
        <input
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="e.g. New Machine Shop"
          className="w-56 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-orange"
        />
      </label>
      <label className="text-sm">
        <span className="mb-1 block font-medium text-slate-600">Miles per travel hour</span>
        <input
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          placeholder="e.g. 45"
          inputMode="decimal"
          className="w-40 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-orange"
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white hover:bg-brand-orange-dark disabled:opacity-50"
      >
        {busy ? "Saving…" : "Add customer rate"}
      </button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}

export function RateEditor({ rates }: { rates: CustomerRate[] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-bold text-slate-900">Mileage rates per customer</h2>
      <p className="mt-1 text-sm text-slate-500">
        Miles driven per billed travel hour. When an invoice is added, mileage is
        logged automatically as travel hours × this rate. Set or change a rate and
        past trips for that customer are recalculated.
      </p>

      <table className="mt-4 w-full max-w-xl text-sm">
        <thead>
          <tr className="text-left text-slate-500">
            <th className="px-4 py-2">Customer</th>
            <th className="px-4 py-2 text-right">Rate (miles / travel hour)</th>
          </tr>
        </thead>
        <tbody>
          {rates.length === 0 && (
            <tr>
              <td colSpan={2} className="px-4 py-6 text-center text-slate-500">
                No customers yet.
              </td>
            </tr>
          )}
          {rates.map((r) => (
            <RateRow key={r.company} {...r} />
          ))}
        </tbody>
      </table>

      <AddCustomerRate />
    </div>
  );
}
