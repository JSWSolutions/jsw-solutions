import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function PaySuccessPage() {
  return (
    <div className="min-h-screen bg-sand text-ink">
      <header className="border-b border-black/5 bg-sand/90">
        <div className="container-page flex items-center justify-between py-3">
          <Link href="/" className="flex items-center gap-3">
            <Logo className="h-14 w-auto" />
          </Link>
        </div>
      </header>

      <section className="container-page max-w-xl py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-green text-3xl text-white">
          ✓
        </div>
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight">Payment Received</h1>
        <p className="mt-3 text-ink/80">
          Thank you! Your card payment went through and your invoice has been marked paid.
          A confirmation was sent to the email you provided at checkout.
        </p>
        <p className="mt-6 text-sm text-ink/60">
          Questions about your payment? Email{" "}
          <a className="text-brand-green-dark underline" href="mailto:jsawsolutions@gmail.com">
            jsawsolutions@gmail.com
          </a>{" "}
          or call 734-320-6348.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-lg bg-brand-orange px-6 py-3 font-semibold text-white hover:bg-brand-orange-dark"
        >
          Back to jswsolutions.org
        </Link>
      </section>
    </div>
  );
}
