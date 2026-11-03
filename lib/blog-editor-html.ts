export type BlogSection = {
  heading: string;
  paragraphs: string[];
  bodyHtml?: string;
  points?: string[];
  image?: { src: string; alt: string; caption?: string };
  table?: { headers: string[]; rows: string[][] };
  code?: { language: string; content: string; caption?: string };
};

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function sectionBody(section: BlogSection) {
  if (section.bodyHtml) return section.bodyHtml;
  const paragraphs = section.paragraphs.map((text) => `<p>${escapeHtml(text)}</p>`).join("");
  const points = section.points?.length ? `<ul>${section.points.map((text) => `<li>${escapeHtml(text)}</li>`).join("")}</ul>` : "";
  const table = section.table?.headers.length ? `<table><thead><tr>${section.table.headers.map((text) => `<th>${escapeHtml(text)}</th>`).join("")}</tr></thead><tbody>${section.table.rows.map((row) => `<tr>${row.map((text) => `<td>${escapeHtml(text)}</td>`).join("")}</tr>`).join("")}</tbody></table>` : "";
  const image = section.image?.src ? `<img src="${escapeHtml(section.image.src)}" alt="${escapeHtml(section.image.alt)}">${section.image.caption ? `<p><em>${escapeHtml(section.image.caption)}</em></p>` : ""}` : "";
  const code = section.code?.content ? `<pre><code>${escapeHtml(section.code.content)}</code></pre>${section.code.caption ? `<p><em>${escapeHtml(section.code.caption)}</em></p>` : ""}` : "";
  return paragraphs + points + table + image + code;
}

export function articleEditorHtml(sections: BlogSection[]) {
  return sections.map((section) => `${section.heading ? `<h2>${escapeHtml(section.heading)}</h2>` : ""}${sectionBody(section)}`).join("");
}
