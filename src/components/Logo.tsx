export function Logo({ className = "h-12 w-auto" }: { className?: string }) {
  // The real JSW logo (transparent PNG) lives in /public/logo.png.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.png" alt="JSW Solutions" className={className} />;
}
