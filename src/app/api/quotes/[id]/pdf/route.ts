import { NextResponse } from "next/server";
import { getQuoteForPdf } from "@/lib/db";
import { buildInvoicePdf, quotePdfFilename } from "@/lib/invoice-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/quotes/12/pdf → the quote as a PDF, "Company - Quote 11-11-2026.pdf" */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Bad quote id" }, { status: 400 });
  const q = await getQuoteForPdf(id);
  if (!q) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  const bytes = await buildInvoicePdf(q.pdf, { kind: "quote" });
  const filename = quotePdfFilename(q.pdf);
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
