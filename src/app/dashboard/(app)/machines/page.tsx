import Link from "next/link";
import { getMachines } from "@/lib/queries";
import { money, shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MachinesPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = searchParams.q ?? "";
  const machines = await getMachines(q);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-900">Machine service history</h1>
      <p className="text-slate-500">
        Every machine you&apos;ve serviced, with its full job history. Click a
        machine to see each visit.
      </p>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by machine ID or customer…"
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
              <th className="px-4 py-3">Machine</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3 text-right">Times serviced</th>
              <th className="px-4 py-3 text-right">Total billed</th>
              <th className="px-4 py-3">Last service</th>
            </tr>
          </thead>
          <tbody>
            {machines.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No machines yet.
                </td>
              </tr>
            )}
            {machines.map((m) => (
              <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold">
                  <Link
                    href={`/dashboard/invoices?q=${encodeURIComponent(m.machine_id)}`}
                    className="hover:text-brand-orange"
                  >
                    {m.machine_id}
                  </Link>
                </td>
                <td className="px-4 py-3">{m.customer_company || "—"}</td>
                <td className="px-4 py-3 text-right">{m.service_count}</td>
                <td className="px-4 py-3 text-right font-semibold">
                  {money(m.total_billed)}
                </td>
                <td className="px-4 py-3">{shortDate(m.last_service)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
