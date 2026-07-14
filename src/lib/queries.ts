import { sql } from "./db";
import { initSchema } from "./db";
import type { InvoiceFull, LineItem } from "./types";

// Small helper: everything comes back from Postgres as strings for NUMERIC.
const num = (v: unknown): number => (v == null ? 0 : Number(v));

export interface DashboardTotals {
  grossAllTime: number;
  grossThisYear: number;
  grossThisMonth: number;
  invoiceCount: number;
  customerCount: number;
  machineCount: number;
}

export async function getDashboardTotals(): Promise<DashboardTotals> {
  await initSchema();
  const r = await sql`
    SELECT
      COALESCE(SUM(total), 0) AS gross_all,
      COALESCE(SUM(total) FILTER (WHERE date_trunc('year', invoice_date) = date_trunc('year', now())), 0) AS gross_year,
      COALESCE(SUM(total) FILTER (WHERE date_trunc('month', invoice_date) = date_trunc('month', now())), 0) AS gross_month,
      COUNT(*) AS invoice_count
    FROM invoices;
  `;
  const c = await sql`SELECT COUNT(*) AS n FROM customers;`;
  const m = await sql`SELECT COUNT(*) AS n FROM machines;`;
  const row = r.rows[0];
  return {
    grossAllTime: num(row.gross_all),
    grossThisYear: num(row.gross_year),
    grossThisMonth: num(row.gross_month),
    invoiceCount: num(row.invoice_count),
    customerCount: num(c.rows[0].n),
    machineCount: num(m.rows[0].n),
  };
}

export interface MonthlyPoint {
  month: string; // yyyy-mm
  total: number;
}

export async function getMonthlyIncome(months = 24): Promise<MonthlyPoint[]> {
  await initSchema();
  const r = await sql`
    SELECT to_char(date_trunc('month', invoice_date), 'YYYY-MM') AS month,
           SUM(total) AS total
    FROM invoices
    WHERE invoice_date IS NOT NULL
    GROUP BY 1
    ORDER BY 1;
  `;
  return r.rows.slice(-months).map((row) => ({
    month: row.month as string,
    total: num(row.total),
  }));
}

export interface YearlyPoint {
  year: string;
  total: number;
  count: number;
}

export async function getYearlyIncome(): Promise<YearlyPoint[]> {
  await initSchema();
  const r = await sql`
    SELECT to_char(date_trunc('year', invoice_date), 'YYYY') AS year,
           SUM(total) AS total, COUNT(*) AS count
    FROM invoices
    WHERE invoice_date IS NOT NULL
    GROUP BY 1
    ORDER BY 1 DESC;
  `;
  return r.rows.map((row) => ({
    year: row.year as string,
    total: num(row.total),
    count: num(row.count),
  }));
}

export interface CustomerSummary {
  id: number;
  company: string;
  contact_name: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  invoice_count: number;
  total_billed: number;
  last_service: string | null;
}

export async function getCustomers(search = ""): Promise<CustomerSummary[]> {
  await initSchema();
  const like = `%${search.trim()}%`;
  const r = await sql`
    SELECT c.id, c.company, c.contact_name, c.city, c.state, c.phone,
           COUNT(i.id) AS invoice_count,
           COALESCE(SUM(i.total), 0) AS total_billed,
           to_char(MAX(i.invoice_date), 'YYYY-MM-DD') AS last_service
    FROM customers c
    LEFT JOIN invoices i ON i.customer_id = c.id
    WHERE (${search} = '' OR c.company ILIKE ${like} OR c.contact_name ILIKE ${like} OR c.city ILIKE ${like})
    GROUP BY c.id
    ORDER BY total_billed DESC, c.company ASC;
  `;
  return r.rows.map((row) => ({
    id: num(row.id),
    company: row.company as string,
    contact_name: row.contact_name as string | null,
    city: row.city as string | null,
    state: row.state as string | null,
    phone: row.phone as string | null,
    invoice_count: num(row.invoice_count),
    total_billed: num(row.total_billed),
    last_service: row.last_service as string | null,
  }));
}

export interface MachineSummary {
  id: number;
  machine_id: string;
  customer_company: string | null;
  service_count: number;
  total_billed: number;
  last_service: string | null;
}

export async function getMachines(search = ""): Promise<MachineSummary[]> {
  await initSchema();
  const like = `%${search.trim()}%`;
  const r = await sql`
    SELECT m.id, m.machine_id, c.company AS customer_company,
           COUNT(i.id) AS service_count,
           COALESCE(SUM(i.total), 0) AS total_billed,
           to_char(MAX(i.invoice_date), 'YYYY-MM-DD') AS last_service
    FROM machines m
    LEFT JOIN customers c ON c.id = m.customer_id
    LEFT JOIN invoices i ON i.machine_id = m.id
    WHERE (${search} = '' OR m.machine_id ILIKE ${like} OR c.company ILIKE ${like})
    GROUP BY m.id, c.company
    ORDER BY last_service DESC NULLS LAST, m.machine_id ASC;
  `;
  return r.rows.map((row) => ({
    id: num(row.id),
    machine_id: row.machine_id as string,
    customer_company: row.customer_company as string | null,
    service_count: num(row.service_count),
    total_billed: num(row.total_billed),
    last_service: row.last_service as string | null,
  }));
}

async function attachLineItems(invoiceId: number): Promise<LineItem[]> {
  const r = await sql`
    SELECT id, invoice_id, description, cost_per_hour, qty, line_total, sort_order
    FROM line_items WHERE invoice_id = ${invoiceId} ORDER BY sort_order ASC;
  `;
  return r.rows.map((row) => ({
    id: num(row.id),
    invoice_id: num(row.invoice_id),
    description: row.description as string,
    cost_per_hour: row.cost_per_hour == null ? null : num(row.cost_per_hour),
    qty: row.qty == null ? null : num(row.qty),
    line_total: num(row.line_total),
    sort_order: num(row.sort_order),
  }));
}

function mapInvoiceRow(row: Record<string, unknown>): Omit<InvoiceFull, "line_items"> {
  return {
    id: num(row.id),
    po_number: (row.po_number as string) ?? null,
    invoice_date: (row.invoice_date_str as string) ?? null,
    customer_id: row.customer_id == null ? null : num(row.customer_id),
    machine_id: row.machine_id == null ? null : num(row.machine_id),
    work_summary: (row.work_summary as string) ?? null,
    total: num(row.total),
    pdf_url: (row.pdf_url as string) ?? null,
    created_at: String(row.created_at),
    customer_company: (row.customer_company as string) ?? null,
    customer_contact: (row.customer_contact as string) ?? null,
    machine_label: (row.machine_label as string) ?? null,
  };
}

export interface InvoiceFilters {
  search?: string;
  customerId?: number;
  machineId?: number;
  limit?: number;
}

export async function getInvoices(f: InvoiceFilters = {}): Promise<InvoiceFull[]> {
  await initSchema();
  const search = f.search?.trim() ?? "";
  const like = `%${search}%`;
  const limit = f.limit ?? 500;
  const r = await sql`
    SELECT i.id, i.po_number, to_char(i.invoice_date, 'YYYY-MM-DD') AS invoice_date_str,
           i.customer_id, i.machine_id, i.work_summary, i.total, i.pdf_url, i.created_at,
           c.company AS customer_company, c.contact_name AS customer_contact,
           m.machine_id AS machine_label
    FROM invoices i
    LEFT JOIN customers c ON c.id = i.customer_id
    LEFT JOIN machines m ON m.id = i.machine_id
    WHERE (${search} = '' OR c.company ILIKE ${like} OR m.machine_id ILIKE ${like}
           OR i.po_number ILIKE ${like} OR i.work_summary ILIKE ${like})
      AND (${f.customerId ?? null}::int IS NULL OR i.customer_id = ${f.customerId ?? null})
      AND (${f.machineId ?? null}::int IS NULL OR i.machine_id = ${f.machineId ?? null})
    ORDER BY i.invoice_date DESC NULLS LAST, i.id DESC
    LIMIT ${limit};
  `;
  const invoices: InvoiceFull[] = [];
  for (const row of r.rows) {
    const base = mapInvoiceRow(row);
    invoices.push({ ...base, line_items: await attachLineItems(base.id) });
  }
  return invoices;
}

export async function getInvoiceById(id: number): Promise<InvoiceFull | null> {
  await initSchema();
  const r = await sql`
    SELECT i.id, i.po_number, to_char(i.invoice_date, 'YYYY-MM-DD') AS invoice_date_str,
           i.customer_id, i.machine_id, i.work_summary, i.total, i.pdf_url, i.created_at,
           c.company AS customer_company, c.contact_name AS customer_contact,
           m.machine_id AS machine_label
    FROM invoices i
    LEFT JOIN customers c ON c.id = i.customer_id
    LEFT JOIN machines m ON m.id = i.machine_id
    WHERE i.id = ${id} LIMIT 1;
  `;
  if (r.rows.length === 0) return null;
  const base = mapInvoiceRow(r.rows[0]);
  return { ...base, line_items: await attachLineItems(base.id) };
}
