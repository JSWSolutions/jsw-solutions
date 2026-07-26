"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Today's date in the browser's own timezone, as yyyy-mm-dd. */
function todayLocal(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function MarkPaidButton({
  id,
  paid,
  size = "sm",
}: {
  id: number;
  paid: boolean;
  size?: "sm" | "lg";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payDate, setPayDate] = useState(todayLocal());
  const [checkNo, setCheckNo] = useState("");

  async function send(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${id}/paid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j?.error || "Could not save. Please try again.");
        setBusy(false);
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("Could not save. Please try again.");
    }
    setBusy(false);
  }

  const pad = size === "lg" ? "px-4 py-2 text-sm" : "px-3 py-1.5 text-xs";

  if (paid) {
    return (
      <button
        onClick={() => send({ paid: false })}
        disabled={busy}
        className={`rounded-md border border-slate-300 font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 ${pad}`}
      >
        {busy ? "…" : "Mark Unpaid"}
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => {
          setPayDate(todayLocal());
          setCheckNo("");
          setError(null);
          setOpen(true);
        }}
        disabled={busy}
        className={`rounded-md bg-brand-green font-semibold text-white hover:bg-brand-green-dark disabled:opacity-50 ${pad}`}
      >
        {busy ? "…" : "✓ Mark Paid"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-5 text-left shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-slate-900">Record payment</h2>

            <label className="mt-4 block">
              <span className="text-sm font-medium text-slate-600">Date paid</span>
              <input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
              />
            </label>

            <label className="mt-4 block">
              <span className="text-sm font-medium text-slate-600">
                Check # <span className="font-normal text-slate-400">(leave blank if not a check)</span>
              </span>
              <input
                type="text"
                value={checkNo}
                onChange={(e) => setCheckNo(e.target.value)}
                placeholder="e.g. 10482"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
              />
            </label>

            {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                disabled={busy}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  send({ paid: true, paid_date: payDate, check_number: checkNo })
                }
                disabled={busy}
                className="rounded-md bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-dark disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save payment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
