# JSW Solutions Website + Company Dashboard — Setup Guide

This guide takes you from zero to a live website with a private, password‑protected
company dashboard. No coding required — you'll click through websites and copy/paste
a few values. Budget about **45–60 minutes** the first time.

You'll end up with:

- **Public site** (your info page) at **https://jswsolutions.org**
- **Private dashboard** (income, customers, machine history, invoices) at
  **https://dashboard.jswsolutions.org**, locked behind one shared password.

Everything uses free plans. You only need two free accounts: **GitHub** (stores the
code) and **Vercel** (runs the website + database).

---

## Part 1 — Put the code on GitHub

GitHub is where your website's code lives. Vercel reads it from there.

1. Go to **https://github.com** and click **Sign up**. Create a free account with
   your `jsawsolutions@gmail.com` email.
2. Once logged in, click the **+** in the top‑right → **New repository**.
3. Name it `jsw-solutions`. Leave it **Public** or **Private** (either is fine).
   Do **not** check "Add a README." Click **Create repository**.
4. On the next page, click the link **"uploading an existing file"** (in the line
   *"…or push an existing repository…"* there's an **uploading an existing file** link).
5. Unzip the `jsw-solutions.zip` I sent you. Open the unzipped folder, select **all
   the files and folders inside it** (not the outer folder itself), and **drag them
   into the browser** upload area.
   - Tip: make sure you include the hidden files. The important ones are the
     folders `src`, and the files `package.json`, `next.config.mjs`,
     `tailwind.config.ts`, `tsconfig.json`, `postcss.config.js`, and `.gitignore`.
6. Scroll down and click **Commit changes**. Your code is now on GitHub. ✅

---

## Part 2 — Deploy to Vercel (get it live on a temporary link first)

1. Go to **https://vercel.com** → **Sign Up** → choose **Continue with GitHub**
   (this links the two accounts automatically).
2. On your Vercel dashboard, click **Add New… → Project**.
3. Find `jsw-solutions` in the list of your GitHub repos and click **Import**.
4. Vercel will auto‑detect it as a **Next.js** app — you don't need to change any
   build settings.
5. **Before** clicking Deploy, open the **Environment Variables** section and add
   these three (we'll add the database ones in Part 3):

   | Name | Value |
   |------|-------|
   | `DASHBOARD_PASSWORD` | The shared password you want (pick something strong) |
   | `AUTH_SECRET` | Any long random string. Mash your keyboard for 40+ characters, or search "random password generator" and paste a long one |
   | `DASHBOARD_HOST` | `dashboard.jswsolutions.org` |

6. Click **Deploy**. Wait ~2 minutes. When it finishes you'll get a link like
   `https://jsw-solutions-xxxx.vercel.app`. Open it — you should see your public
   info page. 🎉

> The dashboard won't fully work yet because it needs a database. That's next.

---

## Part 3 — Add the database and file storage

This is where invoices, customers, and income numbers get stored.

1. In your Vercel project, click the **Storage** tab at the top.
2. Click **Create Database** → choose **Neon (Postgres)** → **Continue**, accept the
   defaults, and **Create**. When asked to connect it to your project, say **yes /
   Connect**. Vercel automatically adds the database connection to your app.
3. Back on the **Storage** tab, click **Create** again → choose **Blob** (this stores
   the uploaded PDF files) → **Create**, and connect it to the project too.
4. Now redeploy so the app picks up the new connections: go to the **Deployments**
   tab → click the **…** menu on the top deployment → **Redeploy** → **Redeploy**.

That's it — the database tables create themselves automatically the first time you
open the dashboard. You do **not** need to run any commands.

**Test it:** open your `…vercel.app` link and add `/dashboard` to the end
(e.g. `https://jsw-solutions-xxxx.vercel.app/dashboard`). You'll be asked for your
password. Enter the `DASHBOARD_PASSWORD` you chose. You should see the empty
dashboard. Try **+ New Invoice → upload the sample PDF** to confirm it reads and
saves correctly.

---

## Part 4 — Connect your domain (jswsolutions.org)

Your domain is currently at Wix. We'll point it to Vercel. Doing this replaces the
old Wix draft with your new site.

1. In your Vercel project, go to **Settings → Domains**.
2. Type `jswsolutions.org` and click **Add**. Then add `www.jswsolutions.org` and
   `dashboard.jswsolutions.org` the same way (three domains total).
3. Vercel will show you the DNS records to create. They'll look like:
   - For `jswsolutions.org` → an **A record** pointing to `76.76.21.21`
   - For `www` and `dashboard` → a **CNAME record** pointing to `cname.vercel-dns.com`
   (Use the exact values Vercel shows you — they're on that screen.)
4. In a new tab, log in to **Wix**, go to your domain's **DNS records / Manage DNS**
   settings, and add the records exactly as Vercel listed them.
5. Back in Vercel, wait for each domain to show a green **Valid Configuration**
   (DNS changes can take anywhere from a few minutes to a couple hours).

When it's done:
- **https://jswsolutions.org** → your public info page
- **https://dashboard.jswsolutions.org** → your private dashboard (asks for the password)

> Prefer not to touch DNS? You can keep using the free `…vercel.app` links instead —
> everything works the same, you just won't have your custom domain.

---

## Part 5 — Load your old invoices (2023 → today)

Two easy options:

**Option A — Send them to me.** Zip up all your invoice PDFs and send them over. I'll
run them through the reader in bulk and either load them straight in or hand you a
ready‑to‑paste file, plus a list of any that need a quick manual check.

**Option B — Do it yourself in the dashboard.** Open the dashboard → **+ New Invoice**
→ upload each PDF. It auto‑fills; you glance‑check and hit **Save**. Best for adding a
handful at a time (and this is exactly how you'll add new invoices going forward).

---

## Everyday use

- **Add an invoice:** dashboard → **+ New Invoice** → drag in the PDF → check the
  auto‑filled details → **Save**. Works on your phone too.
- **See income:** the **Overview** page shows this month, this year, all‑time, plus a
  monthly chart and a by‑year table.
- **Look up a customer or machine:** the **Customers** and **Machines** pages list
  totals and service history; click any name to see its invoices.
- **Change the password:** Vercel → your project → **Settings → Environment Variables**
  → edit `DASHBOARD_PASSWORD` → then **Redeploy**.

---

## If something looks wrong

- **Dashboard says "Server not configured":** you're missing `AUTH_SECRET` in Vercel's
  Environment Variables. Add it and redeploy.
- **A PDF didn't fill in perfectly:** just correct the fields on screen before saving.
  The reader is tuned to your invoice template but always lets you edit.
- **Anything else:** send me the Vercel build log or a screenshot and I'll sort it out.

---

*Built for JSW Solutions LLC — Saline, MI.*
