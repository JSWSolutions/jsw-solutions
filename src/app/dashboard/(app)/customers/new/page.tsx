import Link from "next/link";
import { CustomerForm } from "@/components/dashboard/CustomerForm";

export const dynamic = "force-dynamic";

export default function NewCustomerPage() {
  return (
    <div className="space-y-6">
      <Link href="/dashboard/customers" className="text-sm text-slate-500 hover:underline">
        ← Back to customers
      </Link>
      <h1 className="text-2xl font-extrabold text-slate-900">Add a customer</h1>
      <CustomerForm />
    </div>
  );
}
