import { NextResponse } from "next/server";
import { recomputeAllAutoMileage } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // plenty of dates to walk through

/**
 * POST /api/mileage/recompute — rebuilds every automatic mileage entry from
 * the invoices using the current rules (MILES line quantity first, travel
 * hours × rate as the fallback). Manual entries are untouched.
 */
export async function POST() {
  const trips = await recomputeAllAutoMileage();
  return NextResponse.json({ ok: true, trips });
}
