import { NextResponse } from "next/server";
import { setCustomerRate } from "@/lib/db";

export const runtime = "nodejs";

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
