import type { InvoicePdfData } from "./invoice-pdf";

// ---------------------------------------------------------------------------
// The two customer emails the dashboard sends from an invoice page, using
// Marcel's wording. (Payment reminders are handled by hand, on purpose.)
//
// >>> Marcel: this is the file to edit when you want to change the wording. <<<
// Each template returns a subject plus a plain-text and an HTML body. The
// plain-text version shows in email apps that block HTML — keep both in sync.
// ---------------------------------------------------------------------------

export type EmailKind = "invoice" | "thanks";

export const EMAIL_KIND_LABEL: Record<EmailKind, string> = {
  invoice: "Send invoice",
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

/** Wraps the body paragraphs in a simple branded HTML shell. */
function shell(paragraphsHtml: string): string {
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
    </div>
    <p style="font-size:11px;color:#888;text-align:center;margin-top:14px;">
      JSW Solutions LLC &middot; 1151 Bishop Rd, Saline, MI 48176
    </p>
  </div>
</body></html>`;
}

function signatureText(): string {
  return `${SIGNATURE_NAME}\n${SIGNATURE_COMPANY}`;
}

// ---------------------------------------------------------------------------
// 1. NEW INVOICE — the invoice PDF is attached
// ---------------------------------------------------------------------------
export function invoiceEmail(d: InvoicePdfData): EmailContent {
  const subject = d.po_number
    ? `Invoice from JSW Solutions — PO ${d.po_number}`
    : "Invoice from JSW Solutions";

  const text = [
    "Thank you for your business. Please see the attached invoice for your billing details.",
    "",
    "If you have any questions about this invoice, please don't hesitate to reach out.",
    "",
    "Thank you!",
    "",
    signatureText(),
  ].join("\n");

  const html = shell(`
    <p>Thank you for your business. Please see the attached invoice for your billing details.</p>
    <p>If you have any questions about this invoice, please don't hesitate to reach out.</p>
    <p>Thank you!</p>
  `);

  return { subject, text, html };
}

// ---------------------------------------------------------------------------
// 2. PAYMENT RECEIVED — sent after the invoice is marked paid (no attachment)
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
  ].join("\n");

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
    case "thanks":
      return thanksEmail(d);
  }
}

/** Which kinds carry the invoice PDF. */
export function attachesPdf(kind: EmailKind): boolean {
  return kind === "invoice";
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
