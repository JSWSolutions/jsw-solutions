import { NextResponse } from "next/server";
import { saveInvoice } from "@/lib/db";
import { getInvoices } from "@/lib/queries";
import type { ParsedInvoice, LineItem } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const invoices = await getInvoices({ search: q, limit: 500 });
  return NextResponse.json({ invoices });
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Up to 5 individual visit dates, cleaned, de-duplicated and put in order. */
function normalizeDates(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const clean = raw
    .map((d) => String(d ?? "").trim())
    .filter((d) => ISO_DATE.test(d));
  return Array.from(new Set(clean)).sort().slice(0, 5);
}

function normalizeLineItems(raw: unknown): LineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((li, i): LineItem => {
      const o = li as Record<string, unknown>;
      return {
        description: String(o.description ?? "").trim() || "ITEM",
        cost_per_hour:
          o.cost_per_hour == null || o.cost_per_hour === ""
            ? null
            : num(o.cost_per_hour),
        qty: o.qty == null || o.qty === "" ? null : num(o.qty),
        line_total: num(o.line_total),
        sort_order: i,
      };
    })
    .filter((li) => li.description || li.line_total);
}

/** How many calendar days the invoice covers (for the hours sanity cap). */
function workedDayCount(serviceDates: string[], start: string | null, end: string | null): number {
  if (serviceDates.length) return serviceDates.length;
  if (start && end) {
    const a = new Date(`${start}T00:00:00`).getTime();
    const b = new Date(`${end}T00:00:00`).getTime();
    const days = Math.round((b - a) / 86400000) + 1;
    if (Number.isFinite(days) && days > 1) return Math.min(days, 31);
  }
  return 1;
}

/**
 * Guards against data-entry and parsing accidents ever reaching the database
 * again (like 5.75 hours being saved as 575). Returns an error message, or
 * null when the line items look sane.
 */
function lineItemProblem(lineItems: LineItem[], days: number): string | null {
  const maxHours = 24 * days;
  for (const li of lineItems) {
    if ((li.qty ?? 0) < 0 || (li.cost_per_hour ?? 0) < 0 || li.line_total < 0) {
      return `The "${li.description}" line has a negative number on it — please double-check it.`;
    }
    // Qty means hours only on lines that carry an hourly rate.
    if (li.cost_per_hour == null || li.qty == null) continue;
    if (li.qty > maxHours) {
      return (
        `The "${li.description}" line says ${li.qty} hours, but this invoice only covers ` +
        `${days} day${days === 1 ? "" : "s"} (${maxHours} hours at most). ` +
        `If you meant a decimal — 5.75, not 575 — fix the Qty and save again.`
      );
    }
    // Rate × Qty should land near the line total. We only flag wild mismatches,
    // so small rounding or adjustments never get in the way.
    if (li.qty > 0 && li.cost_per_hour > 0 && li.line_total > 0) {
      const expected = li.cost_per_hour * li.qty;
      const diff = Math.abs(expected - li.line_total);
      if (diff > Math.max(50, expected * 0.25)) {
        return (
          `On the "${li.description}" line, $${li.cost_per_hour} × ${li.qty} comes to ` +
          `$${expected.toFixed(2)}, but the line total says $${li.line_total.toFixed(2)}. ` +
          `One of those numbers is off — please double-check them.`
        );
      }
    }
  }
  return null;
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const d = (body.data ?? {}) as Record<string, unknown>;
  const lineItems = normalizeLineItems(d.line_items);
  const serviceDates = normalizeDates(d.service_dates);

  let total = num(d.total);
  if (!total && lineItems.length) {
    total = lineItems.reduce((s, li) => s + li.line_total, 0);
  }

  const data: ParsedInvoice = {
    po_number: (d.po_number as string) || null,
    // The earliest chosen date is the one every list and sort uses.
    invoice_date: serviceDates[0] ?? ((d.invoice_date as string) || null),
    invoice_date_end: serviceDates.length ? null : (d.invoice_date_end as string) || null,
    service_dates: serviceDates.length ? serviceDates : null,
    machine_id: (d.machine_id as string) || null,
    customer_company: (d.customer_company as string) || null,
    customer_contact: (d.customer_contact as string) || null,
    customer_address: (d.customer_address as string) || null,
    customer_city: (d.customer_city as string) || null,
    customer_state: (d.customer_state as string) || null,
    customer_zip: (d.customer_zip as string) || null,
    customer_phone: (d.customer_phone as string) || null,
    work_summary: (d.work_summary as string) || null,
    line_items: lineItems,
    total,
  };

  if (!data.customer_company && !data.machine_id && !data.total) {
    return NextResponse.json(
      { error: "Please provide at least a customer, machine, or amount." },
      { status: 400 },
    );
  }

  const days = workedDayCount(
    serviceDates,
    data.invoice_date,
    data.invoice_date_end,
  );
  const problem = lineItemProblem(lineItems, days);
  if (problem) {
    return NextResponse.json({ error: problem }, { status: 400 });
  }

  const paidDate = String(body.paid_date ?? "").trim();
  if (paidDate && !ISO_DATE.test(paidDate)) {
    return NextResponse.json(
      { error: "Payment date must be a real date." },
      { status: 400 },
    );
  }

  try {
    const pdfUrl = (body.pdfUrl as string) || null;
    const paid = body.paid === true; // new invoices default to Unpaid
    const id = await saveInvoice(data, pdfUrl, {
      paid,
      paid_date: paidDate || null,
      check_number: String(body.check_number ?? "").trim() || null,
    });
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("Save invoice failed:", err);
    return NextResponse.json(
      { error: "Could not save the invoice. Check the database connection." },
      { status: 500 },
    );
  }
}
