import { NextResponse } from "next/server";
import { sql, initSchema } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/machines               → every machine
 * GET /api/machines?customer=12   → that customer's machines first, then the rest
 * Used by the machine dropdown on the invoice form.
 */
export async function GET(req: Request) {
  await initSchema();
  const { searchParams } = new URL(req.url);
  const customerId = Number(searchParams.get("customer"));
  const cid = Number.isFinite(customerId) && customerId > 0 ? customerId : null;
  const r = await sql`
    SELECT m.id, m.machine_id, m.customer_id
    FROM machines m
    ORDER BY (m.customer_id = ${cid}::int) DESC NULLS LAST, m.machine_id ASC;
  `;
  return NextResponse.json({
    machines: r.rows.map((row) => ({
      id: Number(row.id),
      machine_id: row.machine_id as string,
      customer_id: row.customer_id == null ? null : Number(row.customer_id),
    })),
  });
}
