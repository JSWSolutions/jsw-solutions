import { unstable_noStore as noStore } from "next/cache";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

// TEMPORARY DIAGNOSTIC PAGE — safe to delete once the dashboard is confirmed live.
// Marker changes every time this file is edited so we can tell which build is serving.
const BUILD_MARKER = "DIAG-A1";

export default async function DiagPage() {
  noStore();
  const renderedAt = new Date().toISOString();

  const r = await sql`
    SELECT current_database() AS db,
           count(*) AS invoices,
           count(*) FILTER (WHERE NOT paid) AS unpaid,
           COALESCE(SUM(total) FILTER (WHERE NOT paid), 0) AS outstanding,
           max(id) AS max_id
    FROM invoices;
  `;
  const c = await sql`SELECT count(*) AS n FROM customers;`;
  const row = r.rows[0];

  const raw =
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    "";
  const host = raw.replace(/^.*@/, "").replace(/[/?].*$/, "");

  const facts: [string, string][] = [
    ["Build marker", BUILD_MARKER],
    ["Rendered at (server)", renderedAt],
    ["Git commit", process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) || "(none)"],
    ["Deployment id", process.env.VERCEL_DEPLOYMENT_ID || "(none)"],
    ["Database host", host],
    ["Database name", String(row.db)],
    ["Invoices in DB", String(row.invoices)],
    ["Unpaid in DB", String(row.unpaid)],
    ["Outstanding in DB", String(row.outstanding)],
    ["Highest invoice id", String(row.max_id)],
    ["Customers in DB", String(c.rows[0].n)],
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold text-slate-900">Diagnostics</h1>
      <p className="text-sm text-slate-500">
        This page reads the database directly, from inside a normal dashboard page.
        Refresh it — &quot;Rendered at&quot; must change every time.
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <tbody>
            {facts.map(([k, v]) => (
              <tr key={k} className="border-t border-slate-100 first:border-t-0">
                <td className="px-4 py-2 font-medium text-slate-500">{k}</td>
                <td className="px-4 py-2 font-mono font-semibold text-slate-900">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
