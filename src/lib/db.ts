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
 * Recomputes the auto mileage for one customer + date: miles = (sum of that
 * day's billed TRAVEL hours across all machines) × the customer's per-hour rate.
 * One entry per customer per date. Independent of paid status.
 */
export async function recomputeAutoMileage(
  company: string,
  date: string,
): Promise<void> {
  const c = await sql`
    SELECT id, mileage_rate FROM customers WHERE lower(company) = lower(${company}) LIMIT 1;
  `;
  const rate = c.rows[0]?.mileage_rate;
  if (rate == null) return; // no rate configured yet
  const custId = c.rows[0].id as number;

  // An invoice can cover several separate visit dates. Its billed TRAVEL hours
  // are shared evenly across those dates, so each day gets its own trip and the
  // total miles still equal (all travel hours × rate).
  //
  // A TRAVEL line only counts when it was really billed: it needs both hours and
  // money on it. A zero-dollar or zero-hour travel line logs no miles.
  const tr = await sql`
    SELECT COALESCE(SUM(t.travel / t.ndates), 0) AS travel
    FROM (
      SELECT i.id,
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
  const travel = Number(tr.rows[0].travel) || 0;
  const miles = Math.round(travel * Number(rate) * 10) / 10;
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
      AND upper(li.description) NOT IN ('TRAVEL', 'PARTS')
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
  details: { paid_date?: string | null; check_number?: string | null } = {},
): Promise<void> {
  await initSchema();
  if (!paid) {
    await sql`
      UPDATE invoices SET paid = false, paid_date = NULL, check_number = NULL
      WHERE id = ${id};
    `;
    return;
  }
  const when = details.paid_date?.trim() ? details.paid_date.trim() : null;
  const check = details.check_number?.trim() ? details.check_number.trim() : null;
  await sql`
    UPDATE invoices
       SET paid = true,
           paid_date = COALESCE(${when}::date, CURRENT_DATE),
           check_number = ${check}
     WHERE id = ${id};
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
