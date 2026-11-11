import { NextResponse } from "next/server";
import { listQuotes, saveQuote, type QuoteInput } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const quotes = await listQuotes(searchParams.get("q") ?? "");
  return NextResponse.json({ quotes });
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function str(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Saves a new quote from the dashboard form. */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const d = (body.data ?? {}) as Record<string, unknown>;

  const rawItems = Array.isArray(d.line_items) ? (d.line_items as Record<string, unknown>[]) : [];
  const lineItems = rawItems
    .map((o) => ({
      description: String(o.description ?? "").trim() || "ITEM",
      cost_per_hour: o.cost_per_hour == null || o.cost_per_hour === "" ? null : num(o.cost_per_hour),
      qty: o.qty == null || o.qty === "" ? null : num(o.qty),
      line_total: num(o.line_total),
    }))
    .filter((li) => (li.qty ?? 0) !== 0 || li.line_total !== 0);
  for (const li of lineItems) {
    if ((li.qty ?? 0) < 0 || (li.cost_per_hour ?? 0) < 0 || li.line_total < 0) {
      return NextResponse.json(
        { error: `The "${li.description}" line has a negative number on it.` },
        { status: 400 },
      );
    }
  }

  let total = num(d.total);
  if (!total && lineItems.length) total = lineItems.reduce((s, li) => s + li.line_total, 0);
  total = Math.round(total * 100) / 100;

  const quoteDate = str(d.quote_date);
  if (quoteDate && !ISO_DATE.test(quoteDate)) {
    return NextResponse.json({ error: "Quote date must be a real date." }, { status: 400 });
  }

  const q: QuoteInput = {
    quote_date: quoteDate,
    machine_type: str(d.machine_type),
    customer_company: str(d.customer_company),
    customer_contact: str(d.customer_contact),
    customer_address: str(d.customer_address),
    customer_city: str(d.customer_city),
    customer_state: str(d.customer_state),
    customer_zip: str(d.customer_zip),
    customer_phone: str(d.customer_phone),
    customer_email: str(d.customer_email),
    work_summary: str(d.work_summary),
    notes: str(d.notes),
    line_items: lineItems,
    total,
  };
  if (!q.customer_company) {
    return NextResponse.json({ error: "Pick or enter a company for this quote." }, { status: 400 });
  }
  try {
    const id = await saveQuote(q);
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("Save quote failed:", err);
    return NextResponse.json({ error: "Could not save the quote." }, { status: 500 });
  }
}
