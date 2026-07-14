import { createPool } from "@vercel/postgres";

const connectionString =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL_NO_SSL;

const pool = createPool(
  connectionString ? { connectionString } : undefined,
);
export const sql = pool.sql;
import type { ParsedInvoice } from "./types";

/**
 * Creates all tables if they don't already exist. Safe to run repeatedly.
 * Called by the db:init script and lazily on first API use.
 */
export async function initSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS customers (
      id           SERIAL PRIMARY KEY,
      company      TEXT NOT NULL,
      contact_name TEXT,
      address      TEXT,
      city         TEXT,
      state        TEXT,
      zip          TEXT,
      phone        TEXT,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (company)
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS machines (
      id          SERIAL PRIMARY KEY,
      machine_id  TEXT NOT NULL,
      customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (machine_id)
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS invoices (
      id            SERIAL PRIMARY KEY,
      po_number     TEXT,
      invoice_date  DATE,
      customer_id   INTEGER REFERENCES customers(id) ON DELETE SET NULL,
      machine_id    INTEGER REFERENCES machines(id) ON DELETE SET NULL,
      work_summary  TEXT,
      total         NUMERIC(12,2) NOT NULL DEFAULT 0,
      pdf_url       TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS line_items (
      id            SERIAL PRIMARY KEY,
      invoice_id    INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      description   TEXT NOT NULL,
      cost_per_hour NUMERIC(12,2),
      qty           NUMERIC(12,2),
      line_total    NUMERIC(12,2) NOT NULL DEFAULT 0,
      sort_order    INTEGER NOT NULL DEFAULT 0
    );
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(customer_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_invoices_machine ON invoices(machine_id);`;
}

/** Finds a customer by company name (case-insensitive) or creates one. */
export async function upsertCustomer(p: {
  company: string;
  contact_name?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  phone?: string | null;
}): Promise<number> {
  const company = p.company.trim();
  const existing = await sql`
    SELECT id FROM customers WHERE lower(company) = lower(${company}) LIMIT 1;
  `;
  if (existing.rows.length > 0) {
    const id = existing.rows[0].id as number;
    // Backfill any missing contact details from the new invoice.
    await sql`
      UPDATE customers SET
        contact_name = COALESCE(contact_name, ${p.contact_name ?? null}),
        address      = COALESCE(address,      ${p.address ?? null}),
        city         = COALESCE(city,         ${p.city ?? null}),
        state        = COALESCE(state,        ${p.state ?? null}),
        zip          = COALESCE(zip,          ${p.zip ?? null}),
        phone        = COALESCE(phone,        ${p.phone ?? null})
      WHERE id = ${id};
    `;
    return id;
  }
  const inserted = await sql`
    INSERT INTO customers (company, contact_name, address, city, state, zip, phone)
    VALUES (${company}, ${p.contact_name ?? null}, ${p.address ?? null},
            ${p.city ?? null}, ${p.state ?? null}, ${p.zip ?? null}, ${p.phone ?? null})
    RETURNING id;
  `;
  return inserted.rows[0].id as number;
}

/** Finds a machine by its label or creates one, linking it to a customer. */
export async function upsertMachine(
  machineId: string,
  customerId: number | null,
): Promise<number> {
  const label = machineId.trim();
  const existing = await sql`
    SELECT id FROM machines WHERE lower(machine_id) = lower(${label}) LIMIT 1;
  `;
  if (existing.rows.length > 0) {
    const id = existing.rows[0].id as number;
    if (customerId) {
      await sql`UPDATE machines SET customer_id = COALESCE(customer_id, ${customerId}) WHERE id = ${id};`;
    }
    return id;
  }
  const inserted = await sql`
    INSERT INTO machines (machine_id, customer_id)
    VALUES (${label}, ${customerId})
    RETURNING id;
  `;
  return inserted.rows[0].id as number;
}

/**
 * Saves a parsed/entered invoice: upserts the customer + machine, inserts the
 * invoice row and its line items. Returns the new invoice id.
 */
export async function saveInvoice(
  data: ParsedInvoice,
  pdfUrl: string | null,
): Promise<number> {
  await initSchema();

  let customerId: number | null = null;
  if (data.customer_company && data.customer_company.trim()) {
    customerId = await upsertCustomer({
      company: data.customer_company,
      contact_name: data.customer_contact,
      address: data.customer_address,
      city: data.customer_city,
      state: data.customer_state,
      zip: data.customer_zip,
      phone: data.customer_phone,
    });
  }

  let machineId: number | null = null;
  if (data.machine_id && data.machine_id.trim()) {
    machineId = await upsertMachine(data.machine_id, customerId);
  }

  const invoice = await sql`
    INSERT INTO invoices (po_number, invoice_date, customer_id, machine_id, work_summary, total, pdf_url)
    VALUES (${data.po_number}, ${data.invoice_date}, ${customerId}, ${machineId},
            ${data.work_summary}, ${data.total}, ${pdfUrl})
    RETURNING id;
  `;
  const invoiceId = invoice.rows[0].id as number;

  for (let i = 0; i < data.line_items.length; i++) {
    const li = data.line_items[i];
    await sql`
      INSERT INTO line_items (invoice_id, description, cost_per_hour, qty, line_total, sort_order)
      VALUES (${invoiceId}, ${li.description}, ${li.cost_per_hour}, ${li.qty}, ${li.line_total}, ${i});
    `;
  }

  return invoiceId;
}
