"use client";

export function Field({ label, value, onChange, multiline = false, hint, required = false }: { label: string; value: unknown; onChange: (value: string) => void; multiline?: boolean; hint?: string; required?: boolean }) {
  return <label>{label}{multiline ? <textarea value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} required={required} /> : <input value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} required={required} />}{hint && <small className="muted">{hint}</small>}</label>;
}

export function ListField({ label, value, onChange, hint }: { label: string; value: unknown; onChange: (value: string[]) => void; hint?: string }) {
  const items = Array.isArray(value) ? value as string[] : [];
  return <Field label={label} value={items.join(", ")} onChange={(input) => onChange(input.split(",").map((item) => item.trim()).filter(Boolean))} hint={hint ?? "Separate entries with commas."} />;
}

export function StatusField({ value, onChange }: { value: unknown; onChange: (value: string) => void }) {
  return <label>Visibility<select value={String(value ?? "draft")} onChange={(event) => onChange(event.target.value)}><option value="draft">Draft — not public</option><option value="published">Published — public and in sitemap</option><option value="archived">Archived — removed from public site</option></select></label>;
}
