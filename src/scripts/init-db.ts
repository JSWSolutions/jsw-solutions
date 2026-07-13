/**
 * Creates the database tables. Run once after connecting your Neon database:
 *   npm run db:init
 *
 * Requires POSTGRES_URL in .env.local (copy it from the Vercel dashboard).
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { initSchema } from "../lib/db";

async function main() {
  if (!process.env.POSTGRES_URL) {
    console.error(
      "\n✗ POSTGRES_URL is not set. Copy it from Vercel → Storage → your database → .env.local tab into your .env.local file, then try again.\n",
    );
    process.exit(1);
  }
  console.log("Creating tables…");
  await initSchema();
  console.log("✓ Database is ready.");
  process.exit(0);
}

main().catch((err) => {
  console.error("✗ Failed to initialize database:", err);
  process.exit(1);
});
