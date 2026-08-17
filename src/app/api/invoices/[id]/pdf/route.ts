import { NextResponse } from "next/server";
import { getInvoiceForPdf } from "@/lib/queries";
import { buildInvoicePdf, invoicePdfFilename } from "@/lib/invoice-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/invoices/123/pdf        → the invoice as a PDF (with PAID banner
 *                                    and stamp when the invoice is paid)
 * GET /api/invoices/123/pdf?form=unpaid
 *                                  → the plain, pre-payment form even after
 *                                    it's been paid
 *
 * File names: "Company - PO 4512.pdf", and once paid
 * "Company - PO 4512 - PAID 8-17-2026 - Check 1042.pdf" (or "... - Card").
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Bad invoice id" }, { status: 400 });
  }
  const data = await getInvoiceForPdf(id);
  if (!data) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const wantUnpaidForm = searchParams.get("form") === "unpaid";
  const paidForm = data.paid && !wantUnpaidForm;

  const bytes = await buildInvoicePdf(data, { paidStamp: paidForm });
  const filename = invoicePdfFilename(data, paidForm);

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      // filename* carries the UTF-8 name; plain filename is the ASCII fallback.
      "Content-Disposition": `attachment; filename="${filename.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
