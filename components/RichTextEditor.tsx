"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import Superscript from "@tiptap/extension-superscript";

type Props = { label: string; value: string; onChange: (html: string) => void; hint?: string };

function previewImages(html: string) {
  return html.replace(/https:\/\/www\.devcalc\.in\/cms-image\/([a-f0-9]{32})/g, "/api/image/$1").replace(/\/cms-image\/([a-f0-9]{32})/g, "/api/image/$1");
}

function publicImages(html: string) {
  return html.replace(/\/api\/image\/([a-f0-9]{32})/g, "/cms-image/$1");
}

export default function RichTextEditor({ label, value, onChange, hint }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [showImage, setShowImage] = useState(false);
  const [imageAlt, setImageAlt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [mode, setMode] = useState<"visual" | "html">("visual");
  const [sourceHtml, setSourceHtml] = useState(value);
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false } }), Image.configure({ allowBase64: false }), TableKit, Superscript],
    content: previewImages(value) || "<p></p>",
    immediatelyRender: false,
    editorProps: { attributes: { class: "rich-text-surface", "aria-label": label } },
    onUpdate: ({ editor: current }) => onChangeRef.current(publicImages(current.getHTML())),
  });

  async function uploadImage(file: File) {
    if (!imageAlt.trim()) { setError("Add image alt text before uploading."); return; }
    setError(""); setUploading(true);
    try {
      const form = new FormData(); form.set("file", file);
      const response = await fetch("/api/image", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Image upload failed");
      editor?.chain().focus().setImage({ src: result.url.replace("/cms-image/", "/api/image/"), alt: imageAlt.trim() }).run();
      setShowImage(false); setImageUrl(""); setImageAlt("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Image upload failed"); }
    finally { setUploading(false); if (fileInput.current) fileInput.current.value = ""; }
  }

  function insertImageUrl() {
    if (!/^https:\/\//i.test(imageUrl) || !imageAlt.trim()) { setError("Enter an HTTPS image URL and alt text."); return; }
    editor?.chain().focus().setImage({ src: imageUrl.trim(), alt: imageAlt.trim() }).run();
    setError(""); setShowImage(false); setImageUrl(""); setImageAlt("");
  }

  function switchMode(next: "visual" | "html") {
    if (next === mode) return;
    if (next === "html") setSourceHtml(publicImages(editor?.getHTML() ?? value));
    else editor?.commands.setContent(previewImages(sourceHtml));
    setMode(next);
  }

  function link() {
    if (!editor) return;
    const previous = String(editor.getAttributes("link").href ?? "");
    const href = window.prompt("Link URL (https:// or internal /path)", previous);
    if (href === null) return;
    if (!href.trim()) { editor.chain().focus().unsetLink().run(); return; }
    if (!/^https?:\/\//i.test(href) && !href.startsWith("/")) { setError("Use an HTTPS URL or an internal /path link."); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
  }

  function editImageAlt() {
    if (!editor?.isActive("image")) return;
    const alt = window.prompt("Image description", String(editor.getAttributes("image").alt ?? ""));
    if (alt?.trim()) editor.chain().focus().updateAttributes("image", { alt: alt.trim() }).run();
  }

  const tool = (name: string, action: () => void, active = false, disabled = false) => <button type="button" className={active ? "active" : ""} disabled={!editor || disabled} onClick={action} aria-pressed={active}>{name}</button>;
  return <div className="rich-text-field"><div className="rich-text-label">{label}</div>{hint && <p className="muted">{hint}</p>}
    <div className="rich-text-toolbar" aria-label={`${label} formatting`}>
      {tool("Paragraph", () => editor?.chain().focus().setParagraph().run(), Boolean(editor?.isActive("paragraph")))}
      {tool("H2", () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), Boolean(editor?.isActive("heading", { level: 2 })))}
      {tool("H3", () => editor?.chain().focus().toggleHeading({ level: 3 }).run(), Boolean(editor?.isActive("heading", { level: 3 })))}
      {tool("Bold", () => editor?.chain().focus().toggleBold().run(), Boolean(editor?.isActive("bold")))}
      {tool("Italic", () => editor?.chain().focus().toggleItalic().run(), Boolean(editor?.isActive("italic")))}
      {tool("Superscript", () => editor?.chain().focus().toggleSuperscript().run(), Boolean(editor?.isActive("superscript")))}
      {tool("Bullets", () => editor?.chain().focus().toggleBulletList().run(), Boolean(editor?.isActive("bulletList")))}
      {tool("Numbers", () => editor?.chain().focus().toggleOrderedList().run(), Boolean(editor?.isActive("orderedList")))}
      {tool("Quote", () => editor?.chain().focus().toggleBlockquote().run(), Boolean(editor?.isActive("blockquote")))}
      {tool("Link", link, Boolean(editor?.isActive("link")))}
      {tool("Table", () => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}
      {tool("+ Row", () => editor?.chain().focus().addRowAfter().run(), false, !editor?.isActive("table"))}
      {tool("+ Column", () => editor?.chain().focus().addColumnAfter().run(), false, !editor?.isActive("table"))}
      {tool("Remove table", () => editor?.chain().focus().deleteTable().run(), false, !editor?.isActive("table"))}
      <button type="button" disabled={!editor || uploading || mode === "html"} onClick={() => setShowImage((open) => !open)}>Image</button>
      {tool("Image alt", editImageAlt, false, !editor?.isActive("image"))}
      {tool("Undo", () => editor?.chain().focus().undo().run(), false, !editor?.can().undo())}
      {tool("Redo", () => editor?.chain().focus().redo().run(), false, !editor?.can().redo())}
      <button type="button" className={mode === "html" ? "active" : ""} onClick={() => switchMode(mode === "visual" ? "html" : "visual")}>{mode === "html" ? "Visual editor" : "HTML"}</button>
    </div>
    {showImage && <div className="rich-text-image-panel"><label>Image alt text<input value={imageAlt} onChange={(event) => setImageAlt(event.target.value)} placeholder="Describe what the image shows" /></label><label>Upload image<input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(file); }} /></label><div className="row"><label className="grow">Or HTTPS image URL<input value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} placeholder="https://example.com/image.webp" /></label><button type="button" onClick={insertImageUrl}>Insert URL</button></div></div>}
    <div hidden={mode === "html"}><EditorContent editor={editor} /></div>
    {mode === "html" && <label className="rich-text-source-label">HTML source<textarea className="rich-text-source" value={sourceHtml} onChange={(event) => { setSourceHtml(event.target.value); onChange(event.target.value); }} /></label>}
    {error && <p className="error" role="alert">{error}</p>}
  </div>;
}
