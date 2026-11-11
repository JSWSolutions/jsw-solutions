"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

/** Today's date in the browser's own timezone, as yyyy-mm-dd. */
function todayLocal(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

type CustomerOpt = {
  id: number;
  company: string;
  contact_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  email: string | null;
};

/** Numeric boxes stay text while editing so decimal points survive typing. */
type ItemDraft = {
  description: string;
  cost_per_hour: string;
  qty: string;
  line_total: string;
};

const TEMPLATE_ITEMS: ItemDraft[] = [
  { description: "SERVICE", cost_per_hour: "155", qty: "", line_total: "" },
  { description: "TRAVEL", cost_per_hour: "65", qty: "", line_total: "" },
  { description: "MILES", cost_per_hour: "", qty: "", line_total: "" },
  { description: "PER DIEM", cost_per_hour: "", qty: "", line_total: "" },
];

type FormState = {
  quote_date: string;
  machine_type: string;
  customer_company: string;
  customer_contact: string;
  customer_address: string;
  customer_city: string;
  customer_state: string;
  customer_zip: string;
  customer_phone: string;
  customer_email: string;
  work_summary: string;
  notes: string;
};

export default function NewQuotePage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    quote_date: todayLocal(),
    machine_type: "",
    customer_company: "",
    customer_contact: "",
    customer_address: "",
    customer_city: "",
    customer_state: "",
    customer_zip: "",
    customer_phone: "",
    customer_email: "",
    work_summary: "",
    notes: "",
  });
  const [items, setItems] = useState<ItemDraft[]>(TEMPLATE_ITEMS);
  const [customers, setCustomers] = useState<CustomerOpt[]>([]);
  const [companyChoice, setCompanyChoice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/customers", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setCustomers(j.customers ?? []))
      .catch(() => {});
  }, []);

  function set<K extends keyof FormState>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function pickCompany(choice: string) {
    setCompanyChoice(choice);
    const c = customers.find((x) => String(x.id) === choice);
    setForm((f) => ({
      ...f,
      customer_company: c?.company ?? "",
      customer_contact: c?.contact_name ?? "",
      customer_address: c?.address ?? "",
      customer_city: c?.city ?? "",
      customer_state: c?.state ?? "",
      customer_zip: c?.zip ?? "",
      customer_phone: c?.phone ?? "",
      customer_email: c?.email ?? "",
    }));
  }

  function updateItem(i: number, patch: Partial<ItemDraft>) {
    setItems((arr) =>
      arr.map((li, idx) => {
        if (idx !== i) return li;
        const next = { ...li, ...patch };
        if ("cost_per_hour" in patch || "qty" in patch) {
          const r = Number(next.cost_per_hour);
          const q = Number(next.qty);
          if (next.cost_per_hour.trim() && next.qty.trim() && Number.isFinite(r) && Number.isFinite(q)) {
            next.line_total = String(Math.round(r * q * 100) / 100);
          }
        }
        return next;
      }),
    );
  }
  function addItem() {
    setItems((arr) => [...arr, { description: "", cost_per_hour: "", qty: "", line_total: "" }]);
  }
  function removeItem(i: number) {
    setItems((arr) => arr.filter((_, idx) => idx !== i));
  }

  const total = useMemo(
    () => items.reduce((s, li) => s + (Number(li.line_total) || 0), 0),
    [items],
  );

  async function save() {
    if (!form.customer_company.trim()) {
      setError("Pick a company, or add a new one.");
      return;
    }
    const bad = items.find(
      (li) =>
        (li.cost_per_hour.trim() && !Number.isFinite(Number(li.cost_per_hour))) ||
        (li.qty.trim() && !Number.isFinite(Number(li.qty))) ||
        (li.line_total.trim() && !Number.isFinite(Number(li.line_total))),
    );
    if (bad) {
      setError(`One of the numbers on the "${bad.description || "blank"}" line doesn't look right.`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            ...form,
            total,
            line_items: items.map((li) => ({
              description: li.description,
              cost_per_hour: li.cost_per_hour.trim() ? Number(li.cost_per_hour) : null,
              qty: li.qty.trim() ? Number(li.qty) : null,
              line_total: Number(li.line_total) || 0,
            })),
          },
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Could not save.");
        setSaving(false);
        return;
      }
      router.push(`/dashboard/quotes/${j.id}`);
      router.refresh();
    } catch {
      setError("Network error while saving.");
      setSaving(false);
    }
  }

  const input =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-orange";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-900">New quote</h1>
        <Link href="/dashboard/quotes" className="text-sm text-slate-500 hover:underline">
          ← Back to quotes
        </Link>
      </div>

      <Section title="Quote">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600">Quote date</span>
            <input type="date" value={form.quote_date} onChange={(e) => set("quote_date", e.target.value)} className={input} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600">Machine type</span>
            <input
              value={form.machine_type}
              onChange={(e) => set("machine_type", e.target.value)}
              placeholder="e.g. Mitsubishi CO2 laser, fiber laser + chiller"
              className={input}
            />
            <span className="mt-1 block text-xs text-slate-500">
              Free text — the kind of machine, not a specific unit.
            </span>
          </label>
        </div>
      </Section>

      <Section title="Customer">
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-slate-600">Company</label>
          <select
            value={companyChoice}
            onChange={(e) => pickCompany(e.target.value)}
            className={input}
          >
            <option value="">— pick a company —</option>
            {customers.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.company}
              </option>
            ))}
            <option value="new">➕ Add a new company…</option>
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Picking a company fills in its saved details below. A new company is saved to
            Customers when you save the quote.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Company name" value={form.customer_company} onChange={(v) => set("customer_company", v)} />
          <Input label="Contact name" value={form.customer_contact} onChange={(v) => set("customer_contact", v)} />
          <Input label="Phone" value={form.customer_phone} onChange={(v) => set("customer_phone", v)} />
          <Input label="Email(s) — commas between several" value={form.customer_email} onChange={(v) => set("customer_email", v)} />
          <Input label="Address" value={form.customer_address} onChange={(v) => set("customer_address", v)} />
          <Input label="City" value={form.customer_city} onChange={(v) => set("customer_city", v)} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="State" value={form.customer_state} onChange={(v) => set("customer_state", v)} />
            <Input label="ZIP" value={form.customer_zip} onChange={(v) => set("customer_zip", v)} />
          </div>
        </div>
      </Section>

      <Section title="Summary of work">
        <textarea
          value={form.work_summary}
          onChange={(e) => set("work_summary", e.target.value)}
          rows={6}
          className={input}
          placeholder="What the job involves…"
        />
      </Section>

      <Section title="Notes">
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={3}
          className={input}
          placeholder="Anything extra for the quote's NOTES box — assumptions, parts to be confirmed, scheduling…"
        />
      </Section>

      <Section title="Estimated charges">
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
                inputMode="decimal"
                value={li.cost_per_hour}
                onChange={(e) => updateItem(i, { cost_per_hour: e.target.value })}
              />
              <input
                className="col-span-3 rounded border border-slate-300 px-2 py-1 text-right text-sm sm:col-span-1"
                placeholder="Qty"
                inputMode="decimal"
                value={li.qty}
                onChange={(e) => updateItem(i, { qty: e.target.value })}
              />
              <input
                className="col-span-4 rounded border border-slate-300 px-2 py-1 text-right text-sm sm:col-span-3"
                placeholder="Total"
                inputMode="decimal"
                value={li.line_total}
                onChange={(e) => updateItem(i, { line_total: e.target.value })}
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
            + Add line
          </button>
        </div>
        <p className="mt-4 text-right text-lg font-bold text-brand-green-dark">
          Total quote: ${total.toFixed(2)}
        </p>
      </Section>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <div className="flex justify-end gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-brand-green px-6 py-2.5 font-semibold text-white hover:bg-brand-green-dark disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save quote"}
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

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-600">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-orange"
      />
    </label>
  );
}
