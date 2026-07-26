import { NextResponse } from "next/server";
import { setCustomerRate, sql, initSchema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Looks up one customer's mileage rate. The new-invoice form uses this to spot a
 * company it has never seen before, so it can ask for a rate before saving.
 */
export async function GET(req: Request) {
  const company = (new URL(req.url).searchParams.get("company") || "").trim();
  if (!company) {
    return NextResponse.json({ known: false, mileage_rate: null });
  }
  try {
    await initSchema();
    const r = await sql`
      SELECT mileage_rate FROM customers WHERE lower(company) = lower(${company}) LIMIT 1;
    `;
    if (r.rows.length === 0) {
      return NextResponse.json({ known: false, mileage_rate: null });
    }
    const raw = r.rows[0].mileage_rate;
    return NextResponse.json({
      known: true,
      mileage_rate: raw == null ? null : Number(raw),
    });
  } catch (err) {
    console.error("Rate lookup failed:", err);
    return NextResponse.json({ error: "Could not check the customer." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const company = ((body.company as string) || "").trim();
  if (!company) {
    return NextResponse.json({ error: "Missing customer." }, { status: 400 });
  }

  // An empty / null rate clears it (stops auto-logging for that customer).
  let rate: number | null = null;
  if (body.mileage_rate !== null && body.mileage_rate !== "" && body.mileage_rate !== undefined) {
    const n = Number(body.mileage_rate);
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json({ error: "Rate must be a positive number." }, { status: 400 });
    }
    rate = n;
  }

  try {
    await setCustomerRate(company, rate);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Set mileage rate failed:", err);
    return NextResponse.json({ error: "Could not save the rate." }, { status: 500 });
  }
}
