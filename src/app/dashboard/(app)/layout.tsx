import Link from "next/link";
import { Logo } from "@/components/Logo";
import { NavLink } from "@/components/dashboard/NavLink";
import { LogoutButton } from "@/components/dashboard/LogoutButton";

export const metadata = {
  title: "JSW Solutions — Company Dashboard",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex">
        {/* Sidebar */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-brand-green-dark p-4 md:flex">
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-white/95 p-2">
            <Logo className="h-10 w-auto" />
            <span className="text-sm font-bold text-brand-green-dark">
              Company Data
            </span>
          </div>
          <nav className="flex-1 space-y-1">
            <NavLink href="/dashboard" label="Overview" exact />
            <NavLink href="/dashboard/invoices" label="Invoices" />
            <NavLink href="/dashboard/customers" label="Customers" />
            <NavLink href="/dashboard/machines" label="Machines" />
            <Link
              href="/dashboard/invoices/new"
              className="mt-3 block rounded-md bg-brand-orange px-3 py-2 text-center text-sm font-semibold text-white hover:bg-brand-orange-dark"
            >
              + New Invoice
            </Link>
          </nav>
          <div className="mt-4">
            <LogoutButton />
          </div>
        </aside>

        {/* Main content */}
        <main className="min-h-screen flex-1">
          {/* Mobile top bar */}
          <div className="flex items-center justify-between bg-brand-green-dark px-4 py-3 md:hidden">
            <div className="flex items-center gap-2 rounded bg-white/95 px-2 py-1">
              <Logo className="h-7 w-auto" />
            </div>
            <div className="flex gap-3 text-sm text-white">
              <Link href="/dashboard">Overview</Link>
              <Link href="/dashboard/invoices">Invoices</Link>
              <Link href="/dashboard/invoices/new" className="font-semibold text-brand-orange">
                + New
              </Link>
            </div>
          </div>
          <div className="mx-auto max-w-6xl p-4 md:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
