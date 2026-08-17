import {
  PDFDocument,
  PDFFont,
  PDFPage,
  StandardFonts,
  degrees,
  rgb,
} from "pdf-lib";
import { LOGO_PNG_BASE64 } from "./logo-data";

// ---------------------------------------------------------------------------
// Recreates the JSW Solutions "Service Invoice" Word template as a PDF,
// filled in from what's stored in the database. Colors and layout are matched
// to the template Marcel provided (green #3f6021, gold #b9a417, sand #eee8d6).
// ---------------------------------------------------------------------------

export interface InvoicePdfData {
  po_number: string | null;
  machine_label: string | null;
  dates: string[]; // ISO yyyy-mm-dd, already sorted
  customer_company: string | null;
  customer_contact: string | null;
  customer_address: string | null;
  customer_city: string | null;
  customer_state: string | null;
  customer_zip: string | null;
  customer_phone: string | null;
  work_summary: string | null;
  notes: string | null;
  line_items: {
    description: string;
    cost_per_hour: number | null;
    qty: number | null;
    line_total: number;
  }[];
  total: number;
  paid: boolean;
  paid_date: string | null; // ISO
  check_number: string | null;
  payment_method: string | null; // "card" for Stripe payments
}

const GREEN = rgb(0x3f / 255, 0x60 / 255, 0x21 / 255);
const GREEN_DARK = rgb(0x2c / 255, 0x45 / 255, 0x1a / 255);
const GOLD = rgb(0xb9 / 255, 0xa4 / 255, 0x17 / 255);
const SAND = rgb(0xee / 255, 0xe8 / 255, 0xd6 / 255);
const INK = rgb(0.11, 0.11, 0.11);
const GRAY = rgb(0.45, 0.45, 0.45);
const BORDER = rgb(0.65, 0.65, 0.65);
const WHITE = rgb(1, 1, 1);

const PAGE_W = 612; // US Letter
const PAGE_H = 792;
const MARGIN = 46;
const CONTENT_W = PAGE_W - MARGIN * 2;

function money(n: number | null): string {
  if (n == null) return "";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** "2026-08-17" → "8/17/2026" (no timezone surprises — pure string math). */
function usDate(iso: string | null): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${Number(m[2])}/${Number(m[3])}/${m[1]}`;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const words = rawLine.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      out.push("");
      continue;
    }
    let line = "";
    for (const w of words) {
      const attempt = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(attempt, size) <= maxWidth) {
        line = attempt;
      } else {
        if (line) out.push(line);
        line = w;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

export async function buildInvoicePdf(
  data: InvoicePdfData,
  opts: { paidStamp?: boolean } = {},
): Promise<Uint8Array> {
  const showPaid = Boolean(opts.paidStamp && data.paid);

  const doc = await PDFDocument.create();
  const page = doc.addPage([PAGE_W, PAGE_H]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);

  const logoBytes = Uint8Array.from(atob(LOGO_PNG_BASE64), (c) => c.charCodeAt(0));
  const logo = await doc.embedPng(logoBytes);

  // --- helpers ---------------------------------------------------------------
  let y = PAGE_H - 40; // cursor from the top

  function text(
    s: string,
    x: number,
    yy: number,
    f: PDFFont,
    size: number,
    color = INK,
  ) {
    page.drawText(s, { x, y: yy, font: f, size, color });
  }
  function rightText(s: string, xRight: number, yy: number, f: PDFFont, size: number, color = INK) {
    text(s, xRight - f.widthOfTextAtSize(s, size), yy, f, size, color);
  }
  function centerText(s: string, cx: number, yy: number, f: PDFFont, size: number, color = INK) {
    text(s, cx - f.widthOfTextAtSize(s, size) / 2, yy, f, size, color);
  }
  function cell(
    x: number,
    yTop: number,
    w: number,
    h: number,
    fill: ReturnType<typeof rgb> | null,
  ) {
    page.drawRectangle({
      x,
      y: yTop - h,
      width: w,
      height: h,
      color: fill ?? undefined,
      borderColor: BORDER,
      borderWidth: 0.6,
    });
  }

  /** A "label | value" row like the template's PO # / Machine / Date rows. */
  function labelRow(label: string, value: string, labelW: number, rowH = 19) {
    cell(MARGIN, y, labelW, rowH, SAND);
    cell(MARGIN + labelW, y, CONTENT_W - labelW, rowH, null);
    text(label, MARGIN + 6, y - rowH + 6, bold, 8.5, INK);
    text(value, MARGIN + labelW + 6, y - rowH + 6, font, 9, INK);
    y -= rowH;
  }

  /** Green section heading with the thin gold underline. */
  function sectionHeading(label: string) {
    y -= 14;
    text(label, MARGIN + 4, y, bold, 10, GREEN);
    page.drawLine({
      start: { x: MARGIN, y: y - 4 },
      end: { x: MARGIN + CONTENT_W, y: y - 4 },
      thickness: 1,
      color: GOLD,
    });
    y -= 10;
  }

  // --- header ----------------------------------------------------------------
  const logoH = 88;
  const logoW = (logo.width / logo.height) * logoH;
  page.drawImage(logo, { x: MARGIN + 4, y: y - logoH, width: logoW, height: logoH });

  const hx = MARGIN + 260;
  text("JSW SOLUTIONS", hx, y - 24, bold, 17, GREEN_DARK);
  text("Industrial Laser & CNC Maintenance", hx, y - 40, bold, 10.5, GOLD);
  text("1151 Bishop Rd, Saline, MI 48176  •  734-320-6348", hx, y - 56, font, 8.5, INK);
  text("www.jswsolutions.org  •  jsawsolutions@gmail.com", hx, y - 69, font, 8.5, INK);
  y -= logoH + 22;

  // thick green rule
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: MARGIN + CONTENT_W, y },
    thickness: 3,
    color: GREEN_DARK,
  });
  y -= 26;

  // --- title -----------------------------------------------------------------
  centerText("SERVICE INVOICE", PAGE_W / 2, y, bold, 17, GREEN_DARK);

  // Paid banner sits to the right of the title so nothing else has to move.
  if (showPaid) {
    const parts = [`PAID ${usDate(data.paid_date)}`];
    if (data.payment_method === "card") parts.push("by card");
    else if (data.check_number) parts.push(`Check #${data.check_number}`);
    const label = parts.join("  •  ");
    const size = 9;
    const padX = 8;
    const w = bold.widthOfTextAtSize(label, size) + padX * 2;
    const x = MARGIN + CONTENT_W - w;
    page.drawRectangle({
      x,
      y: y - 6,
      width: w,
      height: 20,
      color: GREEN,
    });
    text(label, x + padX, y, bold, size, WHITE);
  }
  y -= 22;

  // --- PO / Machine / Date ---------------------------------------------------
  const dateLabel = data.dates.length > 1 ? "Dates" : "Date";
  const dateValue = data.dates.map(usDate).join(", ");
  labelRow("PO #", data.po_number ?? "", CONTENT_W * 0.48);
  labelRow("Machine", data.machine_label ?? "", CONTENT_W * 0.48);
  labelRow(dateLabel, dateValue, CONTENT_W * 0.48);

  // --- PREPARED FOR ----------------------------------------------------------
  sectionHeading("PREPARED FOR");
  labelRow("Customer Name", data.customer_contact ?? "", CONTENT_W * 0.48);
  labelRow("Customer Company", data.customer_company ?? "", CONTENT_W * 0.48);

  // --- PROJECT/WORK LOCATION -------------------------------------------------
  sectionHeading("PROJECT/WORK LOCATION");
  labelRow("Customer Address", data.customer_address ?? "", 110);
  {
    // City | State | ZIP on one row, like the template.
    const rowH = 19;
    const labelW = 60;
    const cityW = (CONTENT_W - labelW * 3) * 0.45;
    const stateW = (CONTENT_W - labelW * 3) * 0.2;
    const zipW = CONTENT_W - labelW * 3 - cityW - stateW;
    let x = MARGIN;
    const put = (label: string, value: string, valueW: number) => {
      cell(x, y, labelW, rowH, SAND);
      text(label, x + 6, y - rowH + 6, bold, 8.5, INK);
      x += labelW;
      cell(x, y, valueW, rowH, null);
      text(value, x + 6, y - rowH + 6, font, 9, INK);
      x += valueW;
    };
    put("City", data.customer_city ?? "", cityW);
    put("State", data.customer_state ?? "", stateW);
    put("ZIP", data.customer_zip ?? "", zipW);
    y -= rowH;
  }
  labelRow("Customer Phone", data.customer_phone ?? "", 110);

  // --- SUMMARY OF WORK PERFORMED --------------------------------------------
  sectionHeading("SUMMARY OF WORK PERFORMED");
  {
    const summary = (data.work_summary ?? "").trim();
    const lines = summary ? wrapText(summary, font, 8.5, CONTENT_W - 14) : [];
    const boxH = Math.max(24, lines.length * 11 + 12);
    cell(MARGIN, y, CONTENT_W, boxH, null);
    lines.forEach((ln, i) => text(ln, MARGIN + 7, y - 15 - i * 11, font, 8.5, INK));
    y -= boxH;
  }

  // --- NOTES -----------------------------------------------------------------
  sectionHeading("NOTES");
  {
    const notes = (data.notes ?? "").trim();
    const lines = notes ? wrapText(notes, font, 8.5, CONTENT_W - 14) : [];
    const boxH = Math.max(24, lines.length * 11 + 12);
    cell(MARGIN, y, CONTENT_W, boxH, null);
    lines.forEach((ln, i) => text(ln, MARGIN + 7, y - 15 - i * 11, font, 8.5, INK));
    y -= boxH;
  }

  // --- LABOR INCLUDED --------------------------------------------------------
  sectionHeading("LABOR INCLUDED");
  const cDesc = CONTENT_W * 0.24;
  const cRate = CONTENT_W * 0.25;
  const cQty = CONTENT_W * 0.25;
  const cTotal = CONTENT_W - cDesc - cRate - cQty;
  const xDesc = MARGIN;
  const xRate = xDesc + cDesc;
  const xQty = xRate + cRate;
  const xTotal = xQty + cQty;

  {
    // header row
    const rowH = 20;
    page.drawRectangle({
      x: MARGIN,
      y: y - rowH,
      width: CONTENT_W,
      height: rowH,
      color: GREEN,
      borderColor: GREEN_DARK,
      borderWidth: 0.6,
    });
    text("Description", xDesc + 6, y - rowH + 6, bold, 9, WHITE);
    rightText("Rate", xRate + cRate - 6, y - rowH + 6, bold, 9, WHITE);
    centerText("Qty", xQty + cQty / 2, y - rowH + 6, bold, 9, WHITE);
    rightText("Total", xTotal + cTotal - 6, y - rowH + 6, bold, 9, WHITE);
    y -= rowH;
  }

  // The template always shows its four standard rows; real line items replace
  // matching rows and anything extra is appended.
  const TEMPLATE_ROWS = ["SERVICE", "TRAVEL", "MILES", "PER DIEM"];
  const items = [...data.line_items];
  type Row = { description: string; cost_per_hour: number | null; qty: number | null; line_total: number | null };
  const rows: Row[] = [];
  for (const name of TEMPLATE_ROWS) {
    const idx = items.findIndex((li) => li.description.trim().toUpperCase() === name);
    if (idx >= 0) {
      const li = items.splice(idx, 1)[0];
      rows.push({ ...li });
    } else {
      rows.push({ description: name, cost_per_hour: null, qty: null, line_total: null });
    }
  }
  for (const li of items) rows.push({ ...li }); // any custom lines (e.g. PARTS)

  for (const r of rows) {
    const rowH = 19;
    cell(xDesc, y, cDesc, rowH, null);
    cell(xRate, y, cRate, rowH, null);
    cell(xQty, y, cQty, rowH, null);
    cell(xTotal, y, cTotal, rowH, null);
    text(r.description, xDesc + 6, y - rowH + 6, font, 9, INK);
    const rate = r.cost_per_hour != null ? money(r.cost_per_hour) : "";
    rightText(rate ? `$ ${rate}` : "$", xRate + cRate - 6, y - rowH + 6, font, 9, INK);
    if (r.qty != null) centerText(String(r.qty), xQty + cQty / 2, y - rowH + 6, font, 9, INK);
    const tot = r.line_total != null ? money(r.line_total) : "";
    rightText(tot ? `$ ${tot}` : "$", xTotal + cTotal - 6, y - rowH + 6, font, 9, INK);
    y -= rowH;
  }

  {
    // Total Charge row — green label cell, amount in the rate column.
    const rowH = 22;
    page.drawRectangle({
      x: xDesc,
      y: y - rowH,
      width: cDesc,
      height: rowH,
      color: GREEN,
      borderColor: GREEN_DARK,
      borderWidth: 0.6,
    });
    rightText("Total Charge", xRate - 8, y - rowH + 7, bold, 10.5, WHITE);
    cell(xRate, y, cRate, rowH, null);
    rightText(`$ ${money(data.total)}`, xRate + cRate - 6, y - rowH + 7, bold, 10, INK);
    y -= rowH;
  }

  // --- footer terms ----------------------------------------------------------
  y -= 12;
  const terms =
    "Please make checks payable to JSW Solutions LLC. Payment required upon receipt. Minimum 4 hour service charge per day. Travel hours, per diem, and miles may be evenly split between multiple machines serviced on the same date.";
  const termLines = wrapText(terms, italic, 7.5, CONTENT_W - 40);
  for (const ln of termLines) {
    centerText(ln, PAGE_W / 2, y, italic, 7.5, GRAY);
    y -= 10;
  }

  // --- PAID watermark --------------------------------------------------------
  if (showPaid) {
    page.drawText("PAID", {
      x: 150,
      y: 260,
      size: 160,
      font: bold,
      color: GREEN,
      opacity: 0.08,
      rotate: degrees(35),
    });
  }

  return doc.save();
}

/** Strips characters Windows won't allow in a file name. */
function safeName(s: string): string {
  return s.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim();
}

/** "8/17/2026" → "8-17-2026" for file names. */
function fileDate(iso: string | null): string {
  return usDate(iso).replace(/\//g, "-");
}

/**
 * Builds the download file name:
 *   unpaid:  "Acme Mfg - PO 4512.pdf"
 *   paid:    "Acme Mfg - PO 4512 - PAID 8-17-2026 - Check 1042.pdf"
 */
export function invoicePdfFilename(data: InvoicePdfData, paidForm: boolean): string {
  const parts: string[] = [];
  parts.push(safeName(data.customer_company || "Invoice"));
  if (data.po_number) parts.push(`PO ${safeName(data.po_number)}`);
  if (paidForm && data.paid) {
    parts.push(`PAID${data.paid_date ? ` ${fileDate(data.paid_date)}` : ""}`);
    if (data.payment_method === "card") parts.push("Card");
    else if (data.check_number) parts.push(`Check ${safeName(data.check_number)}`);
  }
  return `${parts.join(" - ")}.pdf`;
}
