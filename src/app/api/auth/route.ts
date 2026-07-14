import { NextResponse } from "next/server";
import {
  AUTH_COOKIE,
  checkPassword,
  createSessionToken,
  cookieMaxAgeSeconds,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const env = {
    POSTGRES_URL: !!process.env.POSTGRES_URL,
    DATABASE_URL: !!process.env.DATABASE_URL,
    POSTGRES_PRISMA_URL: !!process.env.POSTGRES_PRISMA_URL,
    POSTGRES_URL_NON_POOLING: !!process.env.POSTGRES_URL_NON_POOLING,
    DATABASE_URL_UNPOOLED: !!process.env.DATABASE_URL_UNPOOLED,
    POSTGRES_URL_NO_SSL: !!process.env.POSTGRES_URL_NO_SSL,
    BLOB_READ_WRITE_TOKEN: !!process.env.BLOB_READ_WRITE_TOKEN,
    AUTH_SECRET: !!process.env.AUTH_SECRET,
    DASHBOARD_PASSWORD: !!process.env.DASHBOARD_PASSWORD,
  };
  const cs =
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.POSTGRES_URL_NO_SSL ||
    "";
  let host: string | null = null;
  try {
    host = cs ? new URL(cs).host : null;
  } catch {
    host = "unparseable";
  }
  const out: Record<string, unknown> = { env, host };
  try {
    const { sql, initSchema } = await import("@/lib/db");
    const r = await sql`SELECT 1 as ok`;
    out.select = r.rows[0];
    try {
      await initSchema();
      out.schema = "ok";
    } catch (e) {
      out.schema = "ERROR";
      out.schemaError = (e as Error).message;
    }
    out.ok = true;
  } catch (e) {
    out.ok = false;
    out.error = (e as Error).message;
    out.errorName = (e as Error).name;
  }
  return NextResponse.json(out);
}

export async function POST(req: Request) {
  let password = "";
  try {
    const body = await req.json();
    password = String(body?.password ?? "");
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  if (!checkPassword(password)) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const secret = process.env.AUTH_SECRET || "";
  if (!secret) {
    return NextResponse.json(
      { error: "Server not configured (missing AUTH_SECRET)" },
      { status: 500 },
    );
  }

  const token = await createSessionToken(secret);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: cookieMaxAgeSeconds(),
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
