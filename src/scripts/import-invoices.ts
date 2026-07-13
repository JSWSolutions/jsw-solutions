/**
 * Bulk-imports a folder of invoice PDFs into the database.
 *
 *   npm run db:import -- ./path/to/folder-of-pdfs
 *
 * (If you omit the path it defaults to ./invoices-to-import.)
 *
 * For each PDF it: parses the fields, optionally uploads the file to Vercel
 * Blob (if BLOB_READ_WRITE_TOKEN is set), and saves an invoice record.
 * It prints a summary so you can spot anything that needs manual fixing.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parseInvoicePdf } from "../lib/parse-invoice";
import { saveInvoice } from "../lib/db";

async function maybeUpload(bytes: Buffer, name: string): Promise<string | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  const { put } = await import("@vercel/blob");
  const safe = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const blob = await put(`invoices/${Date.now()}-${safe}`, bytes, {
    access: "public",
    contentType: "application/pdf",
  });
  return blob.url;
}

async function main() {
  if (!process.env.POSTGRES_URL) {
    console.error("✗ POSTGRES_URL is not set (see .env.local). Aborting.");
    process.exit(1);
  }

  const dir = path.resolve(process.argv[2] || "./invoices-to-import");
  let files: string[];
  try {
    files = (await readdir(dir)).filter((f) => f.toLowerCase().endsWith(".pdf"));
  } catch {
    console.error(`✗ Could not read folder: ${dir}`);
    process.exit(1);
  }

  if (files.length === 0) {
    console.log(`No PDF files found in ${dir}.`);
    process.exit(0);
  }

  console.log(`Found ${files.length} PDF(s) in ${dir}\n`);
  let ok = 0;
  const warnings: string[] = [];

  for (const file of files.sort()) {
    const full = path.join(dir, file);
    try {
      const buf = await readFile(full);
      const { parsed } = await parseInvoicePdf(new Uint8Array(buf));
      const pdfUrl = await maybeUpload(buf, file);
      const id = await saveInvoice(parsed, pdfUrl);

      const flags: string[] = [];
      if (!parsed.customer_company) flags.push("no customer");
      if (!parsed.total) flags.push("no total");
      if (!parsed.invoice_date) flags.push("no date");
      const flagStr = flags.length ? `  ⚠ ${flags.join(", ")}` : "";
      if (flags.length) warnings.push(`${file}: ${flags.join(", ")}`);

      console.log(
        `✓ #${id}  ${file}  →  ${parsed.customer_company || "?"} · ${
          parsed.machine_id || "?"
        } · $${parsed.total}${flagStr}`,
      );
      ok++;
    } catch (err) {
      console.error(`✗ ${file}: ${(err as Error).message}`);
      warnings.push(`${file}: FAILED to import`);
    }
  }

  console.log(`\nDone. Imported ${ok}/${files.length}.`);
  if (warnings.length) {
    console.log(
      `\n${warnings.length} invoice(s) may need a manual check in the dashboard:`,
    );
    warnings.forEach((w) => console.log(`  - ${w}`));
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("✗ Import failed:", err);
  process.exit(1);
});
