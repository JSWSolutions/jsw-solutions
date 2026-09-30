"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Kind = "invoice" | "thanks";

const LABEL: Record<Kind, string> = {
  invoice: "Send invoice",
  thanks: "Payment received",
};

const BLURB: Record<Kind, string> = {
  invoice: "Emails the invoice with the PDF attached.",
  thanks: "Confirms their payment was received (date, PO, amount). No attachment.",
};

function splitAddresses(raw: string): string[] {
  return Array.from(new Set(raw.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean)));
}

/**
 * The email buttons on an invoice page. Each opens a confirm box so you can
 * double-check the address list before anything goes out. Most customers have
 * two or three people who need the invoice, so the box takes a comma-separated
 * list and every address gets the email. A changed list can be saved to the
 * customer for next time.
 */
export function EmailButtons({
  invoiceId,
  paid,
  company,
  savedEmail,
  hasCustomer,
}: {
  invoiceId: number;
  paid: boolean;
  company: string | null;
  savedEmail: string | null;
  hasCustomer: boolean;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<Kind | null>(null);
  const [to, setTo] = useState(savedEmail ?? "");
  const [save, setSave] = useState(!savedEmail);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  function open(k: Kind) {
    setKind(k);
    setTo(savedEmail ?? "");
    setSave(!savedEmail);
    setError("");
    setDone("");
  }

  const recipients = splitAddresses(to);
  const changed = (savedEmail ?? "") !== recipients.join(", ");

  async function send() {
    if (!kind) return;
    if (recipients.length === 0) {
      setError("Enter at least one email address.");
      return;
    }
    const bad = recipients.find((r) => !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(r));
    if (bad) {
      setError(`"${bad}" doesn't look like a valid email address.`);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, to: recipients.join(", "), save_email: save && hasCustomer }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Could not send.");
        setBusy(false);
        return;
      }
      setDone(
        `Sent "${j.subject}" to ${recipients.length} ${recipients.length === 1 ? "address" : "addresses"}.`,
      );
      setKind(null);
      router.refresh();
    } catch {
      setError("Network error — the email was not sent.");
    }
    setBusy(false);
  }

  const btn =
    "rounded-lg border border-brand-blue/40 bg-brand-blue/5 px-4 py-2 text-sm font-semibold text-brand-blue hover:bg-brand-blue hover:text-white";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {!paid ? (
          <button onClick={() => open("invoice")} className={btn}>
            ✉ Send invoice
          </button>
        ) : (
          <button onClick={() => open("thanks")} className={btn}>
            ✉ Payment received
          </button>
        )}
      </div>
      {done && <p className="text-sm font-medium text-brand-green-dark">{done}</p>}

      {kind && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          onClick={() => !busy && setKind(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 text-left shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-slate-900">{LABEL[kind]}</h2>
            <p className="mt-1 text-sm text-slate-600">{BLURB[kind]}</p>

            <label className="mt-4 block">
              <span className="text-sm font-medium text-slate-600">
                Send to{company ? ` (${company})` : ""}
              </span>
              <textarea
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="ap@customer.com, buyer@customer.com"
                rows={2}
                autoFocus
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-orange focus:outline-none"
              />
              <span className="mt-1 block text-xs text-slate-500">
                Separate several addresses with commas — everyone listed gets the email.
              </span>
            </label>

            {recipients.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {recipients.map((r) => (
                  <li
                    key={r}
                    className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700"
                  >
                    {r}
                  </li>
                ))}
              </ul>
            )}

            {!savedEmail && (
              <p className="mt-2 text-xs text-amber-700">
                No email is saved for this customer yet — whatever you enter will be remembered.
              </p>
            )}
            {hasCustomer && (savedEmail ? changed : true) && (
              <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={save}
                  onChange={(e) => setSave(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300"
                />
                Save this list for {company ?? "this customer"}
              </label>
            )}

            {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setKind(null)}
                disabled={busy}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={send}
                disabled={busy}
                className="rounded-md bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-dark disabled:opacity-50"
              >
                {busy
                  ? "Sending…"
                  : `Send to ${recipients.length || ""} ${recipients.length === 1 ? "address" : "addresses"}`.replace("  ", " ")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
