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
