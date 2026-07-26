"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { LineItem, ParsedInvoice } from "@/lib/types";

const MAX_DATES = 5;

/** Today's date in the browser's own timezone, as yyyy-mm-dd. */
function todayLocal(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Older invoices were entered as a start–end range. If a PDF still parses that
 * way, turn the range into the individual days it covers (up to 5) so the new
 * form can show them as separate date boxes.
 */
function expandRange(start: string | null, end: string | null): string[] {
  if (!start) return [];
  if (!end || end === start) return [start];
  const out: string[] = [];
  const from = new Date(`${start}T00:00:00`);
  const to = new Date(`${end}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) {
    return [start];
  }
  for (let d = from; d <= to && out.length < MAX_DATES; d.setDate(d.getDate() + 1)) {
    const m = `${d.getMonth() + 1}`.padStart(2, "0");
    const day = `${d.getDate()}`.padStart(2, "0");
    out.push(`${d.getFullYear()}-${m}-${day}`);
  }
  return out;
}

type FormState = {
  po_number: string;
  machine_id: string;
  customer_company: string;
  customer_contact: string;
  customer_address: string;
  customer_city: string;
  customer_state: string;
  customer_zip: string;
  customer_phone: string;
  work_summary: string;
  total: string;
};

const EMPTY: FormState = {
  po_number: "",
  machine_id: "",
  customer_company: "",
  customer_contact: "",
  customer_address: "",
  customer_city: "",
  customer_state: "",
  customer_zip: "",
  customer_phone: "",
  work_summary: "",
  total: "",
};

function parsedToForm(p: ParsedInvoice): FormState {
  return {
    po_number: p.po_number ?? "",
    machine_id: p.machine_id ?? "",
    customer_company: p.customer_company ?? "",
    customer_contact: p.customer_contact ?? "",
    customer_address: p.customer_address ?? "",
    customer_city: p.customer_city ?? "",
    customer_state: p.customer_state ?? "",
    customer_zip: p.customer_zip ?? "",
    customer_phone: p.customer_phone ?? "",
    work_summary: p.work_summary ?? "",
    total: p.total ? String(p.total) : "",
  };
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [step, setStep] = useState<"upload" | "form">("upload");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [items, setItems] = useState<LineItem[]>([]);
  const [dates, setDates] = useState<string[]>([""]);
  const [paid, setPaid] = useState(false);
  const [paidDate, setPaidDate] = useState(todayLocal());
  const [checkNo, setCheckNo] = useState("");

  const computedTotal = useMemo(
    () => items.reduce((s, li) => s + (Number(li.line_total) || 0), 0),
    [items],
  );

  function set<K extends keyof FormState>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function setDate(i: number, v: string) {
    setDates((arr) => arr.map((d, idx) => (idx === i ? v : d)));
  }
  function addDate() {
    setDates((arr) => (arr.length >= MAX_DATES ? arr : [...arr, ""]));
  }
  function removeDate(i: number) {
    setDates((arr) => (arr.length <= 1 ? [""] : arr.filter((_, idx) => idx !== i)));
  }

  /** The dates actually filled in, tidied up — no blanks, no repeats, in order. */
  const chosenDates = useMemo(
    () => Array.from(new Set(dates.map((d) => d.trim()).filter(Boolean))).sort(),
    [dates],
  );

  async function handleFile(file: File) {
    setParsing(true);
    setError("");
    setNotice("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/parse", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Could not read the PDF.");
        // Still let them fill it in manually.
        setStep("form");
        setParsing(false);
        return;
      }
      const parsed = json.parsed as ParsedInvoice;
      setForm(parsedToForm(parsed));
      const found = parsed.service_dates?.length
        ? parsed.service_dates.slice(0, MAX_DATES)
        : expandRange(parsed.invoice_date, parsed.invoice_date_end);
      setDates(found.length ? found : [""]);
      setItems(parsed.line_items ?? []);
      setPdfUrl(json.pdfUrl ?? null);
      setNotice(
        "We read the PDF and filled in what we found. Please double-check everything below before saving.",
      );
      setStep("form");
    } catch {
      setError("Something went wrong reading the file. You can enter it manually.");
      setStep("form");
    } finally {
      setParsing(false);
    }
  }

  function updateItem(i: number, patch: Partial<LineItem>) {
    setItems((arr) => arr.map((li, idx) => (idx === i ? { ...li, ...patch } : li)));
  }
  function addItem() {
    setItems((arr) => [
      ...arr,
      { description: "", cost_per_hour: null, qty: null, line_total: 0, sort_order: arr.length },
    ]);
  }
  function removeItem(i: number) {
    setItems((arr) => arr.filter((_, idx) => idx !== i));
  }

  async function save() {
    if (chosenDates.length === 0) {
      setError("Please pick at least one date the work was done.");
      return;
    }
    setSaving(true);
    setError("");
    const totalOverride = form.total.trim() ? Number(form.total) : computedTotal;
    const payload = {
      data: {
        ...form,
        service_dates: chosenDates,
        total: totalOverride,
        line_items: items,
      },
      pdfUrl,
      paid,
      paid_date: paid ? paidDate : null,
      check_number: paid ? checkNo : null,
    };
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Could not save.");
        setSaving(false);
        return;
      }
      router.push(`/dashboard/invoices/${json.id}`);
      router.refresh();
    } catch {
      setError("Network error while saving.");
      setSaving(false);
    }
  }

  if (step === "upload") {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <h1 className="text-2xl font-extrabold text-slate-900">Add an invoice</h1>
        <label
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-12 text-center transition hover:border-brand-orange ${
            parsing ? "opacity-60" : ""
          }`}
        >
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            disabled={parsing}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <span className="text-4xl">📄</span>
          <span className="mt-3 font-semibold text-slate-800">
            {parsing ? "Reading your PDF…" : "Click to upload an invoice PDF"}
          </span>
          <span className="mt-1 text-sm text-slate-500">
            We&apos;ll auto-fill the details for you to check
          </span>
        </label>
        <div className="text-center">
          <button
            onClick={() => {
              setForm(EMPTY);
              setItems([]);
              setDates([todayLocal()]);
              setStep("form");
            }}
            className="text-sm font-medium text-slate-500 hover:text-brand-orange"
          >
            or enter the invoice manually →
          </button>
        </div>
        {error && <p className="text-center text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-900">Review &amp; save invoice</h1>
        <button
          onClick={() => setStep("upload")}
          className="text-sm text-slate-500 hover:underline"
        >
          ← Start over
        </button>
      </div>

      {notice && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">{notice}</p>
      )}
      {pdfUrl && (
        <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-orange hover:underline">
          View uploaded PDF ↗
        </a>
      )}

      <Section title="Invoice">
        <Grid>
          <Input label="PO #" value={form.po_number} onChange={(v) => set("po_number", v)} />
          <Input label="Machine ID" value={form.machine_id} onChange={(v) => set("machine_id", v)} />
        </Grid>

        <div className="mt-4">
          <p className="text-sm font-medium text-slate-600">Dates worked</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Pick each day you were on site — up to {MAX_DATES}. Travel time is split evenly
            across them for the mileage log.
          </p>
          <div className="mt-2 space-y-2">
            {dates.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="date"
                  value={d}
                  onChange={(e) => setDate(i, e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-orange sm:w-56"
                />
                {dates.length > 1 && (
                  <button
                    onClick={() => removeDate(i)}
                    className="px-2 text-slate-400 hover:text-red-500"
                    title="Remove this date"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          {dates.length < MAX_DATES && (
            <button
              onClick={addDate}
              className="mt-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:border-brand-orange hover:text-brand-orange"
            >
              + Add another date
            </button>
          )}
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={paid}
            onChange={(e) => setPaid(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          Already paid (leave unchecked if the customer hasn&apos;t paid yet)
        </label>

        {paid && (
          <div className="mt-3 rounded-lg bg-slate-50 p-3">
            <Grid>
              <Input label="Date paid" type="date" value={paidDate} onChange={setPaidDate} />
              <Input
                label="Check # (leave blank if not a check)"
                value={checkNo}
                onChange={setCheckNo}
              />
            </Grid>
          </div>
        )}
      </Section>

      <Section title="Customer">
        <Grid>
          <Input label="Company" value={form.customer_company} onChange={(v) => set("customer_company", v)} />
          <Input label="Contact name" value={form.customer_contact} onChange={(v) => set("customer_contact", v)} />
          <Input label="Phone" value={form.customer_phone} onChange={(v) => set("customer_phone", v)} />
          <Input label="Address" value={form.customer_address} onChange={(v) => set("customer_address", v)} />
          <Input label="City" value={form.customer_city} onChange={(v) => set("customer_city", v)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="State" value={form.customer_state} onChange={(v) => set("customer_state", v)} />
            <Input label="ZIP" value={form.customer_zip} onChange={(v) => set("customer_zip", v)} />
          </div>
        </Grid>
      </Section>

      <Section title="Work performed">
        <textarea
          value={form.work_summary}
          onChange={(e) => set("work_summary", e.target.value)}
          rows={5}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-orange"
          placeholder="Summary of work performed…"
        />
      </Section>

      <Section title="Line items">
        <div className="space-y-2">
          <div className="hidden grid-cols-12 gap-2 px-1 text-xs font-semibold text-slate-500 sm:grid">
            <span className="col-span-5">Description</span>
            <span className="col-span-2 text-right">Rate</span>
            <span className="col-span-1 text-right">Qty</span>
            <span className="col-span-3 text-right">Line total</span>
            <span className="col-span-1"></span>
          </div>
          {items.map((li, i) => (
            <div key={i} className="grid grid-cols-12 items-center gap-2">
              <input
                className="col-span-12 rounded border border-slate-300 px-2 py-1 text-sm sm:col-span-5"
                placeholder="Description"
                value={li.description}
                onChange={(e) => updateItem(i, { description: e.target.value })}
              />
              <input
                className="col-span-4 rounded border border-slate-300 px-2 py-1 text-right text-sm sm:col-span-2"
                placeholder="Rate"
                value={li.cost_per_hour ?? ""}
                onChange={(e) =>
                  updateItem(i, { cost_per_hour: e.target.value === "" ? null : Number(e.target.value) })
                }
              />
              <input
                className="col-span-3 rounded border border-slate-300 px-2 py-1 text-right text-sm sm:col-span-1"
                placeholder="Qty"
                value={li.qty ?? ""}
                onChange={(e) => updateItem(i, { qty: e.target.value === "" ? null : Number(e.target.value) })}
              />
              <input
                className="col-span-4 rounded border border-slate-300 px-2 py-1 text-right text-sm sm:col-span-3"
                placeholder="Total"
                value={li.line_total || ""}
                onChange={(e) => updateItem(i, { line_total: Number(e.target.value) || 0 })}
              />
              <button
                onClick={() => removeItem(i)}
                className="col-span-1 text-center text-slate-400 hover:text-red-500"
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={addItem}
            className="rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:border-brand-orange hover:text-brand-orange"
          >
            + Add line item
          </button>
        </div>
      </Section>

      <Section title="Total charge">
        <div className="flex items-center gap-3">
          <span className="text-slate-500">$</span>
          <input
            value={form.total}
            onChange={(e) => set("total", e.target.value)}
            placeholder={computedTotal ? computedTotal.toFixed(2) : "0.00"}
            className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-lg font-bold outline-none focus:border-brand-orange"
          />
          {items.length > 0 && (
            <span className="text-sm text-slate-500">
              Line items sum to ${computedTotal.toFixed(2)}
              {!form.total.trim() && " (used if left blank)"}
            </span>
          )}
        </div>
      </Section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-brand-orange px-6 py-3 font-semibold text-white hover:bg-brand-orange-dark disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save invoice"}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 font-bold text-slate-900">{title}</h2>
      {children}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>;
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-orange"
      />
    </label>
  );
}
