import { unstable_noStore as noStore } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomerDetails } from "@/lib/db";
import { CustomerForm } from "@/components/dashboard/CustomerForm";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default async function EditCustomerPage({
  params,
}: {
  params: { id: string };
}) {
  noStore();
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();
  const c = await getCustomerDetails(id);
  if (!c) notFound();

  return (
    <div className="space-y-6">
      <Link href="/dashboard/customers" className="text-sm text-slate-500 hover:underline">
        ← Back to customers
      </Link>
      <h1 className="text-2xl font-extrabold text-slate-900">Edit {c.company}</h1>
      <CustomerForm
        initial={{
          id: c.id,
          company: c.company,
          contact_name: c.contact_name ?? "",
          address: c.address ?? "",
          city: c.city ?? "",
          state: c.state ?? "",
          zip: c.zip ?? "",
          phone: c.phone ?? "",
          mileage_rate: c.mileage_rate == null ? "" : String(c.mileage_rate),
        }}
      />
    </div>
  );
}
