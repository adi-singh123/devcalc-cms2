"use client";

import { useState } from "react";
import { Field, ListField, StatusField } from "@/components/EditorFields";
import RichTextEditor from "@/components/RichTextEditor";
import SeoPreview from "@/components/SeoPreview";
import type { RecordData } from "@/components/Dashboard";

type Faq = { question: string; answer: string };
type Step = { title: string; description: string; icon: string };
type Formula = { title: string; formula: string; explanation: string; example?: { input: string; output: string }; useCases?: string[] };
type Panel = "content" | "seo" | "details";

export default function CalculatorEditor({ value, busy, onSave, onDirty }: { value: RecordData; busy: boolean; onSave: (value: RecordData) => Promise<void>; onDirty: () => void }) {
  const [draft, setDraft] = useState<RecordData>(value);
  const [panel, setPanel] = useState<Panel>("content");
  const set = (key: string, next: unknown) => { onDirty(); setDraft((current) => ({ ...current, [key]: next })); };
  const faqs = (draft.faqs ?? []) as Faq[];
  const steps = (draft.steps ?? []) as Step[];
  const formula = (draft.formula ?? {}) as Formula;
  const updateFaq = (index: number, patch: Partial<Faq>) => set("faqs", faqs.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const updateStep = (index: number, patch: Partial<Step>) => set("steps", steps.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const updateFormula = (patch: Partial<Formula>) => set("formula", { ...formula, ...patch });

  return <form className="stack" onSubmit={(event) => { event.preventDefault(); void onSave(draft); }}>
    <p className="muted">Edit the writing, search appearance and details for this calculator. Its calculation logic stays in the DevCalc application.</p>
    <div className="editor-tabs" role="tablist" aria-label="Calculator editing sections">
      {(["content", "seo", "details"] as const).map((item) => <button key={item} type="button" role="tab" aria-selected={panel === item} className={panel === item ? "active" : ""} onClick={() => setPanel(item)}>{item === "seo" ? "SEO" : item === "content" ? "Content" : "Details & FAQ"}</button>)}
    </div>

    {panel === "content" && <div className="stack" role="tabpanel">
      <p className="muted">Route: /{String(draft.slug)}</p>
      <Field label="Calculator name" value={draft.name} onChange={(next) => set("name", next)} required />
      <Field label="Short description" value={draft.description} onChange={(next) => set("description", next)} multiline required />
      <Field label="Category" value={draft.category} onChange={(next) => set("category", next)} required />
      <Field label="Editorial introduction" value={draft.editorial_intro} onChange={(next) => set("editorial_intro", next)} multiline />
      <RichTextEditor label="Main explanatory content" value={String(draft.seo_content ?? "")} onChange={(next) => set("seo_content", next)} hint="Images appear at the cursor position inside this editor. Save the calculator to publish your changes. This section appears below the calculator steps, formula and FAQs on the website." />
    </div>}

    {panel === "seo" && <div className="stack" role="tabpanel">
      <h3>Search appearance</h3>
      <SeoPreview path={`/${String(draft.slug)}`} title={String(draft.seo_title ?? "")} description={String(draft.seo_description ?? "")} />
      <Field label="SEO title" value={draft.seo_title} onChange={(next) => set("seo_title", next)} required />
      <Field label="Meta description" value={draft.seo_description} onChange={(next) => set("seo_description", next)} multiline required />
      <ListField label="Keywords" value={draft.seo_keywords} onChange={(next) => set("seo_keywords", next)} />
    </div>}

    {panel === "details" && <div className="stack" role="tabpanel">
      <ListField label="Compare with calculator slugs" value={draft.compare_with} onChange={(next) => set("compare_with", next)} />
      <div className="row between"><h3>How-to steps</h3><button type="button" onClick={() => set("steps", [...steps, { title: "", description: "", icon: "" }])}>Add step</button></div>
      {steps.map((step, index) => <div className="section stack" key={index}><strong>Step {index + 1}</strong><Field label="Title" value={step.title} onChange={(next) => updateStep(index, { title: next })} /><Field label="Description" value={step.description} onChange={(next) => updateStep(index, { description: next })} multiline /><Field label="Icon key" value={step.icon} onChange={(next) => updateStep(index, { icon: next })} /><button type="button" className="danger" onClick={() => set("steps", steps.filter((_, itemIndex) => itemIndex !== index))}>Remove step</button></div>)}
      <h3>Formula</h3>
      <Field label="Formula heading" value={formula.title} onChange={(next) => updateFormula({ title: next })} required />
      <Field label="Formula expression" value={formula.formula} onChange={(next) => updateFormula({ formula: next })} required />
      <Field label="Explanation" value={formula.explanation} onChange={(next) => updateFormula({ explanation: next })} multiline required />
      <Field label="Example input" value={formula.example?.input} onChange={(next) => updateFormula({ example: { input: next, output: formula.example?.output ?? "" } })} />
      <Field label="Example output" value={formula.example?.output} onChange={(next) => updateFormula({ example: { input: formula.example?.input ?? "", output: next } })} />
      <ListField label="Use cases" value={formula.useCases ?? []} onChange={(next) => updateFormula({ useCases: next })} />
      <div className="row between"><h3>FAQ</h3><button type="button" onClick={() => set("faqs", [...faqs, { question: "", answer: "" }])}>Add question</button></div>
      {faqs.map((item, index) => <div className="section stack" key={index}><Field label="Question" value={item.question} onChange={(next) => updateFaq(index, { question: next })} /><Field label="Answer" value={item.answer} onChange={(next) => updateFaq(index, { answer: next })} multiline /><button type="button" className="danger" onClick={() => set("faqs", faqs.filter((_, itemIndex) => itemIndex !== index))}>Remove question</button></div>)}
      <label><input style={{ width: "auto" }} type="checkbox" checked={Boolean(draft.is_popular)} onChange={(event) => set("is_popular", event.target.checked)} /> Popular calculator</label>
    </div>}

    <div className="editor-save"><StatusField value={draft.status} onChange={(next) => set("status", next)} /><button className="primary" disabled={busy} type="submit">{busy ? "Saving…" : `Save ${String(draft.status)}`}</button></div>
  </form>;
}
