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
  try {
    const body = await req.json();
    paid = body?.paid !== false; // default to marking paid
  } catch {
    // no body → mark paid
  }
  try {
    await setInvoicePaid(id, paid);
    return NextResponse.json({ ok: true, paid });
  } catch (err) {
    console.error("Mark paid failed:", err);
    return NextResponse.json({ error: "Could not update invoice." }, { status: 500 });
  }
}
