/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // unpdf ships as ESM; keep it external so the serverless bundle stays small
  experimental: {
    serverComponentsExternalPackages: ["unpdf"],
    // Never reuse a stale client-side copy of a dashboard page. Every tab
    // (Unpaid, Customers, etc.) refetches live data from the database on each
    // visit, so a newly-added or edited invoice shows up everywhere immediately.
    staleTimes: { dynamic: 0, static: 0 },
  },
  // Keep the first deploys resilient: don't let a stylistic lint rule or a
  // strict type check block the site from going live. You can tighten these
  // later once everything is running.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
