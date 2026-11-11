import { NextResponse } from "next/server";
import { deleteQuote, getQuoteForPdf } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Bad quote id" }, { status: 400 });
  const q = await getQuoteForPdf(id);
  if (!q) return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  return NextResponse.json({ quote: q });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Bad quote id" }, { status: 400 });
  await deleteQuote(id);
  return NextResponse.json({ ok: true });
}
