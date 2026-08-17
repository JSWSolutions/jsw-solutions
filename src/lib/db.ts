import { sql } from "@vercel/postgres";
import type { ParsedInvoice } from "./types";

// @vercel/postgres's `sql` automatically uses the POSTGRES_URL environment
// variable (a pooled connection) that Vercel's Neon integration provides.
// We re-export it so the rest of the app imports the database from one place.
export { sql };

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

  // --- migrations for existing databases (safe to run repeatedly) ---
  await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_date_end DATE;`;
  await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid BOOLEAN NOT NULL DEFAULT false;`;
  await sql`ALTER TABLE customers ADD COLUMN IF NOT EXISTS mileage_rate NUMERIC(10,3);`;
  // Payment details, filled in when an invoice is marked paid.
  await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_date DATE;`;
  await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS check_number TEXT;`;
  // Set when a customer pays through the public /pay page via Stripe. NULL
  // means it was marked paid by hand (a check, cash, or otherwise).
  await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method TEXT;`;
  // The Stripe Checkout session that paid this invoice, if any — lets the
  // webhook safely replay without double-processing.
  await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;`;
  // Up to 5 individual visit dates. NULL on older invoices, which keep using
  // invoice_date / invoice_date_end as a range.
  await sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS service_dates DATE[];`;

  await sql`
    CREATE TABLE IF NOT EXISTS mileage (
      id            SERIAL PRIMARY KEY,
      entry_date    DATE,
      customer_name TEXT,
      miles         NUMERIC(10,1) NOT NULL DEFAULT 0,
      reason        TEXT NOT NULL DEFAULT 'SERVICE',
      source        TEXT NOT NULL DEFAULT 'manual',
      invoice_id    INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `;
  // One auto mileage entry per customer per date (a single trip may cover many machines).
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_mileage_auto ON mileage(customer_name, entry_date) WHERE source = 'auto';`;
  await sql`CREATE INDEX IF NOT EXISTS idx_mileage_date ON mileage(entry_date);`;
}

/**
 * Recomputes the auto mileage for one customer + date.
 *
 * Every line type has its own unit — SERVICE/TRAVEL are hours, PER DIEM is
 * days, and MILES is actual miles. So when an invoice carries a MILES line,
 * its quantity IS the day's mileage and we use it directly. Only invoices
 * without a MILES quantity fall back to the old estimate of billed TRAVEL
 * hours × the customer's per-hour mileage rate.
 *
 * One entry per customer per date. Independent of paid status.
 */
export async function recomputeAutoMileage(
  company: string,
  date: string,
): Promise<void> {
  const c = await sql`
    SELECT id, mileage_rate FROM customers WHERE lower(company) = lower(${company}) LIMIT 1;
  `;
  if (c.rows.length === 0) return;
  const custId = c.rows[0].id as number;
  // Without a rate the travel-hours fallback contributes nothing, but a real
  // MILES quantity still gets logged — miles are miles.
  const rate = c.rows[0].mileage_rate == null ? 0 : Number(c.rows[0].mileage_rate);

  // An invoice can cover several separate visit dates. Its miles are shared
  // evenly across those dates, so each day gets its own trip and the total
  // still adds up to the whole invoice's mileage.
  //
  // A TRAVEL line only counts when it was really billed (hours and money on
  // it). A MILES line counts whenever it has a quantity — driven miles belong
  // in the log even when they weren't charged for.
  const tr = await sql`
    SELECT COALESCE(SUM(
             CASE WHEN t.miles_qty > 0 THEN t.miles_qty
                  ELSE t.travel * ${rate}
             END / t.ndates
           ), 0) AS miles
    FROM (
      SELECT i.id,
             COALESCE(SUM(li.qty) FILTER (
               WHERE upper(li.description) = 'MILES'
                 AND COALESCE(li.qty, 0) > 0
             ), 0) AS miles_qty,
             COALESCE(SUM(li.qty) FILTER (
               WHERE upper(li.description) = 'TRAVEL'
                 AND COALESCE(li.qty, 0) > 0
                 AND COALESCE(li.line_total, 0) > 0
             ), 0) AS travel,
             GREATEST(COALESCE(array_length(i.service_dates, 1), 1), 1) AS ndates
      FROM invoices i JOIN line_items li ON li.invoice_id = i.id
      WHERE i.customer_id = ${custId}
        AND (
          (i.service_dates IS NOT NULL AND ${date}::date = ANY (i.service_dates))
          OR (i.service_dates IS NULL AND i.invoice_date = ${date}::date)
        )
      GROUP BY i.id
    ) t;
  `;
  const miles = Math.round((Number(tr.rows[0].miles) || 0) * 10) / 10;
  if (miles <= 0) {
    // No travel billed that day anymore (e.g. the invoice was deleted) — remove
    // any auto row we previously created so the mileage log stays accurate.
    await sql`
      DELETE FROM mileage
      WHERE source = 'auto' AND entry_date = ${date}
        AND lower(customer_name) = lower(${company});
    `;
    return;
  }

  const rr = await sql`
    SELECT upper(li.description) AS d
    FROM line_items li JOIN invoices i ON i.id = li.invoice_id
    WHERE i.customer_id = ${custId}
      AND (
        (i.service_dates IS NOT NULL AND ${date}::date = ANY (i.service_dates))
        OR (i.service_dates IS NULL AND i.invoice_date = ${date}::date)
      )
      AND upper(li.description) NOT IN ('TRAVEL', 'PARTS', 'MILES', 'PER DIEM')
    LIMIT 1;
  `;
  const reason = (rr.rows[0]?.d as string) || "SERVICE";

  await sql`
    INSERT INTO mileage (entry_date, customer_name, miles, reason, source)
    VALUES (${date}, ${company}, ${miles}, ${reason}, 'auto')
    ON CONFLICT (customer_name, entry_date) WHERE source = 'auto'
      DO UPDATE SET miles = EXCLUDED.miles, reason = EXCLUDED.reason;
  `;
}

/**
 * Rebuilds the ENTIRE auto mileage log from the invoices — every customer,
 * every service date. Manual entries are never touched. Used by the
 * "Recalculate from invoices" button after the mileage rules change.
 */
export async function recomputeAllAutoMileage(): Promise<number> {
  await initSchema();
  const pairs = await sql`
    SELECT DISTINCT c.company, to_char(d, 'YYYY-MM-DD') AS d
    FROM invoices i
    JOIN customers c ON c.id = i.customer_id,
         LATERAL unnest(COALESCE(i.service_dates, ARRAY[i.invoice_date])) AS d
    WHERE d IS NOT NULL;
  `;
  for (const row of pairs.rows) {
    await recomputeAutoMileage(row.company as string, row.d as string);
  }
  return pairs.rows.length;
}

/** Sets a customer's per-hour mileage rate and backfills their auto mileage.
 *  Creates the customer row if it doesn't exist yet (lets you set a rate for a
 *  brand-new customer directly, before their first invoice). */
export async function setCustomerRate(company: string, rate: number | null): Promise<void> {
  await initSchema();
  const name = company.trim();
  const existing = await sql`SELECT id FROM customers WHERE lower(company) = lower(${name}) LIMIT 1;`;
  if (existing.rows.length === 0) {
    await sql`INSERT INTO customers (company, mileage_rate) VALUES (${name}, ${rate});`;
  } else {
    await sql`UPDATE customers SET mileage_rate = ${rate} WHERE id = ${existing.rows[0].id};`;
  }
  if (rate == null) return;
  const dates = await sql`
    SELECT DISTINCT to_char(d, 'YYYY-MM-DD') AS d
    FROM invoices i JOIN customers c ON c.id = i.customer_id,
         LATERAL unnest(COALESCE(i.service_dates, ARRAY[i.invoice_date])) AS d
    WHERE lower(c.company) = lower(${company}) AND d IS NOT NULL;
  `;
  for (const row of dates.rows) {
    await recomputeAutoMileage(company, row.d as string);
  }
}

/**
 * Flips an invoice's paid status. When marking paid we also record when it was
 * paid (defaults to today) and the check number if there was one. Marking it
 * back to unpaid clears both, so stale payment details never linger.
 */
export async function setInvoicePaid(
  id: number,
  paid: boolean,
  details: {
    paid_date?: string | null;
    check_number?: string | null;
    payment_method?: string | null;
  } = {},
): Promise<void> {
  await initSchema();
  if (!paid) {
    await sql`
      UPDATE invoices SET paid = false, paid_date = NULL, check_number = NULL,
             payment_method = NULL, stripe_session_id = NULL
      WHERE id = ${id};
    `;
    return;
  }
  const when = details.paid_date?.trim() ? details.paid_date.trim() : null;
  const check = details.check_number?.trim() ? details.check_number.trim() : null;
  const method = details.payment_method?.trim() ? details.payment_method.trim() : null;
  await sql`
    UPDATE invoices
       SET paid = true,
           paid_date = COALESCE(${when}::date, CURRENT_DATE),
           check_number = ${check},
           payment_method = ${method}
     WHERE id = ${id};
  `;
}

/**
 * Finds unpaid invoices matching a PO number and the customer's ZIP on file.
 * Used by the public "Pay my invoice" page — the ZIP acts as a second factor
 * so a stranger can't browse PO numbers to see who owes what. Returns every
 * match (there can be more than one if the same PO covers multiple invoices).
 */
export async function findPayableInvoices(
  poNumber: string,
  zip: string,
): Promise<
  {
    id: number;
    po_number: string | null;
    company: string;
    total: number;
    invoice_date: string | null;
  }[]
> {
  await initSchema();
  const po = poNumber.trim();
  const z = zip.trim();
  if (!po || !z) return [];
  const r = await sql`
    SELECT i.id, i.po_number, c.company, i.total,
           to_char(i.invoice_date, 'YYYY-MM-DD') AS invoice_date_str
    FROM invoices i
    JOIN customers c ON c.id = i.customer_id
    WHERE i.paid = false
      AND lower(trim(i.po_number)) = lower(trim(${po}))
      AND c.zip IS NOT NULL
      AND lower(trim(c.zip)) = lower(trim(${z}))
    ORDER BY i.invoice_date DESC NULLS LAST, i.id DESC;
  `;
  return r.rows.map((row) => ({
    id: Number(row.id),
    po_number: (row.po_number as string) ?? null,
    company: row.company as string,
    total: Number(row.total),
    invoice_date: (row.invoice_date_str as string) ?? null,
  }));
}

/**
 * Re-validates a specific invoice against PO + ZIP right before creating a
 * Stripe session, so a tampered invoice id can't be used to pay someone
 * else's bill (or the wrong amount).
 */
export async function getPayableInvoice(invoiceId: number, poNumber: string, zip: string) {
  const rows = await findPayableInvoices(poNumber, zip);
  return rows.find((r) => r.id === invoiceId) ?? null;
}

/**
 * Marks an invoice paid from a completed Stripe Checkout session. Idempotent:
 * replaying the same session id (Stripe retries webhooks) is a no-op the
 * second time, and it never overwrites a payment already recorded under a
 * different session.
 */
export async function markInvoicePaidFromStripe(
  invoiceId: number,
  sessionId: string,
): Promise<void> {
  await initSchema();
  await sql`
    UPDATE invoices
       SET paid = true,
           paid_date = COALESCE(paid_date, CURRENT_DATE),
           payment_method = 'card',
           stripe_session_id = ${sessionId}
     WHERE id = ${invoiceId}
       AND (stripe_session_id IS NULL OR stripe_session_id = ${sessionId});
  `;
}

/** Every calendar date an invoice covers: its chosen visit dates, or its single date. */
async function datesForInvoice(id: number): Promise<string[]> {
  const r = await sql`
    SELECT to_char(d, 'YYYY-MM-DD') AS d
    FROM invoices i,
         LATERAL unnest(COALESCE(i.service_dates, ARRAY[i.invoice_date])) AS d
    WHERE i.id = ${id} AND d IS NOT NULL;
  `;
  return r.rows.map((row) => row.d as string);
}

/**
 * Deletes an invoice and its line items, then recomputes that customer/date's
 * auto mileage so the mileage log reflects the removal. Returns false if the
 * invoice didn't exist.
 */
export async function deleteInvoice(id: number): Promise<boolean> {
  await initSchema();
  // Grab the customer + every date it covers first, so we can fix mileage after.
  const info = await sql`
    SELECT c.company AS company, i.customer_id, i.machine_id
    FROM invoices i LEFT JOIN customers c ON c.id = i.customer_id
    WHERE i.id = ${id} LIMIT 1;
  `;
  if (info.rows.length === 0) return false;
  const company = info.rows[0].company as string | null;
  const customerId = info.rows[0].customer_id as number | null;
  const machineId = info.rows[0].machine_id as number | null;
  const dates = await datesForInvoice(id);

  // line_items cascade on delete; mileage.invoice_id is set null automatically.
  await sql`DELETE FROM invoices WHERE id = ${id};`;

  // Recompute each affected day (removes/reduces the trip if travel changed).
  if (company) {
    for (const d of dates) {
      await recomputeAutoMileage(company.trim(), d);
    }
  }

  // Tidy up behind the deletion: a machine or customer that was only ever on
  // this invoice (a typo or a test entry) shouldn't linger in the lists.
  if (machineId != null || customerId != null) {
    await sql`
      DELETE FROM machines m
      WHERE (m.id = ${machineId}::int OR m.customer_id = ${customerId}::int)
        AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.machine_id = m.id);
    `;
  }
  if (customerId != null) {
    // Their auto mileage goes too — it was only ever generated from invoices.
    // Anything typed by hand into the mileage log is left alone.
    await sql`
      DELETE FROM mileage
      WHERE source = 'auto'
        AND lower(customer_name) = lower((SELECT company FROM customers WHERE id = ${customerId}))
        AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.customer_id = ${customerId});
    `;
    await sql`
      DELETE FROM customers c
      WHERE c.id = ${customerId}
        AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.customer_id = c.id);
    `;
  }
  return true;
}

/** Adds a manual mileage entry (for non-invoice business driving). */
export async function addManualMileage(entry: {
  entry_date: string | null;
  customer_name: string | null;
  miles: number;
  reason?: string | null;
}): Promise<number> {
  await initSchema();
  const r = await sql`
    INSERT INTO mileage (entry_date, customer_name, miles, reason, source)
    VALUES (${entry.entry_date}, ${entry.customer_name}, ${entry.miles},
            ${entry.reason || "SERVICE"}, 'manual')
    RETURNING id;
  `;
  return r.rows[0].id as number;
}

// ---- customer management (the Customers page and invoice-form dropdowns) ---

export interface CustomerDetails {
  id: number;
  company: string;
  contact_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  phone: string | null;
  mileage_rate: number | null;
}

function rowToCustomer(row: Record<string, unknown>): CustomerDetails {
  return {
    id: Number(row.id),
    company: row.company as string,
    contact_name: (row.contact_name as string) ?? null,
    address: (row.address as string) ?? null,
    city: (row.city as string) ?? null,
    state: (row.state as string) ?? null,
    zip: (row.zip as string) ?? null,
    phone: (row.phone as string) ?? null,
    mileage_rate: row.mileage_rate == null ? null : Number(row.mileage_rate),
  };
}

export async function listCustomerDetails(): Promise<CustomerDetails[]> {
  await initSchema();
  const r = await sql`
    SELECT id, company, contact_name, address, city, state, zip, phone, mileage_rate
    FROM customers ORDER BY company ASC;
  `;
  return r.rows.map(rowToCustomer);
}

export async function getCustomerDetails(id: number): Promise<CustomerDetails | null> {
  await initSchema();
  const r = await sql`
    SELECT id, company, contact_name, address, city, state, zip, phone, mileage_rate
    FROM customers WHERE id = ${id} LIMIT 1;
  `;
  return r.rows.length ? rowToCustomer(r.rows[0]) : null;
}

/** Creates a customer outright; returns null if the company name is taken. */
export async function createCustomer(p: {
  company: string;
  contact_name?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  phone?: string | null;
  mileage_rate?: number | null;
}): Promise<CustomerDetails | null> {
  await initSchema();
  const company = p.company.trim();
  const dup = await sql`
    SELECT id FROM customers WHERE lower(company) = lower(${company}) LIMIT 1;
  `;
  if (dup.rows.length > 0) return null;
  const r = await sql`
    INSERT INTO customers (company, contact_name, address, city, state, zip, phone, mileage_rate)
    VALUES (${company}, ${p.contact_name ?? null}, ${p.address ?? null}, ${p.city ?? null},
            ${p.state ?? null}, ${p.zip ?? null}, ${p.phone ?? null}, ${p.mileage_rate ?? null})
    RETURNING id, company, contact_name, address, city, state, zip, phone, mileage_rate;
  `;
  return rowToCustomer(r.rows[0]);
}

/**
 * Updates a customer's details. Renaming a company also renames its mileage
 * log entries, which are keyed by company name.
 */
export async function updateCustomer(
  id: number,
  p: {
    company: string;
    contact_name: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    phone: string | null;
    mileage_rate: number | null;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  await initSchema();
  const company = p.company.trim();
  if (!company) return { ok: false, error: "Company name can't be empty." };
  const current = await sql`SELECT company FROM customers WHERE id = ${id} LIMIT 1;`;
  if (current.rows.length === 0) return { ok: false, error: "Customer not found." };
  const oldName = current.rows[0].company as string;

  const dup = await sql`
    SELECT id FROM customers
    WHERE lower(company) = lower(${company}) AND id <> ${id} LIMIT 1;
  `;
  if (dup.rows.length > 0) {
    return { ok: false, error: "Another customer already uses that company name." };
  }

  await sql`
    UPDATE customers SET
      company = ${company},
      contact_name = ${p.contact_name},
      address = ${p.address},
      city = ${p.city},
      state = ${p.state},
      zip = ${p.zip},
      phone = ${p.phone},
      -- The rate isn't edited anywhere anymore (MILES lines drive mileage now),
      -- but old rates stay put — they're still the fallback for old invoices
      -- that never had a MILES line.
      mileage_rate = COALESCE(${p.mileage_rate}::numeric, mileage_rate)
    WHERE id = ${id};
  `;
  if (oldName !== company) {
    // Mileage rows are linked by company name; keep them attached.
    await sql`UPDATE mileage SET customer_name = ${company} WHERE customer_name = ${oldName};`;
  }
  return { ok: true };
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
  opts: { paid?: boolean; paid_date?: string | null; check_number?: string | null } = {},
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

  const paid = opts.paid ?? false; // new invoices start Unpaid

  // Up to 5 individual visit dates. Stored as a CSV string and split in SQL so
  // we don't depend on the driver's array handling. The earliest date is also
  // kept in invoice_date, which is what every list and sort already uses.
  const chosen = (data.service_dates ?? [])
    .map((d) => (d || "").trim())
    .filter(Boolean)
    .sort()
    .slice(0, 5);
  const uniqueDates = Array.from(new Set(chosen));
  const datesCsv = uniqueDates.length > 0 ? uniqueDates.join(",") : null;
  const primaryDate = uniqueDates[0] ?? data.invoice_date ?? null;
  // A multi-date invoice has no range; a single-date one keeps the old behaviour.
  const endDate = uniqueDates.length > 0 ? null : data.invoice_date_end ?? null;

  const paidDate = opts.paid_date?.trim() ? opts.paid_date.trim() : null;
  const checkNumber = opts.check_number?.trim() ? opts.check_number.trim() : null;

  const invoice = await sql`
    INSERT INTO invoices (po_number, invoice_date, invoice_date_end, service_dates,
                          customer_id, machine_id, work_summary, total, paid,
                          paid_date, check_number, pdf_url)
    VALUES (${data.po_number}, ${primaryDate}, ${endDate},
            string_to_array(${datesCsv}::text, ',')::date[],
            ${customerId}, ${machineId}, ${data.work_summary}, ${data.total}, ${paid},
            CASE WHEN ${paid}::boolean THEN COALESCE(${paidDate}::date, CURRENT_DATE) END,
            CASE WHEN ${paid}::boolean THEN ${checkNumber}::text END,
            ${pdfUrl})
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

  // Auto-log mileage (one trip per customer per date). Independent of paid status.
  if (data.customer_company && data.customer_company.trim()) {
    for (const d of await datesForInvoice(invoiceId)) {
      await recomputeAutoMileage(data.customer_company.trim(), d);
    }
  }

  return invoiceId;
}
