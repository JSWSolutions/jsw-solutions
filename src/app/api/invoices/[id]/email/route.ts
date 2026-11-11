import { NextResponse } from "next/server";
import { getInvoiceForPdf, getInvoiceById } from "@/lib/queries";
import { buildInvoicePdf, invoicePdfFilename } from "@/lib/invoice-pdf";
import { buildEmailFor, attachesPdf, splitAddresses, type EmailKind } from "@/lib/email-templates";
import { sendMail, looksLikeEmail } from "@/lib/mailer";
import { logEmail, setCustomerEmail } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // several PDFs + an SMTP round-trip

const KINDS: EmailKind[] = ["invoice", "reminder", "thanks"];
const MAX_BUNDLE = 10;

/**
 * POST /api/invoices/123/email
 * body: {
 *   kind: "invoice" | "reminder" | "thanks",
 *   to: string,                 // one or more addresses, comma-separated
 *   save_email: boolean,
 *   also: number[]              // optional: other invoice ids to bundle in
 * }
 *
 * Invoice 123 is always included. With `also`, the invoice and reminder kinds
 * become ONE email listing every invoice, with every PDF attached. All bundled
 * invoices must belong to the same customer and be unpaid. Each invoice gets
 * its own line in the send history.
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

  // The set of invoices going out: this one first, then any extras.
  const extra = Array.isArray(body.also)
    ? Array.from(new Set((body.also as unknown[]).map(Number).filter((n) => Number.isFinite(n) && n !== id)))
    : [];
  if (kind === "thanks" && extra.length) {
    return NextResponse.json(
      { error: "Payment-received emails go out one invoice at a time." },
      { status: 400 },
    );
  }
  const ids = [id, ...extra];
  if (ids.length > MAX_BUNDLE) {
    return NextResponse.json(
      { error: `You can bundle up to ${MAX_BUNDLE} invoices in one email.` },
      { status: 400 },
    );
  }

  const loaded = await Promise.all(
    ids.map(async (invId) => ({
      id: invId,
      data: await getInvoiceForPdf(invId),
      inv: await getInvoiceById(invId),
    })),
  );
  const missing = loaded.find((x) => !x.data || !x.inv);
  if (missing) {
    return NextResponse.json({ error: `Invoice #${missing.id} not found.` }, { status: 404 });
  }
  const list = loaded.map((x) => x.data!);
  const invs = loaded.map((x) => x.inv!);

  // Guards: right button for the state, and bundles stay within one customer.
  if (kind === "thanks" && !list[0].paid) {
    return NextResponse.json(
      { error: "This invoice isn't marked paid yet — mark it paid first, then send the thank-you." },
      { status: 400 },
    );
  }
  if (kind !== "thanks") {
    const paidOne = list.find((d) => d.paid);
    if (paidOne) {
      return NextResponse.json(
        { error: `Invoice ${paidOne.po_number ?? ""} is already paid — take it out of the bundle.` },
        { status: 400 },
      );
    }
  }
  const customerIds = new Set(invs.map((i) => i.customer_id));
  if (customerIds.size > 1) {
    return NextResponse.json(
      { error: "All invoices in one email must belong to the same customer." },
      { status: 400 },
    );
  }

  const content = buildEmailFor(kind, list);
  const attachments = attachesPdf(kind)
    ? await Promise.all(
        list.map(async (d) => ({
          filename: invoicePdfFilename(d, false),
          content: Buffer.from(await buildInvoicePdf(d, { paidStamp: false })),
          contentType: "application/pdf",
        })),
      )
    : undefined;

  try {
    await sendMail({ to: recipients, subject: content.subject, text: content.text, html: content.html, attachments });
  } catch (err) {
    console.error("Send email failed:", err);
    const msg = err instanceof Error ? err.message : "Could not send the email.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // One history line per invoice, so each page shows what went out.
  const note = list.length > 1 ? ` (bundle of ${list.length})` : "";
  for (const invId of ids) {
    await logEmail({ invoice_id: invId, kind, to_address: toList, subject: content.subject + note });
  }
  const customerId = invs[0].customer_id;
  if (body.save_email === true && customerId != null) {
    await setCustomerEmail(customerId, toList);
  }

  return NextResponse.json({ ok: true, subject: content.subject, count: list.length });
}
