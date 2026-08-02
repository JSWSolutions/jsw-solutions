import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { markInvoicePaidFromStripe } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe calls this the instant a checkout session finishes — not just when
 * the customer's browser makes it back to our success page. That's what
 * makes payment confirmation reliable even if they close the tab right after
 * paying. Configure this URL (https://<your domain>/api/stripe/webhook) in
 * the Stripe dashboard, listening for "checkout.session.completed".
 */
export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    console.error("Stripe webhook received but STRIPE_WEBHOOK_SECRET is not set.");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 400 });
  }

  // Signature verification needs the exact raw bytes Stripe signed — do not
  // parse this as JSON first.
  const rawBody = await req.text();

  let event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.error("Stripe webhook signature check failed:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      id: string;
      metadata?: Record<string, string> | null;
      payment_status?: string;
    };
    const invoiceId = Number(session.metadata?.invoice_id);
    if (Number.isFinite(invoiceId) && session.payment_status === "paid") {
      try {
        await markInvoicePaidFromStripe(invoiceId, session.id);
      } catch (err) {
        console.error("Failed to mark invoice paid from Stripe webhook:", err);
        // 500 so Stripe retries — we'd rather get a duplicate (idempotent)
        // callback later than silently miss a payment.
        return NextResponse.json({ error: "Could not update invoice." }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
