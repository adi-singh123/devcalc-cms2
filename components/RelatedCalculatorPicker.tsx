"use client";

import { useEffect, useRef, useState } from "react";

type Calculator = { slug: string; title: string; status: string };

export default function RelatedCalculatorPicker({ value, onChange }: { value: string[]; onChange: (slugs: string[]) => void }) {
  const [items, setItems] = useState<Calculator[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/content/calculators", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not load calculators");
        setItems(data.items);
      })
      .catch((reason) => { if (reason?.name !== "AbortError") setError("Calculator choices could not load. Reload the CMS and try again."); });
    return () => controller.abort();
  }, []);

  const choices = items.filter((item) => item.status === "published" && !value.includes(item.slug) && `${item.title} ${item.slug}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 12);
  function choose(slug: string) {
    if (!value.includes(slug)) onChange([...value, slug]);
    setQuery(""); setActive(0); setOpen(true); input.current?.focus();
  }

  return <div className="related-picker" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <label htmlFor="related-calculator-search">Related calculators</label>
    <p className="muted">Search and select calculators that readers can use with this article.</p>
    {value.length > 0 && <div className="related-picker-selected" aria-label="Selected related calculators">{value.map((slug) => {
      const item = items.find((candidate) => candidate.slug === slug);
      return <span className="related-picker-chip" key={slug}><span>{item?.title ?? slug}</span><button type="button" aria-label={`Remove ${item?.title ?? slug}`} onClick={() => onChange(value.filter((itemSlug) => itemSlug !== slug))}>Remove</button></span>;
    })}</div>}
    <input id="related-calculator-search" ref={input} role="combobox" aria-autocomplete="list" aria-controls="related-calculator-options" aria-expanded={open} value={query} placeholder="Search calculator name or slug" onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setActive(0); setOpen(true); }} onKeyDown={(event) => {
      if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); if (choices.length) setActive((index) => Math.min(index + 1, choices.length - 1)); }
      if (event.key === "ArrowUp") { event.preventDefault(); setActive((index) => Math.max(index - 1, 0)); }
      if (event.key === "Enter") { event.preventDefault(); if (open && choices[active]) choose(choices[active].slug); }
      if (event.key === "Escape") setOpen(false);
      if (event.key === "Backspace" && !query && value.length) onChange(value.slice(0, -1));
    }} />
    {open && <div id="related-calculator-options" className="related-picker-options" role="listbox" aria-label="Available calculators">
      {choices.length ? choices.map((item, index) => <button key={item.slug} type="button" role="option" aria-selected={index === active} className={index === active ? "active" : ""} onClick={() => choose(item.slug)}><strong>{item.title}</strong><small>{item.slug}</small></button>) : <p className="muted">{items.length ? "No matching calculators." : "Loading calculators…"}</p>}
    </div>}
    {error && <p className="error" role="alert">{error}</p>}
  </div>;
}
