import "server-only";
import { db } from "@/lib/db";
import { cleanRichHtml, plainParagraphs } from "@/lib/rich-html";

export type Kind = "blogs" | "calculators" | "pages";
export type Status = "draft" | "published" | "archived";
export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function text(value: unknown, field: string, max: number, required = true) {
  if (typeof value !== "string" || value.length > max || (required && !value.trim())) throw new Error(`${field} is required (max ${max} characters)`);
  return value.trim();
}
function strings(value: unknown, field: string, max = 30, maxLength = 300) {
  if (!Array.isArray(value) || value.length > max || !value.every((item) => typeof item === "string" && item.trim() && item.length <= maxLength)) throw new Error(`${field} must be a list of text values`);
  return value.map((item: string) => item.trim());
}
function status(value: unknown): Status {
  if (value !== "draft" && value !== "published" && value !== "archived") throw new Error("Choose draft, published, or archived");
  return value;
}
function slug(value: unknown) {
  const result = text(value, "Slug", 120);
  if (!slugPattern.test(result)) throw new Error("Slug must contain lowercase letters, numbers, and single hyphens only");
  return result;
}
function url(value: unknown, field: string, optional = false) {
  const result = text(value, field, 500, !optional);
  if (!result && optional) return result;
  if (result.startsWith("/cms-image/") && field === "Image URL") return result;
  try { if (new URL(result).protocol === "https:") return result; } catch { /* invalid */ }
  throw new Error(`${field} must be an HTTPS URL`);
}
function faqList(value: unknown) {
  if (!Array.isArray(value) || value.length > 30) throw new Error("FAQs must be a list of 30 or fewer items");
  return value.map((item) => ({ question: text(item?.question, "FAQ question", 300), answer: text(item?.answer, "FAQ answer", 3000) }));
}
function table(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  const input = value as { headers?: unknown; rows?: unknown };
  if (!Array.isArray(input.headers) || !Array.isArray(input.rows)) throw new Error("Table format is invalid");
  if (input.headers.length === 0 && input.rows.length === 0) return undefined;
  const headers = strings(input.headers, "Table headers", 15);
  if (!headers.length || input.rows.length > 100) throw new Error("Table needs headers and at most 100 rows");
  const rows = input.rows.map((row) => {
    if (!Array.isArray(row) || row.length !== headers.length || !row.every((cell) => typeof cell === "string" && cell.length <= 1000)) throw new Error("Each table row must match the headers");
    return row;
  });
  return { headers, rows };
}
function codeBlock(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  const input = value as { language?: unknown; content?: unknown; caption?: unknown };
  if (!input.content && !input.language) return undefined;
  return { language: text(input.language, "Code language", 50), content: text(input.content, "Code content", 10000), caption: text(input.caption ?? "", "Code caption", 500, false) };
}
function blogSections(value: unknown) {
  if (!Array.isArray(value) || value.length > 50) throw new Error("Article needs up to 50 sections");
  return value.map((item) => {
    const hasRichBody = typeof item?.bodyHtml === "string";
    const bodyHtml = hasRichBody ? cleanRichHtml(item.bodyHtml, "Article body", 200000) : "";
    return {
      heading: text(item?.heading ?? "", "Section heading", 200, !hasRichBody),
      paragraphs: hasRichBody ? plainParagraphs(bodyHtml) : strings(item?.paragraphs, "Paragraphs", 30, 5000),
      ...(hasRichBody ? { bodyHtml } : {}),
      ...(item?.points?.length ? { points: strings(item.points, "List items", 30) } : {}),
      ...(item?.image?.src ? { image: { src: url(item.image.src, "Image URL"), alt: text(item.image.alt, "Image alt text", 250), caption: text(item.image.caption ?? "", "Image caption", 500, false) } } : {}),
      ...(table(item?.table) ? { table: table(item.table) } : {}),
      ...(codeBlock(item?.code) ? { code: codeBlock(item.code) } : {}),
    };
  });
}
function sources(value: unknown) {
  if (!Array.isArray(value) || value.length > 25) throw new Error("Sources must be a list of 25 or fewer items");
  return value.map((item) => ({ title: text(item?.title, "Source title", 250), url: url(item?.url, "Source URL"), publisher: text(item?.publisher, "Source publisher", 200), publishedDate: text(item?.publishedDate ?? "", "Source date", 40, false) }));
}
function date(value: unknown, field: string) {
  const result = text(value, field, 40);
  if (Number.isNaN(Date.parse(result))) throw new Error(`${field} must be a valid date`);
  return result;
}

export function validateBlog(input: Record<string, unknown>) {
  const record = {
    slug: slug(input.slug), title: text(input.title, "Title", 220),
    seo_title: text(input.seo_title, "SEO title", 220),
    seo_description: text(input.seo_description, "SEO description", 500),
    description: text(input.description, "Summary", 1000),
    category: text(input.category, "Category", 100),
    author: text(input.author, "Author", 120),
    published_at: date(input.published_at, "Publication date"),
    reading_time: text(input.reading_time, "Reading time", 50),
    image_url: url(input.image_url ?? "", "Image URL", true),
    image_alt: text(input.image_alt ?? "", "Image alt text", 250, false),
    keywords_json: JSON.stringify(strings(input.keywords, "Keywords")),
    last_verified_at: input.last_verified_at ? date(input.last_verified_at, "Verified date") : null,
    effective_date: input.effective_date ? date(input.effective_date, "Effective date") : null,
    sources_json: JSON.stringify(sources(input.sources)),
    related_calculator_slugs_json: JSON.stringify(strings(input.related_calculator_slugs, "Related calculators")),
    content_json: JSON.stringify(blogSections(input.content)),
    faqs_json: JSON.stringify(faqList(input.faqs)),
    status: status(input.status),
    is_featured: input.is_featured === true ? 1 : 0,
  };
  if (record.status === "published" && (JSON.parse(record.content_json) as unknown[]).length === 0) throw new Error("Add article sections before publishing");
  if (record.status === "published" && !(JSON.parse(record.content_json) as { paragraphs: string[]; bodyHtml?: string }[]).some((section) => section.bodyHtml ? Boolean(section.bodyHtml.replace(/<[^>]+>/g, "").trim()) : section.paragraphs.length > 0)) throw new Error("Add article content before publishing");
  if (record.status === "published" && record.image_url && !record.image_alt) throw new Error("Add alt text for the featured image before publishing");
  return record;
}

export function validateCalculator(input: Record<string, unknown>) {
  const formula = input.formula as Record<string, unknown> | undefined;
  if (!formula || typeof formula !== "object") throw new Error("Formula is required");
  const steps = Array.isArray(input.steps) ? input.steps : [];
  if (steps.length > 20) throw new Error("Too many steps");
  const record = {
    name: text(input.name, "Name", 200), description: text(input.description, "Description", 1000),
    category: text(input.category, "Category", 100),
    seo_title: text(input.seo_title, "SEO title", 220), seo_description: text(input.seo_description, "SEO description", 500),
    seo_keywords_json: JSON.stringify(strings(input.seo_keywords, "SEO keywords")),
    seo_content: cleanRichHtml(input.seo_content ?? "", "SEO content"),
    editorial_intro: text(input.editorial_intro ?? "", "Editorial intro", 5000, false),
    compare_with_json: JSON.stringify(strings(input.compare_with, "Compare with")),
    steps_json: JSON.stringify(steps.map((step, index) => ({ step: index + 1, title: text(step?.title, "Step title", 200), description: text(step?.description, "Step description", 2000), icon: text(step?.icon ?? "", "Step icon", 100, false) }))),
    formula_json: JSON.stringify({ title: text(formula.title, "Formula title", 200), formula: text(formula.formula, "Formula", 1000), explanation: text(formula.explanation, "Formula explanation", 5000), ...(formula.example ? { example: formula.example } : {}), ...(formula.useCases ? { useCases: strings(formula.useCases, "Use cases") } : {}) }),
    faqs_json: JSON.stringify(faqList(input.faqs)),
    status: status(input.status), is_popular: input.is_popular === true ? 1 : 0,
  };
  return record;
}

export function validatePage(input: Record<string, unknown>) {
  const body = text(input.body_html, "Page HTML", 200000);
  return {
    name: text(input.name, "Page name", 200),
    seo_title: text(input.seo_title, "SEO title", 220),
    seo_description: text(input.seo_description, "SEO description", 500),
    keywords_json: JSON.stringify(strings(input.keywords, "Keywords")),
    body_html: body,
    status: status(input.status),
  };
}

export async function list(kind: Kind) {
  const table = kind === "blogs" ? "blog_posts" : kind === "calculators" ? "calculators" : "site_pages";
  const label = kind === "blogs" ? "title" : "name";
  const where = kind === "pages" ? "WHERE slug IN ('about', 'privacy-policy', 'terms')" : "";
  const result = await db().execute(`SELECT slug, ${label} AS title, status, updated_at FROM ${table} ${where} ORDER BY updated_at DESC LIMIT 500`);
  return result.rows;
}

export async function read(kind: Kind, entrySlug: string) {
  const table = kind === "blogs" ? "blog_posts" : kind === "calculators" ? "calculators" : "site_pages";
  const result = await db().execute({ sql: `SELECT * FROM ${table} WHERE slug = ? LIMIT 1`, args: [entrySlug] });
  const row = result.rows[0];
  if (!row) return null;
  const data: Record<string, unknown> = { ...row };
  for (const [key, value] of Object.entries(data)) if (key.endsWith("_json") && typeof value === "string") data[key.slice(0, -5)] = JSON.parse(value);
  return data;
}

export async function writeBlog(record: ReturnType<typeof validateBlog>, originalSlug?: string) {
  if (originalSlug) {
    if (record.slug !== originalSlug) throw new Error("Existing slugs are fixed to protect links and SEO. Create a new draft instead.");
    const keys = Object.keys(record);
    const result = await db().execute({ sql: `UPDATE blog_posts SET ${keys.map((key) => `${key} = ?`).join(", ")} WHERE slug = ?`, args: [...Object.values(record), originalSlug] });
    if (!result.rowsAffected) throw new Error("Blog not found");
  } else {
    const keys = Object.keys(record);
    await db().execute({ sql: `INSERT INTO blog_posts (${keys.join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`, args: Object.values(record) });
  }
}

export async function deleteBlog(entrySlug: string) {
  const result = await db().execute({ sql: "DELETE FROM blog_posts WHERE slug = ?", args: [entrySlug] });
  return result.rowsAffected > 0;
}

export async function writeCalculator(record: ReturnType<typeof validateCalculator>, entrySlug: string, expectedUpdatedAt: string) {
  if (!expectedUpdatedAt) throw new Error("Reload this calculator before saving.");
  const keys = Object.keys(record);
  const result = await db().execute({ sql: `UPDATE calculators SET ${keys.map((key) => `${key} = ?`).join(", ")} WHERE slug = ? AND updated_at = ?`, args: [...Object.values(record), entrySlug, expectedUpdatedAt] });
  if (!result.rowsAffected) throw new Error("This calculator changed after you opened it. Reload the CMS page before saving, so newer text and images are not overwritten.");
}

export async function writePage(record: ReturnType<typeof validatePage>, entrySlug: string) {
  if (!["about", "privacy-policy", "terms"].includes(entrySlug)) throw new Error("This site page is not managed by the CMS");
  const existing = await db().execute({ sql: "SELECT body_html FROM site_pages WHERE slug = ? LIMIT 1", args: [entrySlug] });
  if (!existing.rows.length) throw new Error("Site page not found");
  if (record.body_html !== String(existing.rows[0].body_html).trim()) {
    record.body_html = cleanRichHtml(record.body_html, "Page body", 200000);
    if (!record.body_html.replace(/<[^>]+>/g, "").trim()) throw new Error("Page body cannot be empty");
  }
  const keys = Object.keys(record);
  const result = await db().execute({ sql: `UPDATE site_pages SET ${keys.map((key) => `${key} = ?`).join(", ")} WHERE slug = ?`, args: [...Object.values(record), entrySlug] });
  if (!result.rowsAffected) throw new Error("Site page not found. CMS only edits existing routes.");
}
