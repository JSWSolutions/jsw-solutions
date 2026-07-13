import Link from "next/link";
import { getInvoices } from "@/lib/queries";
import { money, shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = searchParams.q ?? "";
  const invoices = await getInvoices({ search: q, limit: 500 });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-slate-900">Invoices</h1>
        <Link
          href="/dashboard/invoices/new"
          className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white hover:bg-brand-orange-dark"
        >
          + New Invoice
        </Link>
      </div>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by customer, machine, PO#, or work notes…"
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
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Machine</th>
              <th className="px-4 py-3">PO#</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  {q ? "No invoices match your search." : "No invoices yet."}
                </td>
              </tr>
            )}
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">{shortDate(inv.invoice_date)}</td>
                <td className="px-4 py-3 font-medium">
                  {inv.customer_company || "—"}
                </td>
                <td className="px-4 py-3">{inv.machine_label || "—"}</td>
                <td className="px-4 py-3 text-slate-500">{inv.po_number || "—"}</td>
                <td className="px-4 py-3 text-right font-semibold">
                  {money(inv.total)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/dashboard/invoices/${inv.id}`}
                    className="text-brand-orange hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {invoices.length > 0 && (
        <p className="text-sm text-slate-500">
          Showing {invoices.length} invoice{invoices.length === 1 ? "" : "s"}.
        </p>
      )}
    </div>
  );
}
