// Shared-password authentication for the private dashboard.
// A signed, expiring cookie proves the visitor entered the correct password.
// Uses the Web Crypto API so it works in both the Edge middleware and Node
// route handlers.

export const AUTH_COOKIE = "jsw_auth";
const SESSION_DAYS = 30;

const encoder = new TextEncoder();

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return bytesToBase64Url(new Uint8Array(sig));
}

/** Constant-time-ish string comparison to avoid trivial timing leaks. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Creates a signed session token that expires in SESSION_DAYS days. */
export async function createSessionToken(secret: string): Promise<string> {
  const expiry = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = String(expiry);
  const sig = await hmac(secret, payload);
  return `${payload}.${sig}`;
}

/** Verifies a session token's signature and expiry. */
export async function verifySessionToken(
  token: string | undefined,
  secret: string,
): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot < 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmac(secret, payload);
  if (!safeEqual(sig, expected)) return false;
  const expiry = Number(payload);
  if (!Number.isFinite(expiry) || Date.now() > expiry) return false;
  return true;
}

/** Checks a submitted password against the configured DASHBOARD_PASSWORD. */
export function checkPassword(submitted: string): boolean {
  const real = process.env.DASHBOARD_PASSWORD || "";
  if (!real) return false;
  return safeEqual(submitted, real);
}

export function cookieMaxAgeSeconds(): number {
  return SESSION_DAYS * 24 * 60 * 60;
}
