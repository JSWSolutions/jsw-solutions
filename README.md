# JSW Solutions

Public marketing site + private company dashboard for JSW Solutions LLC
(industrial laser & CNC maintenance, Saline MI).

**New here? Read [`SETUP-GUIDE.md`](./SETUP-GUIDE.md)** for click‑by‑click deployment.

## Stack

- **Next.js 14** (App Router, TypeScript) + **Tailwind CSS**
- **Neon Postgres** (`@vercel/postgres`) for data
- **Vercel Blob** for stored invoice PDFs
- **unpdf** for reading invoice PDFs (server-side text extraction)
- One deployment serves two faces via `src/middleware.ts`:
  - the apex domain → public marketing site (`src/app/page.tsx`)
  - `dashboard.*` subdomain → the private app (`src/app/dashboard/**`), gated by a
    shared password (signed cookie).

## Structure

```
src/
  middleware.ts              Subdomain routing + password gate
  app/
    page.tsx                 Public info page
    layout.tsx               Root layout
    dashboard/
      login/page.tsx         Password screen
      (app)/                 Authenticated pages (sidebar layout)
        page.tsx             Overview: income KPIs + charts
        invoices/…           List, detail, and "new invoice" upload flow
        customers/page.tsx   Customers + totals
        machines/page.tsx    Machine service history
    api/
      auth/route.ts          Login / logout (sets the session cookie)
      parse/route.ts         Upload a PDF → parse → store in Blob
      invoices/route.ts      Create / list invoices
  lib/
    db.ts                    Schema + write helpers (auto-creates tables)
    queries.ts               Read + analytics queries
    parse-invoice.ts         JSW invoice-template PDF parser
    auth.ts                  Shared-password session tokens
    types.ts, format.ts
  scripts/
    init-db.ts               Optional: create tables manually (npm run db:init)
    import-invoices.ts       Bulk-import a folder of PDFs (npm run db:import -- ./folder)
```

## Environment variables

See `.env.example`. Required: `DASHBOARD_PASSWORD`, `AUTH_SECRET`, `DASHBOARD_HOST`,
plus the `POSTGRES_URL*` and `BLOB_READ_WRITE_TOKEN` values that Vercel fills in when
you attach the Neon database and Blob store.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in values (copy DB/Blob values from Vercel)
npm run db:init              # optional; tables also auto-create on first use
npm run dev                  # http://localhost:3000  (dashboard at /dashboard)
```

The database schema is created automatically on first query, so `db:init` is
optional. Tables: `customers`, `machines`, `invoices`, `line_items`.
