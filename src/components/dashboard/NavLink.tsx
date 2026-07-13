"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({
  href,
  label,
  exact = false,
}: {
  href: string;
  label: string;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={`block rounded-md px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-brand-orange text-white"
          : "text-white/80 hover:bg-white/10 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}
