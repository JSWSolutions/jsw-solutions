import Link from "next/link";
import { getCustomers } from "@/lib/queries";
import { money, shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = searchParams.q ?? "";
  const customers = await getCustomers(q);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900">Customers</h1>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search customers…"
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
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3 text-right">Jobs</th>
              <th className="px-4 py-3 text-right">Total billed</th>
              <th className="px-4 py-3">Last service</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No customers yet.
                </td>
              </tr>
            )}
            {customers.map((c) => (
              <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold">
                  <Link
                    href={`/dashboard/invoices?q=${encodeURIComponent(c.company)}`}
                    className="hover:text-brand-orange"
                  >
                    {c.company}
                  </Link>
                </td>
                <td className="px-4 py-3">{c.contact_name || "—"}</td>
                <td className="px-4 py-3 text-slate-500">
                  {[c.city, c.state].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="px-4 py-3 text-right">{c.invoice_count}</td>
                <td className="px-4 py-3 text-right font-semibold">
                  {money(c.total_billed)}
                </td>
                <td className="px-4 py-3">{shortDate(c.last_service)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
