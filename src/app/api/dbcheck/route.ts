import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const r = await sql`
      SELECT current_database() AS db,
             count(*) AS invoices,
             count(*) FILTER (WHERE NOT paid) AS unpaid
      FROM invoices;
    `;
    const raw =
      process.env.POSTGRES_URL ||
      process.env.DATABASE_URL ||
      process.env.POSTGRES_PRISMA_URL ||
      "";
    const host = raw.replace(/^.*@/, "").replace(/[/?].*$/, "");
    return NextResponse.json({
      connected_host: host || "(none found)",
      env_used: process.env.POSTGRES_URL
        ? "POSTGRES_URL"
        : process.env.DATABASE_URL
        ? "DATABASE_URL"
        : "none",
      database_name: r.rows[0].db,
      invoices_the_app_sees: Number(r.rows[0].invoices),
      unpaid_the_app_sees: Number(r.rows[0].unpaid),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
