"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BlogEditor from "@/components/BlogEditor";
import CalculatorEditor from "@/components/CalculatorEditor";
import PageEditor from "@/components/PageEditor";

type Kind = "blogs" | "calculators" | "pages";
type Item = { slug: string; title: string; status: string; updated_at: string };
export type RecordData = Record<string, unknown>;

const newBlog: RecordData = {
  slug: "", title: "", seo_title: "", seo_description: "", description: "", category: "", author: "",
  published_at: new Date().toISOString(), reading_time: "5 min read", image_url: "", image_alt: "",
  keywords: [], last_verified_at: "", effective_date: "", sources: [], related_calculator_slugs: [],
  content: [], faqs: [], status: "draft", is_featured: 0,
};

export default function Dashboard() {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("blogs");
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [record, setRecord] = useState<RecordData | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [dirty, setDirty] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function canLeave() { return !dirty || window.confirm("Discard unsaved changes?"); }

  function changeKind(next: Kind) {
    if (next === kind || !canLeave()) return;
    setKind(next); setSelected(null); setRecord(null); setQuery(""); setError(""); setDirty(false);
  }

  const loadList = useCallback(async (type: Kind) => {
    const response = await fetch(`/api/content/${type}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Could not load content");
    setItems(data.items);
  }, []);

  useEffect(() => {
    let active = true;
    fetch(`/api/content/${kind}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Could not load content");
        if (active) setItems(data.items);
      })
      .catch((reason) => { if (active) setError(String(reason)); });
    return () => { active = false; };
  }, [kind]);

  async function open(slug: string) {
    if (slug === selected || !canLeave()) return;
    setError(""); setMessage(""); setBusy(true);
    try {
      const response = await fetch(`/api/content/${kind}/${encodeURIComponent(slug)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not open item");
      setSelected(slug); setRecord(data.item); setDirty(false); setRevision((current) => current + 1);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not open item"); }
    finally { setBusy(false); }
  }

  async function save(next: RecordData) {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(selected ? `/api/content/${kind}/${selected}` : `/api/content/blogs`, {
        method: selected ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Save failed");
      const savedSlug = selected ?? result.slug;
      setSelected(savedSlug);
      let savedRecord = { ...next, slug: savedSlug };
      try {
        const freshResponse = await fetch(`/api/content/${kind}/${encodeURIComponent(savedSlug)}`, { cache: "no-store" });
        if (freshResponse.ok) savedRecord = (await freshResponse.json()).item;
      } catch { /* The save succeeded; the editor can still show the submitted content. */ }
      setRecord(savedRecord);
      setRevision((current) => current + 1);
      setDirty(false);
      try { await loadList(kind); } catch { setError("Saved, but the content list could not refresh. Reload the page to update the list."); }
      setMessage(result.warning ?? (next.status === "published" ? "Published. The live page and sitemap are refreshing." : "Saved."));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Save failed"); }
    finally { setBusy(false); }
  }

  async function archive() {
    if (!canLeave()) return;
    if (!record || !selected || !window.confirm(`Archive ${selected}? It will disappear from public listings and the sitemap.`)) return;
    await save({ ...record, status: "archived" });
  }

  async function deleteBlog() {
    if (kind !== "blogs" || !selected || !canLeave()) return;
    if (!window.confirm(`Permanently delete /blog/${selected}? This cannot be undone. The blog will also disappear from the sitemap and RSS feed.`)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/content/blogs/${encodeURIComponent(selected)}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not delete blog");
      setItems((current) => current.filter((item) => item.slug !== selected));
      setSelected(null); setRecord(null); setDirty(false);
      setMessage(result.warning ?? "Blog deleted. Its page, sitemap entry, and RSS entry are refreshing.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not delete blog"); }
    finally { setBusy(false); }
  }

  async function signOut() {
    if (!canLeave()) return;
    await fetch("/api/session", { method: "DELETE" });
    router.refresh();
  }

  return <>
    <header><strong>DevCalc CMS</strong><button onClick={signOut}>Sign out</button></header>
    <main>
      <div className="row between"><div><h1>Content manager</h1><p className="muted">Manage the live Turso content used by DevCalc. Archive removes a page from the public site without deleting its history.</p></div><a href={process.env.NEXT_PUBLIC_DEV_WEB_URL ?? "https://www.devcalc.in"} target="_blank" rel="noreferrer">Open website ↗</a></div>
      <div className="row"><button className={kind === "blogs" ? "primary" : ""} onClick={() => changeKind("blogs")}>Blogs</button><button className={kind === "calculators" ? "primary" : ""} onClick={() => changeKind("calculators")}>Calculators</button><button className={kind === "pages" ? "primary" : ""} onClick={() => changeKind("pages")}>Site pages</button>{dirty && <span className="pill">Unsaved changes</span>}</div>
      {error && <p className="error" role="alert">{error}</p>}{message && <p className="success" role="status">{message}</p>}
      <div className="grid">
        <aside className="card"><div className="row between"><h2>{kind === "blogs" ? "Articles" : kind === "calculators" ? "Calculators" : "Site pages"} ({items.length})</h2>{kind === "blogs" && <button className="primary" onClick={() => { if (!canLeave()) return; setSelected(null); setRecord(structuredClone(newBlog)); setRevision((current) => current + 1); setDirty(false); setMessage(""); setError(""); }}>New</button>}</div><input aria-label="Search content" placeholder="Search title or slug" value={query} onChange={(event) => setQuery(event.target.value)} /><div className="list">{items.filter((item) => `${item.title} ${item.slug}`.toLowerCase().includes(query.toLowerCase())).map((item) => <button key={item.slug} className={selected === item.slug ? "active" : ""} onClick={() => open(item.slug)}><strong>{item.title}</strong><br /><span className="muted">{item.slug}</span> <span className="pill">{item.status}</span></button>)}{!items.some((item) => `${item.title} ${item.slug}`.toLowerCase().includes(query.toLowerCase())) && <p className="muted">{query ? "No matching content." : "No content in this category."}</p>}</div></aside>
        <section className="card">{!record ? <p className="muted">Select an item{kind === "blogs" ? " or create a new article" : ""}.</p> : <><div className="row between"><div><h2>{selected ? `Edit ${kind === "blogs" ? "article" : kind === "calculators" ? "calculator" : "site page"}` : "New article"}</h2><p className="muted">{selected ? `/${kind === "blogs" ? "blog/" : ""}${selected}` : "Save as draft before publishing."}</p></div>{selected && <div className="row"><button className="danger" disabled={busy || record.status === "archived"} onClick={archive}>Archive</button>{kind === "blogs" && <button className="danger" disabled={busy} onClick={deleteBlog}>Delete permanently</button>}</div>}</div>{kind === "blogs" ? <BlogEditor key={`blog-${selected ?? "new"}-${revision}`} value={record} busy={busy} onSave={save} onDirty={() => setDirty(true)} /> : kind === "calculators" ? <CalculatorEditor key={`calc-${selected}-${revision}`} value={record} busy={busy} onSave={save} onDirty={() => setDirty(true)} /> : <PageEditor key={`page-${selected}-${revision}`} value={record} busy={busy} onSave={save} onDirty={() => setDirty(true)} />}</>}</section>
      </div>
    </main>
  </>;
}
