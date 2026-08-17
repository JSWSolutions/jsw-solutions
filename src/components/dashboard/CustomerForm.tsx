"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export interface CustomerFormValues {
  id?: number;
  company: string;
  contact_name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
}

const BLANK: CustomerFormValues = {
  company: "",
  contact_name: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
};

/**
 * Add / edit a customer. With an id it saves changes (PATCH); without one it
 * creates the customer (POST).
 */
export function CustomerForm({ initial }: { initial?: CustomerFormValues }) {
  const router = useRouter();
  const editing = Boolean(initial?.id);
  const [v, setV] = useState<CustomerFormValues>(initial ?? BLANK);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof CustomerFormValues>(k: K, val: string) {
    setV((f) => ({ ...f, [k]: val }));
  }

  async function save() {
    if (!v.company.trim()) {
      setError("Company name is required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(
        editing ? `/api/customers/${initial!.id}` : "/api/customers",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company: v.company,
            contact_name: v.contact_name,
            address: v.address,
            city: v.city,
            state: v.state,
            zip: v.zip,
            phone: v.phone,
          }),
        },
      );
      const j = await res.json();
      if (!res.ok) {
        setError(j.error || "Could not save.");
        setBusy(false);
        return;
      }
      router.push("/dashboard/customers");
      router.refresh();
    } catch {
      setError("Network error while saving.");
      setBusy(false);
    }
  }

  const input =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-orange";

  return (
    <div className="max-w-2xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <Field label="Company name *">
        <input className={input} value={v.company} onChange={(e) => set("company", e.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Contact name">
          <input className={input} value={v.contact_name} onChange={(e) => set("contact_name", e.target.value)} />
        </Field>
        <Field label="Phone">
          <input className={input} value={v.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
      </div>
      <Field label="Street address">
        <input className={input} value={v.address} onChange={(e) => set("address", e.target.value)} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="City">
          <input className={input} value={v.city} onChange={(e) => set("city", e.target.value)} />
        </Field>
        <Field label="State">
          <input className={input} value={v.state} onChange={(e) => set("state", e.target.value)} />
        </Field>
        <Field label="ZIP">
          <input className={input} value={v.zip} onChange={(e) => set("zip", e.target.value)} />
        </Field>
      </div>
      <p className="text-xs text-slate-500">
        The ZIP code is also what customers type alongside their PO number to pay
        an invoice by card on the website — keep it current.
      </p>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={save}
          disabled={busy}
          className="rounded-lg bg-brand-green px-5 py-2 font-semibold text-white hover:bg-brand-green-dark disabled:opacity-50"
        >
          {busy ? "Saving…" : editing ? "Save changes" : "Add customer"}
        </button>
        <button
          onClick={() => router.push("/dashboard/customers")}
          className="rounded-lg border border-slate-300 px-5 py-2 font-semibold text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
