import { NextResponse } from "next/server";
import { getCustomerDetails, updateCustomer } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Bad customer id" }, { status: 400 });
  }
  const customer = await getCustomerDetails(id);
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }
  return NextResponse.json({ customer });
}

function str(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

/** Saves edits from the customer edit page. */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Bad customer id" }, { status: 400 });
  }
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  let mileageRate: number | null = null;
  if (body.mileage_rate != null && String(body.mileage_rate).trim() !== "") {
    const n = Number(body.mileage_rate);
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json(
        { error: "Mileage (miles per trip) should be a plain number, or left blank." },
        { status: 400 },
      );
    }
    mileageRate = n;
  }
  const result = await updateCustomer(id, {
    company: String(body.company ?? ""),
    contact_name: str(body.contact_name),
    address: str(body.address),
    city: str(body.city),
    state: str(body.state),
    zip: str(body.zip),
    phone: str(body.phone),
    mileage_rate: mileageRate,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
