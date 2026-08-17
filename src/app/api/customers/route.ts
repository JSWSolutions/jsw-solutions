import { NextResponse } from "next/server";
import { createCustomer, listCustomerDetails } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Full customer list for the invoice-form dropdown and the Customers page. */
export async function GET() {
  const customers = await listCustomerDetails();
  return NextResponse.json({ customers });
}

function str(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s || null;
}

/** Adds a brand-new customer (used before creating their first invoice). */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const company = String(body.company ?? "").trim();
  if (!company) {
    return NextResponse.json({ error: "Company name is required." }, { status: 400 });
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
  const customer = await createCustomer({
    company,
    contact_name: str(body.contact_name),
    address: str(body.address),
    city: str(body.city),
    state: str(body.state),
    zip: str(body.zip),
    phone: str(body.phone),
    mileage_rate: mileageRate,
  });
  if (!customer) {
    return NextResponse.json(
      { error: `A customer named "${company}" already exists.` },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true, customer });
}
