import { extractText, getDocumentProxy } from "unpdf";
import type { LineItem, ParsedInvoice } from "./types";

/** Extracts plain text from a PDF buffer using unpdf (serverless-friendly). */
export async function extractTextFromPdf(
  buffer: ArrayBuffer | Uint8Array,
): Promise<string> {
  const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const pdf = await getDocumentProxy(data);
  const result = await extractText(pdf, { mergePages: true });
  const text = Array.isArray(result.text) ? result.text.join("\n") : result.text;
  return text;
}

// ---- text helpers ---------------------------------------------------------

function clean(text: string): string {
  // Strip zero-width / non-printable characters that some PDF exporters embed.
  return text
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, " ")
    .replace(/\r/g, "\n");
}

/** Returns the slice of `text` between the first marker and the next of `ends`. */
function section(text: string, start: RegExp, ends: RegExp[]): string {
  const m = start.exec(text);
  if (!m) return "";
  const from = m.index + m[0].length;
  let to = text.length;
  for (const e of ends) {
    e.lastIndex = 0;
    const sub = text.slice(from);
    const em = e.exec(sub);
    if (em && from + em.index < to) to = from + em.index;
  }
  return text.slice(from, to).trim();
}

function firstMatch(text: string, re: RegExp): string | null {
  const m = re.exec(text);
  return m ? m[1].trim() : null;
}

function toMoney(raw: string | null | undefined): number {
  if (!raw) return 0;
  const n = Number(raw.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Converts m/d/yyyy (or m-d-yy) into an ISO yyyy-mm-dd string. */
function toIsoDate(raw: string | null): string | null {
  if (!raw) return null;
  const m = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/.exec(raw);
  if (!m) return null;
  let [, mm, dd, yy] = m;
  let year = Number(yy);
  if (year < 100) year += 2000;
  const month = String(Number(mm)).padStart(2, "0");
  const day = String(Number(dd)).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ---- the parser -----------------------------------------------------------

export function parseInvoiceText(rawText: string): ParsedInvoice {
  const text = clean(rawText);

  const po = firstMatch(text, /PO\s*#?\s*:?\s*([A-Za-z0-9][A-Za-z0-9\-\/]*)/i);
  const machine = firstMatch(text, /Machine\s*:?\s*([A-Za-z0-9][A-Za-z0-9\-#\/ ]*?)(?:\n|Date|$)/i);
  const dateRaw = firstMatch(text, /Date\s*:?\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);

  const prepared = section(
    text,
    /PREPARED\s+FOR/i,
    [/PROJECT\s*\/?\s*WORK\s+LOCATION/i, /NOTES/i, /LABOR/i],
  );
  const contact = firstMatch(
    prepared,
    /Customer\s+Name\s*:?\s*(.+?)(?:\s+Customer\s+Company|$)/im,
  );
  const company = firstMatch(
    prepared,
    /Customer\s+Company\s*:?\s*(.+?)(?:\s+Customer\s+(?:Name|Address)|$)/im,
  );

  const location = section(
    text,
    /PROJECT\s*\/?\s*WORK\s+LOCATION/i,
    [/NOTES/i, /LABOR/i, /SUMMARY/i],
  );
  const address = firstMatch(
    location,
    /Customer\s+Address\s*:?\s*(.+?)(?:\s+City\b|\s+Customer\s+Phone|$)/im,
  );
  const cityStateZip = /City\s*:?\s*([^\n]*?)\s+State\s*:?\s*([A-Za-z]{2})\s+ZIP\s*:?\s*(\d{4,5})/i.exec(
    location,
  );
  const city = cityStateZip ? cityStateZip[1].trim() : null;
  const state = cityStateZip ? cityStateZip[2].trim() : null;
  const zip = cityStateZip ? cityStateZip[3].trim() : null;
  const phone = firstMatch(location, /Customer\s+Phone\s*:?\s*([0-9()\-.\s]{7,})/i);

  let summary = section(
    text,
    /(?:SUMMARY\s+OF\s+WORK\s+PERFORMED|NOTES)/i,
    [/LABOR\s+INCLUDED/i, /Description\s+Cost/i],
  );
  summary = summary.replace(/^SUMMARY\s+OF\s+WORK\s+PERFORMED\s*/i, "").trim();

  const labor = section(
    text,
    /LABOR\s+INCLUDED/i,
    [/Please\s+make\s+checks/i, /Payment\s+required/i],
  );
  const lineItems = parseLineItems(labor);

  const totalRaw = firstMatch(text, /Total\s+Charge\s*:?\s*\$?\s*([0-9,]+\.?\d*)/i);
  let total = toMoney(totalRaw);
  if (!total && lineItems.length) {
    total = lineItems.reduce((s, li) => s + li.line_total, 0);
  }

  return {
    po_number: po,
    invoice_date: toIsoDate(dateRaw),
    machine_id: machine ? machine.replace(/\s+/g, "") : null,
    customer_company: company,
    customer_contact: contact,
    customer_address: address,
    customer_city: city,
    customer_state: state,
    customer_zip: zip,
    customer_phone: phone,
    work_summary: summary || null,
    line_items: lineItems,
    total,
  };
}

function parseLineItems(labor: string): LineItem[] {
  if (!labor) return [];
  const byLine = parseLineItemsByLine(labor);
  if (byLine.length > 0) return byLine;
  return parseLineItemsFlattened(labor);
}

function parseLineItemsByLine(labor: string): LineItem[] {
  const items: LineItem[] = [];
  const lines = labor
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let order = 0;
  for (const line of lines) {
    if (/^(description|cost\s*\/?\s*hour|qty|total)\b/i.test(line) && !/\$/.test(line)) {
      continue;
    }
    if (/total\s+charge/i.test(line)) continue;

    const full =
      /^([A-Za-z][A-Za-z &\/]+?)\s+\$?\s*([0-9,]+\.?\d*)\s+([0-9]+\.?\d*)\s+\$?\s*([0-9,]+\.?\d*)$/.exec(
        line,
      );
    if (full) {
      items.push({
        description: full[1].trim().toUpperCase(),
        cost_per_hour: toMoney(full[2]),
        qty: Number(full[3]),
        line_total: toMoney(full[4]),
        sort_order: order++,
      });
      continue;
    }

    const simple = /^([A-Za-z][A-Za-z &\/]+?)\s+\$?\s*([0-9,]+\.\d{2})$/.exec(line);
    if (simple) {
      items.push({
        description: simple[1].trim().toUpperCase(),
        cost_per_hour: null,
        qty: null,
        line_total: toMoney(simple[2]),
        sort_order: order++,
      });
    }
  }
  return items;
}

function parseLineItemsFlattened(labor: string): LineItem[] {
  const items: LineItem[] = [];
  const flat = labor.replace(/\s+/g, " ").trim();
  const re = /([A-Z][A-Za-z]{2,20})\s+\$\s*([0-9,]+\.?\d*)\s+([0-9]+\.?\d*)\s+\$\s*([0-9,]+\.?\d*)/g;
  let m: RegExpExecArray | null;
  let order = 0;
  while ((m = re.exec(flat)) !== null) {
    if (/^total$/i.test(m[1])) continue;
    items.push({
      description: m[1].trim().toUpperCase(),
      cost_per_hour: toMoney(m[2]),
      qty: Number(m[3]),
      line_total: toMoney(m[4]),
      sort_order: order++,
    });
  }
  return items;
}

export async function parseInvoicePdf(
  buffer: ArrayBuffer | Uint8Array,
): Promise<{ parsed: ParsedInvoice; rawText: string }> {
  const rawText = await extractTextFromPdf(buffer);
  return { parsed: parseInvoiceText(rawText), rawText };
}
