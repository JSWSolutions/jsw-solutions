import { NextResponse } from "next/server";
import { getQuoteForPdf, logEmail, setCustomerEmail } from "@/lib/db";
import { buildInvoicePdf, quotePdfFilename } from "@/lib/invoice-pdf";
import { quoteEmail, splitAddresses } from "@/lib/email-templates";
import { sendMail, looksLikeEmail } from "@/lib/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/quotes/12/email  body: { to, save_email } — emails the quote with its PDF attached. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Bad quote id" }, { status: 400 });
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const recipients = splitAddresses(String(body.to ?? ""));
  if (recipients.length === 0) {
    return NextResponse.json({ error: "Enter at least one email address." }, { status: 400 });
  }
  const bad = recipients.find((r) => !looksLikeEmail(r));
  if (bad) {
    return NextResponse.json({ error: `"${bad}" doesn't look like a valid email address.` }, { status: 400 });
  }
  const q = await getQuoteForPdf(id);
  if (!q) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

  const content = quoteEmail(q.pdf);
  const attachments = [
    {
      filename: quotePdfFilename(q.pdf),
      content: Buffer.from(await buildInvoicePdf(q.pdf, { kind: "quote" })),
      contentType: "application/pdf",
    },
  ];
  try {
    await sendMail({ to: recipients, subject: content.subject, text: content.text, html: content.html, attachments });
  } catch (err) {
    console.error("Send quote failed:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not send." }, { status: 500 });
  }
  const toList = recipients.join(", ");
  await logEmail({ quote_id: id, kind: "quote", to_address: toList, subject: content.subject });
  if (body.save_email === true && q.customer_id != null) await setCustomerEmail(q.customer_id, toList);
  return NextResponse.json({ ok: true, subject: content.subject });
}
