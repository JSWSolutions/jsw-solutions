"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/Logo";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      const from = params.get("from") || "/dashboard";
      const dest = from.startsWith("/dashboard") ? from : "/dashboard";
      router.push(dest);
      router.refresh();
    } else {
      setError("Incorrect password. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-green-dark p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center">
          <Logo className="h-16 w-auto" />
          <h1 className="mt-3 text-lg font-bold text-brand-green-dark">
            Company Dashboard
          </h1>
          <p className="text-sm text-slate-500">Enter the shared password</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/30"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy || !password}
            className="w-full rounded-lg bg-brand-orange py-3 font-semibold text-white hover:bg-brand-orange-dark disabled:opacity-50"
          >
            {busy ? "Checking…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-brand-green-dark" />}>
      <LoginForm />
    </Suspense>
  );
}
