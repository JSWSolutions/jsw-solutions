import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, verifySessionToken } from "@/lib/auth";

// Routes that require a valid dashboard session.
const PROTECTED_API = ["/api/invoices", "/api/parse"];

export const config = {
  // Run on everything except Next internals and static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|ico|webp)$).*)"],
};

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const host = (req.headers.get("host") || "").split(":")[0].toLowerCase();
  const dashboardHost = (process.env.DASHBOARD_HOST || "").toLowerCase();

  // Treat the configured dashboard host (or any "dashboard." subdomain) as the
  // private app: rewrite its paths under /dashboard so the same deployment
  // serves both faces.
  const isDashboardHost =
    (dashboardHost && host === dashboardHost) || host.startsWith("dashboard.");

  let path = url.pathname;
  let rewritten = false;
  if (isDashboardHost && !path.startsWith("/dashboard") && !path.startsWith("/api/")) {
    path = path === "/" ? "/dashboard" : `/dashboard${path}`;
    url.pathname = path;
    rewritten = true;
  }

  const secret = process.env.AUTH_SECRET || "";
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  const authed = await verifySessionToken(token, secret);

  const needsAuth =
    (path.startsWith("/dashboard") && !path.startsWith("/dashboard/login")) ||
    PROTECTED_API.some((p) => path.startsWith(p));

  if (needsAuth && !authed) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const login = req.nextUrl.clone();
    login.pathname = isDashboardHost ? "/login" : "/dashboard/login";
    // On the dashboard host, /login rewrites to /dashboard/login below.
    login.searchParams.set("from", url.pathname);
    const redirect = NextResponse.redirect(login);
    return redirect;
  }

  if (rewritten) return NextResponse.rewrite(url);
  return NextResponse.next();
}
