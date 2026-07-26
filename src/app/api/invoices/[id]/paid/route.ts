import { NextResponse } from "next/server";
import { setInvoicePaid } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Bad id" }, { status: 400 });
  }
  let paid = true;
  let paidDate: string | null = null;
  let checkNumber: string | null = null;
  try {
    const body = await req.json();
    paid = body?.paid !== false; // default to marking paid
    if (typeof body?.paid_date === "string") paidDate = body.paid_date;
    if (typeof body?.check_number === "string") checkNumber = body.check_number;
  } catch {
    // no body → mark paid, dated today
  }
  if (paidDate && !/^\d{4}-\d{2}-\d{2}$/.test(paidDate.trim())) {
    return NextResponse.json({ error: "Payment date must be a real date." }, { status: 400 });
  }
  try {
    await setInvoicePaid(id, paid, { paid_date: paidDate, check_number: checkNumber });
    return NextResponse.json({ ok: true, paid });
  } catch (err) {
    console.error("Mark paid failed:", err);
    return NextResponse.json({ error: "Could not update invoice." }, { status: 500 });
  }
}
