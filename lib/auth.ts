import "server-only";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const COOKIE = "devcalc_cms_session";
const HOURS = 12;

function secret() {
  const value = process.env.CMS_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("CMS_SESSION_SECRET must be at least 32 characters");
  return value;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export async function authenticated() {
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return false;
  const [expiry, nonce, mac] = value.split(".");
  if (!/^\d+$/.test(expiry) || !/^[a-f0-9]{32}$/.test(nonce) || !/^[a-f0-9]{64}$/.test(mac)) return false;
  if (Number(expiry) < Date.now()) return false;
  return timingSafeEqual(Buffer.from(mac, "hex"), Buffer.from(sign(`${expiry}.${nonce}`), "hex"));
}

export function createSessionValue() {
  const expiry = Date.now() + HOURS * 60 * 60 * 1000;
  const nonce = randomBytes(16).toString("hex");
  const value = `${expiry}.${nonce}.${sign(`${expiry}.${nonce}`)}`;
  return { value, expiry };
}

export function isSecureConnection(request?: Request): boolean {
  if (request) {
    const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    if (proto) return proto === "https";
    try {
      return new URL(request.url).protocol === "https:";
    } catch {
      // fallback
    }
  }
  return process.env.NODE_ENV === "production" && !process.env.CMS_ALLOW_INSECURE_HTTP;
}

export async function setSession(request?: Request) {
  const { value } = createSessionValue();
  const secure = isSecureConnection(request);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE, value, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: HOURS * 3600,
  });
  return value;
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export function passwordValid(password: string) {
  const configured = process.env.CMS_ADMIN_PASSWORD_HASH ?? "";
  const [algorithm, salt, expected] = configured.split("-");
  if (algorithm !== "scrypt" || !/^[a-f0-9]{32}$/.test(salt ?? "") || !/^[a-f0-9]{128}$/.test(expected ?? "")) {
    throw new Error("CMS_ADMIN_PASSWORD_HASH is not configured correctly");
  }
  const actual = scryptSync(password, Buffer.from(salt, "hex"), 64);
  return timingSafeEqual(actual, Buffer.from(expected, "hex"));
}

export async function sameOrigin(request: Request) {
  const host = request.headers.get("host");
  if (!host) return false;
  const origin = request.headers.get("origin");
  try {
    return Boolean(origin && new URL(origin).host.toLowerCase() === host.toLowerCase() && new URL(origin).protocol === new URL(request.url).protocol);
  } catch { return false; }
}
