import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { listQuotes } from "@/lib/db";
import { money, shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  noStore();
  const q = searchParams.q ?? "";
  const quotes = await listQuotes(q);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-900">Quotes</h1>
        <Link
          href="/dashboard/quotes/new"
          className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white hover:bg-brand-orange-dark"
        >
          + New Quote
        </Link>
      </div>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search quotes by company or summary…"
          className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:border-brand-orange"
        />
        <button className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white">
          Search
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Emailed</th>
            </tr>
          </thead>
          <tbody>
            {quotes.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  No quotes yet — click + New Quote to write one.
                </td>
              </tr>
            )}
            {quotes.map((qt) => (
              <tr key={qt.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">{shortDate(qt.quote_date)}</td>
                <td className="px-4 py-3 font-semibold">
                  <Link href={`/dashboard/quotes/${qt.id}`} className="hover:text-brand-orange">
                    {qt.customer_company || "Unknown customer"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right font-semibold">{money(qt.total)}</td>
                <td className="px-4 py-3 text-slate-500">
                  {qt.emailed_at ? `Sent ${shortDate(qt.emailed_at)}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
