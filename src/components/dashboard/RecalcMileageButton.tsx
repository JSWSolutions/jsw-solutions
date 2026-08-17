"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Rebuilds the whole auto mileage log from the invoices using the current
 * rules. Handy after the rules change (like MILES line quantities becoming
 * the source of truth). Manual entries are never touched.
 */
export function RecalcMileageButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function run() {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/mileage/recompute", { method: "POST" });
      const j = await res.json();
      if (!res.ok) {
        setMsg(j.error || "Could not recalculate.");
      } else {
        setMsg(`Done — ${j.trips} customer-days recalculated.`);
        router.refresh();
      }
    } catch {
      setMsg("Network error — try again.");
    }
    setBusy(false);
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={run}
        disabled={busy}
        className="rounded-lg border border-brand-green px-4 py-2 text-sm font-semibold text-brand-green-dark hover:bg-brand-green hover:text-white disabled:opacity-50"
      >
        {busy ? "Recalculating…" : "↻ Recalculate from invoices"}
      </button>
      {msg && <span className="text-sm text-slate-600">{msg}</span>}
    </div>
  );
}
