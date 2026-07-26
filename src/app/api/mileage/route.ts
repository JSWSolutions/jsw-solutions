import { NextResponse } from "next/server";
import { addManualMileage } from "@/lib/db";

export const runtime = "nodejs";

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const miles = num(body.miles);
  if (!miles) {
    return NextResponse.json({ error: "Please enter the miles." }, { status: 400 });
  }

  try {
    const id = await addManualMileage({
      entry_date: (body.entry_date as string) || null,
      customer_name: (body.customer_name as string) || null,
      miles,
      reason: (body.reason as string) || "SERVICE",
    });
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("Add mileage failed:", err);
    return NextResponse.json({ error: "Could not save mileage entry." }, { status: 500 });
  }
}
