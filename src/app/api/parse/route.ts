import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { parseInvoicePdf } from "@/lib/parse-invoice";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected a file upload" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.type && !file.type.includes("pdf")) {
    return NextResponse.json({ error: "Please upload a PDF file" }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  let parsed;
  try {
    const result = await parseInvoicePdf(bytes);
    parsed = result.parsed;
  } catch (err) {
    console.error("PDF parse failed:", err);
    return NextResponse.json(
      { error: "Could not read that PDF. You can still enter the details manually." },
      { status: 422 },
    );
  }

  // Store the original PDF in Vercel Blob if configured. Non-fatal if not.
  let pdfUrl: string | null = null;
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_") || "invoice.pdf";
      const key = `invoices/${Date.now()}-${safeName}`;
      const blob = await put(key, Buffer.from(bytes), {
        access: "public",
        contentType: "application/pdf",
      });
      pdfUrl = blob.url;
    } catch (err) {
      console.error("Blob upload failed:", err);
    }
  }

  return NextResponse.json({ parsed, pdfUrl });
}
