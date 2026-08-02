import Stripe from "stripe";

// Constructed lazily so the app can still build/run without Stripe configured
// (e.g. before Marcel has created a Stripe account) — it only throws once
// someone actually tries to use it.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error(
        "STRIPE_SECRET_KEY is not set. Add it in Vercel's Environment Variables once your Stripe account is ready.",
      );
    }
    _stripe = new Stripe(key);
  }
  return _stripe;
}
