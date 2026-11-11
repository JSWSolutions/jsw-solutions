import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomerDetails, getQuoteEmailLog, getQuoteForPdf } from "@/lib/db";
import { money, shortDate } from "@/lib/format";
import { QuoteActions } from "@/components/dashboard/QuoteActions";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

function whenSent(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export default async function QuoteDetailPage({ params }: { params: { id: string } }) {
  noStore();
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();
  const q = await getQuoteForPdf(id);
  if (!q) notFound();
  const [customer, emails] = await Promise.all([
    q.customer_id != null ? getCustomerDetails(q.customer_id) : Promise.resolve(null),
    getQuoteEmailLog(q.id),
  ]);
  const d = q.pdf;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/quotes" className="text-sm text-slate-500 hover:underline">
          ← Back to quotes
        </Link>
        <a
          href={`/api/quotes/${q.id}/pdf`}
          className="rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-dark"
        >
          Download PDF
        </a>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-slate-900">{d.customer_company || "Unknown customer"}</h1>
              <span className="rounded-full bg-brand-blue/10 px-2.5 py-0.5 text-xs font-semibold text-brand-blue">Quote</span>
            </div>
            <p className="text-slate-500">
              {d.customer_contact ? `${d.customer_contact} · ` : ""}
              {shortDate(q.quote_date)}
              {d.machine_label ? ` · ${d.machine_label}` : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Total quote</p>
            <p className="text-3xl font-extrabold text-brand-green-dark">{money(d.total)}</p>
          </div>
        </div>

        {d.work_summary && (
          <div className="mt-6">
            <h2 className="mb-1 font-bold text-slate-900">Summary of work</h2>
            <p className="whitespace-pre-wrap text-sm text-slate-700">{d.work_summary}</p>
          </div>
        )}
        {d.notes && (
          <div className="mt-6">
            <h2 className="mb-1 font-bold text-slate-900">Notes</h2>
            <p className="whitespace-pre-wrap text-sm text-slate-700">{d.notes}</p>
          </div>
        )}

        {d.line_items.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-2 font-bold text-slate-900">Estimated charges</h2>
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
                {d.line_items.map((li, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-2 font-medium">{li.description}</td>
                    <td className="py-2 text-right">{li.cost_per_hour != null ? money(li.cost_per_hour) : "—"}</td>
                    <td className="py-2 text-right">{li.qty ?? "—"}</td>
                    <td className="py-2 text-right font-semibold">{money(li.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 font-bold text-slate-900">Send this quote</h2>
        <p className="mb-4 text-sm text-slate-500">
          {customer?.email
            ? `Saved addresses for ${customer.company}: ${customer.email}`
            : "No email saved for this customer yet — you'll be asked for one."}
        </p>
        <QuoteActions
          quoteId={q.id}
          company={d.customer_company}
          savedEmail={customer?.email ?? null}
          hasCustomer={q.customer_id != null}
        />
        {emails.length > 0 && (
          <div className="mt-5">
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Sent from this quote</h3>
            <ul className="space-y-1 text-sm text-slate-600">
              {emails.map((e) => (
                <li key={e.id}>
                  <span className="font-medium text-slate-800">Quote sent</span> to {e.to_address} · {whenSent(e.sent_at)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
