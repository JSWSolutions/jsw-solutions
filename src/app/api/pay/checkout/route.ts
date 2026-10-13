import { NextResponse } from "next/server";
import { getPayableInvoice } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { cardFee, CARD_FEE_PERCENT } from "@/lib/fees";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public endpoint behind the /pay page. Re-checks the PO + ZIP match on the
 * server (never trust a client-supplied invoice id alone) before creating a
 * Stripe Checkout session for the invoice total PLUS the credit card fee
 * (shown as its own line on the Stripe receipt), then hands back the URL to
 * redirect the customer's browser to.
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const invoiceId = Number(body.invoice_id);
  const po = String(body.po_number ?? "").trim();
  const zip = String(body.zip ?? "").trim();
  if (!Number.isFinite(invoiceId) || !po || !zip) {
    return NextResponse.json(
      { error: "Missing invoice, PO number, or ZIP." },
      { status: 400 },
    );
  }

  let invoice;
  try {
    invoice = await getPayableInvoice(invoiceId, po, zip);
  } catch (err) {
    console.error("Invoice re-check failed:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
  if (!invoice) {
    return NextResponse.json(
      { error: "We couldn't match that invoice. Please check your PO number and ZIP code." },
      { status: 404 },
    );
  }
  if (!(invoice.total > 0)) {
    return NextResponse.json({ error: "This invoice has no balance due." }, { status: 400 });
  }

  const origin = new URL(req.url).origin;
  const fee = cardFee(invoice.total);
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: Math.round(invoice.total * 100),
            product_data: {
              name: `JSW Solutions Invoice${invoice.po_number ? ` — PO ${invoice.po_number}` : ""}`,
              description: invoice.company,
            },
          },
          quantity: 1,
        },
        {
          price_data: {
            currency: "usd",
            unit_amount: Math.round(fee * 100),
            product_data: {
              name: `Credit card fee (${CARD_FEE_PERCENT})`,
              description: "Covers the card processing cost",
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        invoice_id: String(invoice.id),
        po_number: po,
        invoice_total: invoice.total.toFixed(2),
        card_fee: fee.toFixed(2),
      },
      success_url: `${origin}/pay/success?invoice=${invoice.id}`,
      cancel_url: `${origin}/pay?canceled=1`,
    });
    if (!session.url) {
      return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 500 });
    }
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout session failed:", err);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again or contact us directly." },
      { status: 500 },
    );
  }
}
