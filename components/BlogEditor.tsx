"use client";
/* eslint-disable @next/next/no-img-element -- This private editor previews owner-uploaded images. */

import { useState } from "react";
import { Field, ListField, StatusField } from "@/components/EditorFields";
import RichTextEditor from "@/components/RichTextEditor";
import RelatedCalculatorPicker from "@/components/RelatedCalculatorPicker";
import SeoPreview from "@/components/SeoPreview";
import { articleEditorHtml, type BlogSection } from "@/lib/blog-editor-html";
import type { RecordData } from "@/components/Dashboard";

type Faq = { question: string; answer: string };
type Source = { title: string; url: string; publisher: string; publishedDate?: string };
type Panel = "content" | "seo" | "details";

function previewImage(src: string) {
  return src.startsWith("/cms-image/") ? src.replace("/cms-image/", "/api/image/") : src;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function previewDocument(draft: RecordData, bodyHtml: string, faqs: Faq[]) {
  const content = bodyHtml.replace(/\/cms-image\/([a-f0-9]{32})/g, "/api/image/$1");
  const faq = faqs.map((item) => `<h3>${escapeHtml(item.question)}</h3><p>${escapeHtml(item.answer)}</p>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{font:16px/1.7 Arial,sans-serif;max-width:760px;margin:30px auto;padding:0 24px;color:#172033}h1{font-size:2rem;line-height:1.2}h2{margin-top:2em}img{max-width:100%;height:auto}table{border-collapse:collapse;max-width:100%;display:block;overflow:auto}th,td{border:1px solid #b9c6d8;padding:7px 10px}blockquote{border-left:3px solid #b9c6d8;padding-left:16px}pre{white-space:pre-wrap}</style></head><body><h1>${escapeHtml(String(draft.title ?? ""))}</h1><p>${escapeHtml(String(draft.description ?? ""))}</p>${content}${faq ? `<section><h2>FAQ</h2>${faq}</section>` : ""}</body></html>`;
}

export default function BlogEditor({ value, busy, onSave, onDirty }: { value: RecordData; busy: boolean; onSave: (value: RecordData) => Promise<void>; onDirty: () => void }) {
  const [draft, setDraft] = useState<RecordData>(value);
  const [panel, setPanel] = useState<Panel>("content");
  const [preview, setPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const sections = (draft.content ?? []) as BlogSection[];
  const articleHtml = articleEditorHtml(sections);
  const faqs = (draft.faqs ?? []) as Faq[];
  const sources = (draft.sources ?? []) as Source[];
  const wordCount = articleHtml.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
  const set = (key: string, next: unknown) => { onDirty(); setDraft((current) => ({ ...current, [key]: next })); };
  const faq = (index: number, patch: Partial<Faq>) => set("faqs", faqs.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const source = (index: number, patch: Partial<Source>) => set("sources", sources.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));

  async function uploadFeatured(file: File) {
    setUploadError(""); setUploading(true);
    try {
      const form = new FormData(); form.set("file", file);
      const response = await fetch("/api/image", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Upload failed");
      set("image_url", result.url);
      if (!String(draft.image_alt ?? "")) set("image_alt", file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "));
    } catch (error) { setUploadError(error instanceof Error ? error.message : "Upload failed"); }
    finally { setUploading(false); }
  }

  return <form className="stack" onSubmit={(event) => {
    event.preventDefault();
    void onSave({ ...draft, content: [{ heading: "", paragraphs: [], bodyHtml: articleHtml }] });
  }}>
    <div className="editor-tabs" role="tablist" aria-label="Article editing sections">
      {(["content", "seo", "details"] as const).map((item) => <button key={item} type="button" role="tab" aria-selected={panel === item} className={panel === item ? "active" : ""} onClick={() => setPanel(item)}>{item === "seo" ? "SEO" : item === "content" ? "Content" : "Details & FAQ"}</button>)}
    </div>

    {panel === "content" && <div className="stack" role="tabpanel">
      <div className="row between"><h3>Article content</h3><button type="button" onClick={() => setPreview(!preview)}>{preview ? "Return to editor" : "Preview article"}</button></div>
      {preview ? <iframe className="article-preview-frame" title="Article preview" sandbox="" srcDoc={previewDocument(draft, articleHtml, faqs)} /> : <>
        <Field label="Slug" value={draft.slug} onChange={(next) => set("slug", next.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} hint="The URL stays fixed after the first save." required />
        <Field label="Page title" value={draft.title} onChange={(next) => set("title", next)} required />
        <Field label="Summary" value={draft.description} onChange={(next) => set("description", next)} multiline required />
        <div className="section stack"><h3>Featured image</h3><Field label="Image URL" value={draft.image_url} onChange={(next) => set("image_url", next)} hint="Use an HTTPS URL or upload below." />
          {Boolean(draft.image_url) && <img className="featured-preview" src={previewImage(String(draft.image_url))} alt={String(draft.image_alt || "Featured image preview")} />}
          <label>Upload image (JPEG, PNG, WebP, AVIF; up to 2 MB)<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadFeatured(file); }} /></label>
          <Field label="Image alt text" value={draft.image_alt} onChange={(next) => set("image_alt", next)} />{uploadError && <p className="error" role="alert">{uploadError}</p>}
        </div>
        <RichTextEditor label="Article body" value={articleHtml} onChange={(bodyHtml) => set("content", [{ heading: "", paragraphs: [], bodyHtml }])} hint="Write the article here in its published order. Every H2 becomes a Table of Contents link on the blog page; use H3 for headings within those sections. Insert images at the cursor. Existing article sections are combined here when you edit them." />
      </>}
    </div>}

    {panel === "seo" && <div className="stack" role="tabpanel">
      <h3>Search appearance</h3><SeoPreview path={`/blog/${String(draft.slug ?? "")}`} title={String(draft.seo_title ?? "")} description={String(draft.seo_description ?? "")} />
      <Field label="SEO title" value={draft.seo_title} onChange={(next) => set("seo_title", next)} required />
      <Field label="Meta description" value={draft.seo_description} onChange={(next) => set("seo_description", next)} multiline required />
      <ListField label="Keywords" value={draft.keywords} onChange={(next) => set("keywords", next)} />
    </div>}

    {panel === "details" && <div className="stack" role="tabpanel">
      <p className="muted">{wordCount} article words · {faqs.length} FAQs · {sources.length} sources. Check facts, links and image descriptions before publishing.</p>
      <div className="row"><Field label="Category" value={draft.category} onChange={(next) => set("category", next)} required /><Field label="Author" value={draft.author} onChange={(next) => set("author", next)} required /></div>
      <div className="row"><Field label="Publication date (ISO)" value={draft.published_at} onChange={(next) => set("published_at", next)} required /><Field label="Reading time" value={draft.reading_time} onChange={(next) => set("reading_time", next)} required /></div>
      <div className="row between"><h3>FAQ</h3><button type="button" onClick={() => set("faqs", [...faqs, { question: "", answer: "" }])}>Add question</button></div>
      {faqs.map((item, index) => <div className="section stack" key={index}><Field label="Question" value={item.question} onChange={(next) => faq(index, { question: next })} /><Field label="Answer" value={item.answer} onChange={(next) => faq(index, { answer: next })} multiline /><button type="button" className="danger" onClick={() => set("faqs", faqs.filter((_, itemIndex) => itemIndex !== index))}>Remove question</button></div>)}
      <div className="row between"><h3>Sources</h3><button type="button" onClick={() => set("sources", [...sources, { title: "", url: "", publisher: "" }])}>Add source</button></div>
      {sources.map((item, index) => <div className="section stack" key={index}><Field label="Title" value={item.title} onChange={(next) => source(index, { title: next })} /><Field label="Source HTTPS URL" value={item.url} onChange={(next) => source(index, { url: next })} /><Field label="Publisher" value={item.publisher} onChange={(next) => source(index, { publisher: next })} /><Field label="Published date" value={item.publishedDate} onChange={(next) => source(index, { publishedDate: next })} /><button type="button" className="danger" onClick={() => set("sources", sources.filter((_, itemIndex) => itemIndex !== index))}>Remove source</button></div>)}
      <RelatedCalculatorPicker value={Array.isArray(draft.related_calculator_slugs) ? draft.related_calculator_slugs as string[] : []} onChange={(next) => set("related_calculator_slugs", next)} />
      <div className="row"><Field label="Last verified date" value={draft.last_verified_at} onChange={(next) => set("last_verified_at", next)} /><Field label="Effective date" value={draft.effective_date} onChange={(next) => set("effective_date", next)} /></div>
      <label><input style={{ width: "auto" }} type="checkbox" checked={Boolean(draft.is_featured)} onChange={(event) => set("is_featured", event.target.checked)} /> Featured article</label>
    </div>}

    <div className="editor-save"><StatusField value={draft.status} onChange={(next) => set("status", next)} /><button className="primary" disabled={busy || uploading} type="submit">{busy ? "Saving…" : `Save ${String(draft.status)}`}</button></div>
  </form>;
}
