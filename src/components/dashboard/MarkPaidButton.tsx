"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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

  async function toggle() {
    setBusy(true);
    await fetch(`/api/invoices/${id}/paid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paid: !paid }),
    });
    router.refresh();
    setBusy(false);
  }

  const pad = size === "lg" ? "px-4 py-2 text-sm" : "px-3 py-1.5 text-xs";

  if (paid) {
    return (
      <button
        onClick={toggle}
        disabled={busy}
        className={`rounded-md border border-slate-300 font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 ${pad}`}
      >
        {busy ? "…" : "Mark Unpaid"}
      </button>
    );
  }
  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`rounded-md bg-brand-green font-semibold text-white hover:bg-brand-green-dark disabled:opacity-50 ${pad}`}
    >
      {busy ? "…" : "✓ Mark Paid"}
    </button>
  );
}
