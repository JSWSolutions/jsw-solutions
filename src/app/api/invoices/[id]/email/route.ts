import { NextResponse } from "next/server";
import { getInvoiceForPdf, getInvoiceById } from "@/lib/queries";
import { buildInvoicePdf, invoicePdfFilename } from "@/lib/invoice-pdf";
import { buildEmail, attachesPdf, splitAddresses, type EmailKind } from "@/lib/email-templates";
import { sendMail, looksLikeEmail } from "@/lib/mailer";
import { logEmail, setCustomerEmail } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS: EmailKind[] = ["invoice", "thanks"];

/**
 * POST /api/invoices/123/email
 * body: { kind: "invoice" | "thanks", to: string, save_email: boolean }
 *
 * `to` may hold several addresses separated by commas — most customers have
 * two or three people who need the invoice. Sends the chosen email (attaching
 * the invoice PDF for the invoice kind), logs it on the invoice, and optionally
 * saves the address list to the customer for next time.
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Bad invoice id" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const kind = String(body.kind ?? "") as EmailKind;
  if (!KINDS.includes(kind)) {
    return NextResponse.json({ error: "Unknown email type." }, { status: 400 });
  }
  const recipients = splitAddresses(String(body.to ?? ""));
  if (recipients.length === 0) {
    return NextResponse.json({ error: "Enter at least one email address." }, { status: 400 });
  }
  const bad = recipients.find((r) => !looksLikeEmail(r));
  if (bad) {
    return NextResponse.json(
      { error: `"${bad}" doesn't look like a valid email address.` },
      { status: 400 },
    );
  }
  const toList = recipients.join(", ");

  const [data, inv] = await Promise.all([getInvoiceForPdf(id), getInvoiceById(id)]);
  if (!data || !inv) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // Guard against the wrong button for the invoice's state.
  if (kind === "thanks" && !data.paid) {
    return NextResponse.json(
      { error: "This invoice isn't marked paid yet — mark it paid first, then send the thank-you." },
      { status: 400 },
    );
  }

  const content = buildEmail(kind, data);
  const attachments = attachesPdf(kind)
    ? [
        {
          filename: invoicePdfFilename(data, false),
          content: Buffer.from(await buildInvoicePdf(data, { paidStamp: false })),
          contentType: "application/pdf",
        },
      ]
    : undefined;

  try {
    await sendMail({ to: recipients, subject: content.subject, text: content.text, html: content.html, attachments });
  } catch (err) {
    console.error("Send email failed:", err);
    const msg = err instanceof Error ? err.message : "Could not send the email.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  await logEmail({ invoice_id: id, kind, to_address: toList, subject: content.subject });
  if (body.save_email === true && inv.customer_id != null) {
    await setCustomerEmail(inv.customer_id, toList);
  }

  return NextResponse.json({ ok: true, subject: content.subject });
}
