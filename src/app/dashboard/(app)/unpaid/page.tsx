import Link from "next/link";
import { getInvoices } from "@/lib/queries";
import { money, shortDate } from "@/lib/format";
import { MarkPaidButton } from "@/components/dashboard/MarkPaidButton";

export const dynamic = "force-dynamic";

function dateRange(start: string | null, end: string | null): string {
  if (!start) return "—";
  if (end && end !== start) return `${shortDate(start)} – ${shortDate(end)}`;
  return shortDate(start);
}

export default async function UnpaidPage() {
  const invoices = await getInvoices({ paid: false, limit: 500 });
  const outstanding = invoices.reduce((s, i) => s + i.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-slate-900">Unpaid Invoices</h1>
        <div className="rounded-xl border border-brand-orange/30 bg-brand-orange/10 px-5 py-3">
          <p className="text-sm font-medium text-slate-500">Outstanding</p>
          <p className="text-2xl font-extrabold text-brand-orange-dark">{money(outstanding)}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Machine</th>
              <th className="px-4 py-3 text-right">Amount owed</th>
              <th className="px-4 py-3"></th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  🎉 No unpaid invoices — you&apos;re all caught up.
                </td>
              </tr>
            )}
            {invoices.map((inv) => (
              <tr key={inv.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">{dateRange(inv.invoice_date, inv.invoice_date_end)}</td>
                <td className="px-4 py-3 font-medium">{inv.customer_company || "—"}</td>
                <td className="px-4 py-3">{inv.machine_label || "—"}</td>
                <td className="px-4 py-3 text-right font-semibold">{money(inv.total)}</td>
                <td className="px-4 py-3 text-right">
                  <MarkPaidButton id={inv.id} paid={inv.paid} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/dashboard/invoices/${inv.id}`} className="text-brand-orange hover:underline">
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
          {invoices.length} unpaid invoice{invoices.length === 1 ? "" : "s"}. Click{" "}
          <span className="font-semibold text-brand-green">Mark Paid</span> when a customer pays.
        </p>
      )}
    </div>
  );
}
