"use client";

import { useState } from "react";
import { Field, ListField, StatusField } from "@/components/EditorFields";
import RichTextEditor from "@/components/RichTextEditor";
import SeoPreview from "@/components/SeoPreview";
import type { RecordData } from "@/components/Dashboard";

type Panel = "content" | "seo";

function legacyHtml(html: string) {
  return /<\s*(main|script|nav|svg)\b/i.test(html);
}

function convertLegacyPage(html: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const content = doc.querySelector("main") ?? doc.body;
  content.querySelectorAll("script, style, nav, svg, header, footer, aside").forEach((node) => node.remove());
  content.querySelectorAll("h1").forEach((node) => {
    const replacement = doc.createElement("h2");
    replacement.innerHTML = node.innerHTML;
    node.replaceWith(replacement);
  });
  return content.innerHTML;
}

export default function PageEditor({ value, busy, onSave, onDirty }: { value: RecordData; busy: boolean; onSave: (value: RecordData) => Promise<void>; onDirty: () => void }) {
  const [draft, setDraft] = useState<RecordData>(value);
  const [panel, setPanel] = useState<Panel>("content");
  const [converted, setConverted] = useState(!legacyHtml(String(value.body_html ?? "")));
  const [preview, setPreview] = useState(false);
  const set = (key: string, next: unknown) => { onDirty(); setDraft((current) => ({ ...current, [key]: next })); };
  const path = String(draft.canonical_path ?? `/${draft.slug}`);

  return <form className="stack" onSubmit={(event) => { event.preventDefault(); void onSave(draft); }}>
    <p className="muted">Route: {path}. The URL stays fixed. Content and search metadata are saved to the existing DevCalc page.</p>
    <div className="editor-tabs" role="tablist" aria-label="Site page editing sections">
      {(["content", "seo"] as const).map((item) => <button key={item} type="button" role="tab" aria-selected={panel === item} className={panel === item ? "active" : ""} onClick={() => setPanel(item)}>{item === "content" ? "Content" : "SEO"}</button>)}
    </div>

    {panel === "content" && <div className="stack" role="tabpanel">
      <Field label="Page name" value={draft.name} onChange={(next) => set("name", next)} required />
      {converted ? <>
        <div className="row between"><h3>Page body</h3><button type="button" onClick={() => setPreview(!preview)}>{preview ? "Return to editor" : "Preview page"}</button></div>
        {preview ? <iframe className="article-preview-frame" title="Page preview" sandbox="" srcDoc={String(draft.body_html ?? "")} /> : <RichTextEditor label="Page body" value={String(draft.body_html ?? "")} onChange={(next) => set("body_html", next)} hint="The public page adds its breadcrumb and structured data around this content." />}
      </> : <div className="section stack"><h3>Existing page layout</h3><p className="muted">This page was imported with layout, breadcrumb and structured-data markup. You can edit its SEO fields now. To edit its body with Tiptap, first review a clean conversion; saving the conversion replaces the old layout with the standard DevCalc page layout.</p>
        <iframe className="article-preview-frame" title="Current page preview" sandbox="" srcDoc={String(draft.body_html ?? "")} />
        <button type="button" onClick={() => { set("body_html", convertLegacyPage(String(draft.body_html ?? ""))); setConverted(true); setPreview(false); }}>Open body in Tiptap</button>
      </div>}
    </div>}

    {panel === "seo" && <div className="stack" role="tabpanel">
      <SeoPreview path={path} title={String(draft.seo_title ?? "")} description={String(draft.seo_description ?? "")} />
      <Field label="SEO title" value={draft.seo_title} onChange={(next) => set("seo_title", next)} required />
      <Field label="Meta description" value={draft.seo_description} onChange={(next) => set("seo_description", next)} multiline required />
      <ListField label="Keywords" value={draft.keywords} onChange={(next) => set("keywords", next)} />
    </div>}

    <div className="editor-save"><StatusField value={draft.status} onChange={(next) => set("status", next)} /><button className="primary" disabled={busy} type="submit">{busy ? "Saving…" : `Save ${String(draft.status)}`}</button></div>
  </form>;
}
