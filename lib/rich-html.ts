import sanitizeHtml from "sanitize-html";
import { decodeHTML } from "entities";

export function cleanRichHtml(value: unknown, field: string, maxLength = 50000) {
  if (typeof value !== "string" || value.length > maxLength) throw new Error(`${field} is too long`);
  const clean = sanitizeHtml(value, {
    allowedTags: ["p", "br", "h2", "h3", "strong", "em", "s", "sup", "ul", "ol", "li", "blockquote", "a", "img", "code", "pre", "hr", "table", "thead", "tbody", "tr", "th", "td"],
    allowedAttributes: { a: ["href", "title"], img: ["src", "alt", "title", "width", "height"] },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: { img: ["https"] },
    allowProtocolRelative: false,
  });
  if (/<img\b/i.test(clean) && /<img\b(?![^>]*\balt=)/i.test(clean)) throw new Error(`${field} images need alt text`);
  return clean;
}

export function plainParagraphs(html: string) {
  const separated = html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(?:p|h2|h3|li|blockquote)>/gi, "\n\n");
  return decodeHTML(sanitizeHtml(separated, { allowedTags: [], allowedAttributes: {} })).split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
}
