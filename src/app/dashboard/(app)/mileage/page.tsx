import { unstable_noStore as noStore } from "next/cache";
import { getMileageLog, getMileageTotals, getMileageByYear } from "@/lib/queries";
import { shortDate } from "@/lib/format";
import { ManualMileageForm } from "@/components/dashboard/ManualMileageForm";
import { RecalcMileageButton } from "@/components/dashboard/RecalcMileageButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const miles = (n: number) =>
  n.toLocaleString("en-US", { maximumFractionDigits: 1 }) + " mi";

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 shadow-sm ${accent ? "border-brand-orange/30 bg-brand-orange/10" : "border-slate-200 bg-white"}`}>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-slate-900">{value}</p>
    </div>
  );
}

export default async function MileagePage() {
  noStore();
  const [totals, log, byYear] = await Promise.all([
    getMileageTotals(),
    getMileageLog(),
    getMileageByYear(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Mileage Log</h1>
          <p className="text-slate-500">
            Auto-logged one trip per customer per service day, straight from each
            invoice&apos;s MILES line.
          </p>
        </div>
        <RecalcMileageButton />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat label="Miles this month" value={miles(totals.thisMonth)} />
        <Stat label="Miles this year" value={miles(totals.thisYear)} accent />
        <Stat label="Miles all-time" value={miles(totals.allTime)} />
      </div>

      <ManualMileageForm />

      {byYear.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 font-bold text-slate-900">By year</h2>
          <table className="w-full max-w-md text-sm">
            <tbody>
              {byYear.map((y) => (
                <tr key={y.year} className="border-b border-slate-100">
                  <td className="py-2 font-semibold">{y.year}</td>
                  <td className="py-2 text-right">{miles(y.miles)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Customer / place</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3 text-right">Miles</th>
              <th className="px-4 py-3">Source</th>
            </tr>
          </thead>
          <tbody>
            {log.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No mileage yet. It fills in automatically as invoices are added
                  (once per-customer rates are set), or add entries manually above.
                </td>
              </tr>
            )}
            {log.map((row) => (
              <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">{shortDate(row.entry_date)}</td>
                <td className="px-4 py-3 font-medium">{row.customer_name || "—"}</td>
                <td className="px-4 py-3">{row.reason}</td>
                <td className="px-4 py-3 text-right font-semibold">{miles(row.miles)}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${row.source === "auto" ? "bg-slate-100 text-slate-600" : "bg-brand-orange/15 text-brand-orange-dark"}`}>
                    {row.source === "auto" ? "auto" : "manual"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {log.length > 0 && (
        <p className="text-sm text-slate-500">{log.length} entries.</p>
      )}
    </div>
  );
}
