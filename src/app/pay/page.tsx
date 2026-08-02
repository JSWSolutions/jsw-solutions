"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/Logo";

type Match = {
  id: number;
  po_number: string | null;
  company: string;
  total: number;
  invoice_date: string | null;
};

function money(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default function PayPage() {
  const [po, setPo] = useState("");
  const [zip, setZip] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [payingId, setPayingId] = useState<number | null>(null);

  async function find() {
    if (!po.trim() || !zip.trim()) {
      setError("Enter both your PO number and ZIP code.");
      return;
    }
    setBusy(true);
    setError("");
    setMatches(null);
    try {
      const res = await fetch("/api/pay/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ po_number: po, zip }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "We couldn't find that invoice.");
        return;
      }
      setMatches(j.invoices as Match[]);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function pay(invoiceId: number) {
    setPayingId(invoiceId);
    setError("");
    try {
      const res = await fetch("/api/pay/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_id: invoiceId, po_number: po, zip }),
      });
      const j = await res.json();
      if (!res.ok || !j.url) {
        setError(j.error || "Could not start checkout. Please try again.");
        setPayingId(null);
        return;
      }
      window.location.href = j.url as string;
    } catch {
      setError("Something went wrong. Please try again.");
      setPayingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-sand text-ink">
      <header className="border-b border-black/5 bg-sand/90">
        <div className="container-page flex items-center justify-between py-3">
          <Link href="/" className="flex items-center gap-3">
            <Logo className="h-14 w-auto" />
          </Link>
          <Link href="/" className="text-sm font-medium text-brand-green-dark hover:underline">
            Back to jswsolutions.org
          </Link>
        </div>
      </header>

      <section className="container-page max-w-xl py-14">
        <h1 className="text-3xl font-extrabold tracking-tight">Pay an Invoice</h1>
        <p className="mt-2 text-ink/80">
          Enter the PO number and ZIP code from your invoice to pay by credit card.
        </p>

        <div className="mt-8 rounded-xl border border-black/10 bg-white p-6 shadow-sm">
          <label className="block">
            <span className="text-sm font-medium text-ink/70">PO Number</span>
            <input
              value={po}
              onChange={(e) => setPo(e.target.value)}
              placeholder="e.g. PO-1234"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-orange"
            />
          </label>
          <label className="mt-4 block">
            <span className="text-sm font-medium text-ink/70">ZIP Code</span>
            <input
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              placeholder="e.g. 48176"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-orange"
            />
          </label>

          {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}

          <button
            onClick={find}
            disabled={busy}
            className="mt-5 w-full rounded-lg bg-brand-orange px-6 py-3 font-semibold text-white hover:bg-brand-orange-dark disabled:opacity-50"
          >
            {busy ? "Looking…" : "Find My Invoice"}
          </button>
        </div>

        {matches && matches.length > 0 && (
          <div className="mt-6 space-y-3">
            {matches.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-xl border border-black/10 bg-white p-5 shadow-sm"
              >
                <div>
                  <p className="font-semibold text-ink">{m.company}</p>
                  <p className="text-sm text-ink/70">
                    {m.po_number ? `PO ${m.po_number}` : "No PO number"}
                    {m.invoice_date ? ` · ${m.invoice_date}` : ""}
                  </p>
                  <p className="mt-1 text-lg font-bold text-brand-green-dark">{money(m.total)}</p>
                </div>
                <button
                  onClick={() => pay(m.id)}
                  disabled={payingId !== null}
                  className="rounded-lg bg-brand-green px-5 py-2.5 font-semibold text-white hover:bg-brand-green-dark disabled:opacity-50"
                >
                  {payingId === m.id ? "Redirecting…" : "Pay with Card"}
                </button>
              </div>
            ))}
            <p className="text-xs text-ink/60">
              You&apos;ll be redirected to Stripe, our secure payment processor, to complete your
              card payment. JSW Solutions never sees or stores your card number.
            </p>
          </div>
        )}

        <p className="mt-10 text-sm text-ink/60">
          Trouble finding your invoice? Email{" "}
          <a className="text-brand-green-dark underline" href="mailto:jsawsolutions@gmail.com">
            jsawsolutions@gmail.com
          </a>{" "}
          or call 734-320-6348.
        </p>
      </section>
    </div>
  );
}
