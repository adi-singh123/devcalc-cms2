import "server-only";

export async function notifySite(kind: "blogs" | "calculators" | "pages", slug: string, action: "saved" | "deleted" = "saved"): Promise<string | null> {
  const completed = action === "deleted" ? "Deleted" : "Saved";
  const secret = process.env.CMS_REVALIDATE_SECRET;
  const base = process.env.CMS_SITE_URL;
  if (!secret || !base) return `${completed}. Configure CMS_SITE_URL and CMS_REVALIDATE_SECRET for immediate site refresh; existing ISR still updates automatically.`;
  try {
    const target = new URL("/api/cms-revalidate", base);
    if (target.protocol !== "https:" && target.hostname !== "localhost") throw new Error("CMS_SITE_URL must use HTTPS");
    const response = await fetch(target, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` }, body: JSON.stringify({ kind, slug }), cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`Site returned ${response.status}`);
    return null;
  } catch (error) {
    console.error("DevCalc cache refresh failed", error);
    return `${completed} in Turso. Site refresh was unavailable; published pages and sitemap will update through their normal cache window.`;
  }
}
