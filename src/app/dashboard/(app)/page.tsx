import Link from "next/link";
import {
  getDashboardTotals,
  getMonthlyIncome,
  getYearlyIncome,
} from "@/lib/queries";
import { money, monthLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 shadow-sm ${
        accent
          ? "border-brand-orange/30 bg-brand-orange/10"
          : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-slate-900">{value}</p>
    </div>
  );
}

export default async function OverviewPage() {
  const [totals, monthly, yearly] = await Promise.all([
    getDashboardTotals(),
    getMonthlyIncome(18),
    getYearlyIncome(),
  ]);

  const maxMonth = Math.max(1, ...monthly.map((m) => m.total));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Overview</h1>
        <p className="text-slate-500">Company financials at a glance</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat label="Gross income (this month)" value={money(totals.grossThisMonth)} />
        <Stat label="Gross income (this year)" value={money(totals.grossThisYear)} accent />
        <Stat label="Gross income (all time)" value={money(totals.grossAllTime)} />
        <Stat label="Invoices" value={String(totals.invoiceCount)} />
        <Stat label="Customers" value={String(totals.customerCount)} />
        <Stat label="Machines serviced" value={String(totals.machineCount)} />
      </div>

      {/* Monthly income chart */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-bold text-slate-900">Monthly income</h2>
        {monthly.length === 0 ? (
          <EmptyHint />
        ) : (
          <div className="flex items-end gap-2 overflow-x-auto pb-2" style={{ height: 220 }}>
            {monthly.map((m) => (
              <div key={m.month} className="flex min-w-[44px] flex-1 flex-col items-center justify-end">
                <span className="mb-1 text-[10px] font-semibold text-slate-600">
                  {m.total >= 1000
                    ? `$${(m.total / 1000).toFixed(1)}k`
                    : `$${m.total.toFixed(0)}`}
                </span>
                <div
                  className="w-full rounded-t bg-brand-green"
                  style={{ height: `${Math.max(4, (m.total / maxMonth) * 160)}px` }}
                  title={`${monthLabel(m.month)}: ${money(m.total)}`}
                />
                <span className="mt-1 whitespace-nowrap text-[10px] text-slate-500">
                  {monthLabel(m.month)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Yearly table */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 font-bold text-slate-900">By year</h2>
        {yearly.length === 0 ? (
          <EmptyHint />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2">Year</th>
                <th className="py-2">Invoices</th>
                <th className="py-2 text-right">Gross income</th>
              </tr>
            </thead>
            <tbody>
              {yearly.map((y) => (
                <tr key={y.year} className="border-b border-slate-100">
                  <td className="py-2 font-semibold">{y.year}</td>
                  <td className="py-2">{y.count}</td>
                  <td className="py-2 text-right font-semibold">{money(y.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function EmptyHint() {
  return (
    <p className="text-sm text-slate-500">
      No invoices yet.{" "}
      <Link href="/dashboard/invoices/new" className="font-semibold text-brand-orange">
        Add your first invoice
      </Link>{" "}
      to see income here.
    </p>
  );
}
