import "server-only";
import { createClient } from "@libsql/client";

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

let client: ReturnType<typeof createClient> | undefined;
export function db() {
  client ??= createClient({ url: required("TURSO_DATABASE_URL"), authToken: required("TURSO_AUTH_TOKEN") });
  return client;
}
