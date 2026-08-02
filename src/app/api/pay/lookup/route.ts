import { NextResponse } from "next/server";
import { findPayableInvoices } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public endpoint (no dashboard login) behind the /pay page. A customer
 * supplies their PO number and ZIP code; we return any unpaid invoice(s)
 * that match both, so they can pick which one to pay.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const po = String(body.po_number ?? "").trim();
  const zip = String(body.zip ?? "").trim();
  if (!po || !zip) {
    return NextResponse.json(
      { error: "Enter both your PO number and ZIP code." },
      { status: 400 },
    );
  }

  try {
    const invoices = await findPayableInvoices(po, zip);
    if (invoices.length === 0) {
      return NextResponse.json(
        {
          error:
            "We couldn't find an unpaid invoice with that PO number and ZIP code. Double-check both, or contact us directly.",
        },
        { status: 404 },
      );
    }
    return NextResponse.json({ invoices });
  } catch (err) {
    console.error("Invoice lookup failed:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
