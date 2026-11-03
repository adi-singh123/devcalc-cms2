export default function SeoPreview({ path, title, description }: { path: string; title: string; description: string }) {
  return <div className="seo-preview" aria-label="Search result preview">
    <div className="seo-preview-url">www.devcalc.in{path}</div>
    <div className="seo-preview-title">{title || "Add an SEO title"}</div>
    <p>{description || "Add a description to preview how this page may appear in search results."}</p>
    <div className="seo-preview-counts"><span>Title: {title.length} characters</span><span>Description: {description.length} characters</span></div>
  </div>;
}
