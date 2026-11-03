import { authenticated, sameOrigin } from "@/lib/auth";
import { deleteBlog, read, slugPattern, validateBlog, validateCalculator, validatePage, writeBlog, writeCalculator, writePage, type Kind } from "@/lib/content";
import { notifySite } from "@/lib/notify";

type Context = { params: Promise<{ kind: string; slug: string }> };
async function target(context: Context): Promise<{ kind: Kind; slug: string } | null> {
  const { kind, slug } = await context.params;
  return (kind === "blogs" || kind === "calculators" || kind === "pages") && slugPattern.test(slug) ? { kind, slug } : null;
}

export async function GET(_request: Request, context: Context) {
  if (!(await authenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const item = await target(context);
  if (!item) return Response.json({ error: "Not found" }, { status: 404 });
  try {
    const record = await read(item.kind, item.slug);
    return record ? Response.json({ item: record }, { headers: { "Cache-Control": "no-store" } }) : Response.json({ error: "Not found" }, { status: 404 });
  } catch (error) { console.error("CMS read failed", error); return Response.json({ error: "Database unavailable" }, { status: 503 }); }
}

export async function PUT(request: Request, context: Context) {
  if (!(await authenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await sameOrigin(request))) return Response.json({ error: "Invalid origin" }, { status: 403 });
  const item = await target(context);
  if (!item) return Response.json({ error: "Not found" }, { status: 404 });
  const input = await request.json().catch(() => null);
  if (!input || typeof input !== "object" || Array.isArray(input)) return Response.json({ error: "Invalid content" }, { status: 400 });
  try {
    if (item.kind === "blogs") await writeBlog(validateBlog(input), item.slug);
    else if (item.kind === "calculators") await writeCalculator(validateCalculator(input), item.slug, typeof input.updated_at === "string" ? input.updated_at : "");
    else await writePage(validatePage(input), item.slug);
    const warning = await notifySite(item.kind, item.slug);
    return Response.json({ ok: true, warning });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not save content" }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: Context) {
  if (!(await authenticated())) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await sameOrigin(request))) return Response.json({ error: "Invalid origin" }, { status: 403 });
  const item = await target(context);
  if (!item || item.kind !== "blogs") return Response.json({ error: "Not found" }, { status: 404 });
  try {
    if (!(await deleteBlog(item.slug))) return Response.json({ error: "Blog not found" }, { status: 404 });
    const warning = await notifySite("blogs", item.slug, "deleted");
    return Response.json({ ok: true, warning });
  } catch (error) {
    console.error("CMS blog deletion failed", error);
    return Response.json({ error: "Could not delete blog" }, { status: 500 });
  }
}
