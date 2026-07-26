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

/**
 * How an invoice's dates should read on screen. Newer invoices carry a list of
 * the individual days worked; older ones carry a start–end range.
 */
export function invoiceDates(inv: {
  invoice_date: string | null;
  invoice_date_end: string | null;
  service_dates?: string[] | null;
}): string {
  const list = inv.service_dates;
  if (list && list.length > 0) {
    return list.map((d) => shortDate(d)).join(", ");
  }
  if (!inv.invoice_date) return "—";
  if (inv.invoice_date_end && inv.invoice_date_end !== inv.invoice_date) {
    return `${shortDate(inv.invoice_date)} – ${shortDate(inv.invoice_date_end)}`;
  }
  return shortDate(inv.invoice_date);
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
