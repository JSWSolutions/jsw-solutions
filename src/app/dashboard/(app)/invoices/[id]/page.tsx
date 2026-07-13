import Link from "next/link";
import { notFound } from "next/navigation";
import { getInvoiceById } from "@/lib/queries";
import { money, shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();
  const inv = await getInvoiceById(id);
  if (!inv) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/invoices" className="text-sm text-slate-500 hover:underline">
          ← Back to invoices
        </Link>
        {inv.pdf_url && (
          <a
            href={inv.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            View original PDF ↗
          </a>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              {inv.customer_company || "Unknown customer"}
            </h1>
            <p className="text-slate-500">
              {inv.customer_contact ? `${inv.customer_contact} · ` : ""}
              {shortDate(inv.invoice_date)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Total charge</p>
            <p className="text-3xl font-extrabold text-brand-green-dark">
              {money(inv.total)}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
          <Field label="PO #" value={inv.po_number} />
          <Field label="Machine" value={inv.machine_label} />
          <Field label="Invoice date" value={shortDate(inv.invoice_date)} />
        </div>

        {inv.work_summary && (
          <div className="mt-6">
            <h2 className="mb-1 font-bold text-slate-900">Work performed</h2>
            <p className="whitespace-pre-wrap text-sm text-slate-700">
              {inv.work_summary}
            </p>
          </div>
        )}

        {inv.line_items.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-2 font-bold text-slate-900">Line items</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2">Description</th>
                  <th className="py-2 text-right">Rate</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {inv.line_items.map((li, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2 font-medium">{li.description}</td>
                    <td className="py-2 text-right">
                      {li.cost_per_hour != null ? money(li.cost_per_hour) : "—"}
                    </td>
                    <td className="py-2 text-right">{li.qty ?? "—"}</td>
                    <td className="py-2 text-right font-semibold">
                      {money(li.line_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-slate-500">{label}</p>
      <p className="font-semibold text-slate-900">{value || "—"}</p>
    </div>
  );
}
