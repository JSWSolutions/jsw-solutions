/**
 * Credit card fee — one place for the number so the invoice PDF, the Pay
 * page, the Stripe charge, and the emails all agree.
 *
 * Stripe keeps roughly 3% of every card payment; this passes that cost to
 * the customer who chooses to pay by card instead of check.
 */
export const CARD_FEE_RATE = 0.03;
export const CARD_FEE_PERCENT = "3%";
export const PAY_URL = "https://www.jswsolutions.org/pay";

/** Rounded to the cent, the way it will appear on the Stripe receipt. */
export function cardFee(total: number): number {
  return Math.round(total * CARD_FEE_RATE * 100) / 100;
}

export function cardTotal(total: number): number {
  return Math.round((total + cardFee(total)) * 100) / 100;
}

/** The sentence used wherever the fee is explained to a customer. */
export const CARD_FEE_NOTE = `A ${CARD_FEE_PERCENT} credit card fee is added to card payments.`;
