import { authenticated } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await authenticated())) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;
  if (!/^[a-f0-9]{32}$/.test(id)) return new Response("Not found", { status: 404 });
  try {
    const result = await db().execute({ sql: "SELECT mime_type, bytes FROM cms_images WHERE id = ? LIMIT 1", args: [id] });
    const row = result.rows[0];
    if (!row || typeof row.mime_type !== "string") return new Response("Not found", { status: 404 });
    const storedBytes: unknown = row.bytes;
    const bytes = storedBytes instanceof ArrayBuffer ? storedBytes : storedBytes instanceof Uint8Array ? Uint8Array.from(storedBytes).buffer : null;
    if (!bytes) return new Response("Not found", { status: 404 });
    return new Response(bytes, { headers: { "Content-Type": row.mime_type, "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    console.error("CMS image preview failed", error);
    return new Response("Image unavailable", { status: 503 });
  }
}
