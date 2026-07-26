import { NextResponse } from "next/server";
import { deleteInvoice } from "@/lib/db";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid invoice id." }, { status: 400 });
  }
  try {
    const ok = await deleteInvoice(id);
    if (!ok) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Delete invoice failed:", err);
    return NextResponse.json({ error: "Could not delete the invoice." }, { status: 500 });
  }
}
