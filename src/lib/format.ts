// Formatting helpers safe to use in both server and client components.

export function money(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return v.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = /(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const [, y, mo, d] = m;
  return `${Number(mo)}/${Number(d)}/${y}`;
}

export function monthLabel(ym: string): string {
  const m = /(\d{4})-(\d{2})/.exec(ym);
  if (!m) return ym;
  const names = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${names[Number(m[2]) - 1]} ${m[1]}`;
}
