import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

/**
 * Sends email through Marcel's Gmail account using an App Password.
 *
 * Vercel → Settings → Environment Variables:
 *   GMAIL_USER          = jsawsolutions@gmail.com
 *   GMAIL_APP_PASSWORD  = the 16-character app password from Google
 *
 * Lazy on purpose (like Stripe) so the rest of the site keeps working before
 * the email settings are in place — only the Send buttons need them.
 */
let _transport: Transporter | null = null;

export function getMailer(): Transporter {
  if (!_transport) {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    if (!user || !pass) {
      throw new Error(
        "Email isn't set up yet. Add GMAIL_USER and GMAIL_APP_PASSWORD in Vercel's Environment Variables.",
      );
    }
    _transport = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass },
    });
  }
  return _transport;
}

export interface OutgoingMail {
  to: string[];
  subject: string;
  text: string;
  html: string;
  attachments?: { filename: string; content: Buffer; contentType: string }[];
}

/** The friendly "From" shown in the customer's inbox. */
function fromAddress(): string {
  const user = process.env.GMAIL_USER ?? "";
  return `JSW Solutions <${user}>`;
}

export async function sendMail(mail: OutgoingMail): Promise<void> {
  const transport = getMailer();
  await transport.sendMail({
    from: fromAddress(),
    to: mail.to,
    // Replies come straight back to the Gmail inbox.
    replyTo: process.env.GMAIL_USER,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
    attachments: mail.attachments,
  });
}

/** A quick shape check so a typo never turns into a bounced invoice. */
export function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
}
