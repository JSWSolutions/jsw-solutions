"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/dashboard/login");
    router.refresh();
  }
  return (
    <button
      onClick={logout}
      disabled={busy}
      className="w-full rounded-md border border-white/20 px-3 py-2 text-sm text-white/80 hover:bg-white/10 disabled:opacity-50"
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
