import type { InvoicePdfData } from "./invoice-pdf";
import { CARD_FEE_PERCENT, PAY_URL } from "./fees";

// ---------------------------------------------------------------------------
// The customer emails the dashboard sends from an invoice page, using
// Marcel's wording.
//
// >>> Marcel: this is the file to edit when you want to change the wording. <<<
// Each template returns a subject plus a plain-text and an HTML body. The
// plain-text version shows in email apps that block HTML — keep both in sync.
// ---------------------------------------------------------------------------

export type EmailKind = "invoice" | "reminder" | "thanks";

export const EMAIL_KIND_LABEL: Record<EmailKind, string> = {
  invoice: "Send invoice",
  reminder: "Payment reminder",
  thanks: "Payment received",
};

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

const SIGNATURE_NAME = "Marcel Couturier";
const SIGNATURE_COMPANY = "JSW Solutions";

function money(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** "2026-08-17" → "August 17, 2026" (pure string math, no timezone drift). */
function longDate(iso: string | null): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const AUTOMATED_NOTE =
  "This is an automated message sent from the JSW Solutions billing system. Replies are read — they go straight to jsawsolutions@gmail.com.";

/**
 * Wraps the body paragraphs in a simple branded HTML shell. `footnoteHtml`
 * is optional small print placed after the signature — for things worth
 * mentioning but not leading with.
 */
function shell(paragraphsHtml: string, footnoteHtml = ""): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f1e8;font-family:Arial,Helvetica,sans-serif;color:#1c1c1c;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    <div style="background:#3f6021;color:#fff;padding:14px 20px;border-radius:10px 10px 0 0;">
      <div style="font-size:18px;font-weight:bold;letter-spacing:.5px;">JSW SOLUTIONS</div>
      <div style="font-size:12px;color:#e8ddc1;">Industrial Laser &amp; CNC Maintenance</div>
    </div>
    <div style="background:#fff;padding:22px 20px;border:1px solid #ddd0ac;border-top:0;border-radius:0 0 10px 10px;font-size:15px;line-height:1.55;">
      ${paragraphsHtml}
      <p style="margin:22px 0 0;">
        ${esc(SIGNATURE_NAME)}<br>
        <span style="color:#555;">${esc(SIGNATURE_COMPANY)}</span>
      </p>
      ${footnoteHtml ? `<p style="margin:18px 0 0;padding-top:12px;border-top:1px solid #eee;font-size:12px;color:#777;">${footnoteHtml}</p>` : ""}
    </div>
    <p style="font-size:11px;color:#888;text-align:center;margin-top:14px;">
      JSW Solutions LLC &middot; 1151 Bishop Rd, Saline, MI 48176<br>
      ${esc(AUTOMATED_NOTE)}
    </p>
  </div>
</body></html>`;
}

function signatureText(): string {
  return `${SIGNATURE_NAME}\n${SIGNATURE_COMPANY}`;
}

/** Trailing lines for the plain-text version: optional footnote, then the automated notice. */
function textTail(footnote = ""): string {
  const parts: string[] = [""];
  if (footnote) parts.push("", footnote);
  parts.push("", "--", AUTOMATED_NOTE);
  return parts.join("\n");
}

/** Low-key end note for the invoice email — checks are the preferred method. */
function cardFootnoteText(): string {
  return (
    `Payment by check is preferred. If paying by card is easier for your team, it's available at ${PAY_URL} ` +
    `(enter your PO number and ZIP code; a ${CARD_FEE_PERCENT} credit card fee applies).`
  );
}

function cardFootnoteHtml(): string {
  return (
    `Payment by check is preferred. If paying by card is easier for your team, it's available at ` +
    `<a href="${PAY_URL}" style="color:#777;">${PAY_URL}</a> (enter your PO number and ZIP code; a ${CARD_FEE_PERCENT} credit card fee applies).`
  );
}

/** The "you can pay by card" line, used by the reminder email. */
function payByCardText(): string {
  return (
    `You can also pay by credit card at ${PAY_URL} — just enter your PO number and ZIP code. ` +
    `A ${CARD_FEE_PERCENT} credit card fee is added to card payments; checks have no fee.`
  );
}

function payByCardHtml(): string {
  return `<p>You can also pay by credit card at <a href="${PAY_URL}" style="color:#df6f1e;">${PAY_URL}</a> — just enter your PO number and ZIP code. A ${CARD_FEE_PERCENT} credit card fee is added to card payments; checks have no fee.</p>`;
}

// ---------------------------------------------------------------------------
// 1. NEW INVOICE — the invoice PDF is attached
// ---------------------------------------------------------------------------
export function invoiceEmail(d: InvoicePdfData): EmailContent {
  const subject = d.po_number
    ? `Invoice from JSW Solutions — PO ${d.po_number}`
    : "Invoice from JSW Solutions";

  const text =
    [
      "Thank you for your business. Please see the attached invoice for your billing details.",
      "",
      "If you have any questions about this invoice, please don't hesitate to reach out.",
      "",
      "Thank you!",
      "",
      signatureText(),
    ].join("\n") + textTail(cardFootnoteText());

  const html = shell(
    `
    <p>Thank you for your business. Please see the attached invoice for your billing details.</p>
    <p>If you have any questions about this invoice, please don't hesitate to reach out.</p>
    <p>Thank you!</p>
  `,
    cardFootnoteHtml(),
  );

  return { subject, text, html };
}

// ---------------------------------------------------------------------------
// 2. PAYMENT REMINDER — the invoice PDF is attached again
// ---------------------------------------------------------------------------
export function reminderEmail(d: InvoicePdfData): EmailContent {
  const invoiceNo = d.po_number ?? "";
  const amount = money(d.total);
  const subject = d.po_number
    ? `Payment reminder — invoice ${d.po_number} — JSW Solutions`
    : "Payment reminder — JSW Solutions";

  const text = [
    `This is a friendly reminder that invoice ${invoiceNo} in the amount of ${amount} is still outstanding. A copy is attached for your convenience.`,
    "",
    payByCardText(),
    "",
    "If payment has already been sent, please disregard this message — and thank you. If you have any questions about this invoice, please don't hesitate to reach out.",
    "",
    "Thank you!",
    "",
    signatureText(),
  ].join("\n") + textTail();

  const html = shell(`
    <p>This is a friendly reminder that invoice <b>${esc(invoiceNo)}</b> in the amount of <b>${esc(amount)}</b> is still outstanding. A copy is attached for your convenience.</p>
    ${payByCardHtml()}
    <p>If payment has already been sent, please disregard this message — and thank you. If you have any questions about this invoice, please don't hesitate to reach out.</p>
    <p>Thank you!</p>
  `);

  return { subject, text, html };
}

// ---------------------------------------------------------------------------
// 3. PAYMENT RECEIVED — sent after the invoice is marked paid (no attachment)
// ---------------------------------------------------------------------------
export function thanksEmail(d: InvoicePdfData): EmailContent {
  const subject = d.po_number
    ? `Payment received — PO ${d.po_number} — JSW Solutions`
    : "Payment received — JSW Solutions";
  const date = longDate(d.paid_date) || "today";
  const invoiceNo = d.po_number ?? "";
  const amount = money(d.total);

  const text = [
    `Thank you for your payment received on ${date}. We've confirmed receipt of your payment for invoice ${invoiceNo} in the amount of ${amount}.`,
    "",
    "We appreciate your prompt payment. Thank you for your business!",
    "",
    signatureText(),
  ].join("\n") + textTail();

  const html = shell(`
    <p>Thank you for your payment received on <b>${esc(date)}</b>. We've confirmed receipt of your payment for invoice <b>${esc(invoiceNo)}</b> in the amount of <b>${esc(amount)}</b>.</p>
    <p>We appreciate your prompt payment. Thank you for your business!</p>
  `);

  return { subject, text, html };
}

export function buildEmail(kind: EmailKind, d: InvoicePdfData): EmailContent {
  switch (kind) {
    case "invoice":
      return invoiceEmail(d);
    case "reminder":
      return reminderEmail(d);
    case "thanks":
      return thanksEmail(d);
  }
}

/** Which kinds carry the invoice PDF. */
export function attachesPdf(kind: EmailKind): boolean {
  return kind === "invoice" || kind === "reminder";
}

/**
 * Customers often have several people who need the invoice. Addresses are
 * stored as one comma-separated string; this splits and tidies it.
 */
export function splitAddresses(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  );
}
