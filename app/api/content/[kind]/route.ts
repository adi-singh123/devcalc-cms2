import { authenticated, sameOrigin } from "@/lib/auth";
import { list, validateBlog, writeBlog, type Kind } from "@/lib/content";
import { notifySite } from "@/lib/notify";

type Context = { params: Promise<{ kind: string }> };
function kind(value: string): Kind | null { return value === "blogs" || value === "calculators" || value === "pages" ? value : null; }

export async function GET(_request: Request, context: Context) {
  if (!(await authenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const type = kind((await context.params).kind);
  if (!type) return Response.json({ error: "Not found" }, { status: 404 });
  try { return Response.json({ items: await list(type) }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { console.error("CMS list failed", error); return Response.json({ error: "Database unavailable" }, { status: 503 }); }
}

export async function POST(request: Request, context: Context) {
  if (!(await authenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await sameOrigin(request))) return Response.json({ error: "Invalid origin" }, { status: 403 });
  if ((await context.params).kind !== "blogs") return Response.json({ error: "Only blogs can be created here" }, { status: 400 });
  const input = await request.json().catch(() => null);
  if (!input || typeof input !== "object" || Array.isArray(input)) return Response.json({ error: "Invalid article" }, { status: 400 });
  try {
    const record = validateBlog(input);
    await writeBlog(record);
    const warning = await notifySite("blogs", record.slug);
    return Response.json({ ok: true, slug: record.slug, warning });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save article";
    return Response.json({ error: message }, { status: /UNIQUE constraint/.test(message) ? 409 : 400 });
  }
}
