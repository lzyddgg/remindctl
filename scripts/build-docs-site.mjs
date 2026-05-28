#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs");
const outDir = path.join(root, "dist", "docs-site");
const repoBase = "https://github.com/openclaw/remindctl";
const repoEditBase = `${repoBase}/edit/main/docs`;
const cname = readCname();
const siteBase = cname ? `https://${cname}` : "";
const productName = "remindctl";
const productTagline = "Apple Reminders in your terminal";
const productDescription = "A fast macOS CLI for Apple Reminders, built for terminals, scripts, and agents.";
const installCommand = "brew install steipete/tap/remindctl";

const sections = [
  ["Start", ["index.md", "install.md", "commands.md", "permissions.md"]],
  ["Reference", ["manual-tests.md"]],
];
const buildExcludes = new Set(["RELEASING.md"]);

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const allPages = allMarkdown(docsDir).map((file) => {
  const rel = path.relative(docsDir, file).replaceAll(path.sep, "/");
  const raw = fs.readFileSync(file, "utf8");
  const { frontmatter, body } = parseFrontmatter(raw);
  const title = frontmatter.title || firstHeading(body) || titleize(path.basename(rel, ".md"));
  return { file, rel, title, outRel: outPath(rel, frontmatter), markdown: body.trim(), frontmatter };
});

const pages = allPages.filter((page) => page.rel !== "CNAME" && !buildExcludes.has(page.rel));
const pageMap = new Map(pages.map((page) => [page.rel, page]));
const nav = sections
  .map(([name, rels]) => ({ name, pages: rels.map((rel) => pageMap.get(rel)).filter(Boolean) }))
  .filter((section) => section.pages.length);
const sectionByRel = new Map();
for (const section of nav) for (const page of section.pages) sectionByRel.set(page.rel, section.name);
const orderedPages = nav.flatMap((section) => section.pages);

for (const page of pages) {
  const markdown = page.outRel === "index.html" ? page.markdown : stripDuplicateTitle(page.markdown, page.title);
  const html = markdownToHtml(markdown, page.rel);
  const idx = orderedPages.findIndex((p) => p.rel === page.rel);
  const prev = idx > 0 ? orderedPages[idx - 1] : null;
  const next = idx >= 0 && idx < orderedPages.length - 1 ? orderedPages[idx + 1] : null;
  const pageOut = path.join(outDir, page.outRel);
  fs.mkdirSync(path.dirname(pageOut), { recursive: true });
  fs.writeFileSync(pageOut, layout({ page, html, prev, next, sectionName: sectionByRel.get(page.rel) || "Reference" }), "utf8");
}

fs.writeFileSync(path.join(outDir, "favicon.svg"), faviconSvg(), "utf8");
fs.writeFileSync(path.join(outDir, ".nojekyll"), "", "utf8");
fs.writeFileSync(path.join(outDir, "llms.txt"), llmsTxt(), "utf8");
if (cname) fs.writeFileSync(path.join(outDir, "CNAME"), cname, "utf8");
validateLinks(outDir);
console.log(`built docs site: ${path.relative(root, outDir)}`);

function layout({ page, html, prev, next, sectionName }) {
  const depth = page.outRel.split("/").length - 1;
  const rootPrefix = depth ? "../".repeat(depth) : "";
  const home = page.outRel === "index.html";
  const title = home ? `${productName} - ${productTagline}` : `${page.title} - ${productName}`;
  const description = page.frontmatter.description || (home ? productDescription : `${page.title} documentation for ${productName}.`);
  const canonicalUrl = canonical(page);
  const editUrl = `${repoEditBase}/${page.rel}`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeAttr(description)}">
  <link rel="canonical" href="${escapeAttr(canonicalUrl)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="${escapeAttr(productName)}">
  <meta property="og:title" content="${escapeAttr(title)}">
  <meta property="og:description" content="${escapeAttr(description)}">
  <meta property="og:url" content="${escapeAttr(canonicalUrl)}">
  <meta name="twitter:card" content="summary">
  <link rel="icon" href="${rootPrefix}favicon.svg" type="image/svg+xml">
  <style>${css()}</style>
</head>
<body${home ? ' class="home"' : ""}>
  <button class="nav-toggle" type="button" aria-label="Toggle navigation" aria-expanded="false"><span></span><span></span><span></span></button>
  <div class="shell">
    <aside class="sidebar">
      <a class="brand" href="${hrefTo("index.html", page.outRel)}">
        <span class="mark" aria-hidden="true"></span>
        <span><strong>${productName}</strong><small>Reminders CLI docs</small></span>
      </a>
      <label class="search"><span>Search</span><input id="doc-search" type="search" placeholder="add, due, json"></label>
      <nav>${navHtml(page)}</nav>
    </aside>
    <main>
      ${home ? homeHero() : standardHero(page, sectionName, editUrl)}
      <article class="doc">${html}${pageNav(prev, next, page.outRel)}</article>
    </main>
  </div>
  <script>${js()}</script>
</body>
</html>`;
}

function homeHero() {
  return `<header class="home-hero">
    <p class="eyebrow">macOS - EventKit - One CLI</p>
    <h1>${productTagline}</h1>
    <p class="lede">${productDescription}</p>
    <div class="home-cta">
      <a class="btn btn-primary" href="install.html">Install</a>
      <a class="btn btn-ghost" href="${repoBase}" rel="noopener">GitHub</a>
      <div class="home-install"><span>$</span><code>${installCommand}</code></div>
    </div>
  </header>`;
}

function standardHero(page, sectionName, editUrl) {
  return `<header class="hero">
    <div>
      <p class="eyebrow">${escapeHtml(sectionName)}</p>
      <h1>${escapeHtml(page.title)}</h1>
    </div>
    <div class="hero-meta">
      <a href="${repoBase}" rel="noopener">GitHub</a>
      <a href="${escapeAttr(editUrl)}" rel="noopener">Edit page</a>
    </div>
  </header>`;
}

function navHtml(currentPage) {
  return nav.map((section) => `<section><h2>${escapeHtml(section.name)}</h2>${section.pages.map((page) => {
    const active = page.rel === currentPage.rel ? " active" : "";
    return `<a class="nav-link${active}" href="${hrefTo(page.outRel, currentPage.outRel)}">${escapeHtml(navTitle(page))}</a>`;
  }).join("")}</section>`).join("");
}

function pageNav(prev, next, currentOutRel) {
  if (!prev && !next) return "";
  const cell = (page, dir) => page ? `<a class="${dir}" href="${hrefTo(page.outRel, currentOutRel)}"><small>${dir === "prev" ? "Previous" : "Next"}</small><span>${escapeHtml(page.title)}</span></a>` : "";
  return `<nav class="page-nav">${cell(prev, "prev")}${cell(next, "next")}</nav>`;
}

function markdownToHtml(markdown, rel) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let paragraph = [];
  let list = null;
  let fence = null;
  let table = [];
  const flushParagraph = () => {
    if (!paragraph.length) return;
    out.push(`<p>${inline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (!list) return;
    out.push(`<${list.type}>${list.items.map((item) => `<li>${inline(item)}</li>`).join("")}</${list.type}>`);
    list = null;
  };
  const flushTable = () => {
    if (!table.length) return;
    const rows = table.map((line) => line.trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()));
    const body = rows.filter((_, i) => i !== 1).map((cells, i) => {
      const tag = i === 0 ? "th" : "td";
      return `<tr>${cells.map((cell) => `<${tag}>${inline(cell)}</${tag}>`).join("")}</tr>`;
    }).join("");
    out.push(`<table>${body}</table>`);
    table = [];
  };

  for (const line of lines) {
    const fenceMatch = line.match(/^\s*```([A-Za-z0-9_-]*)\s*$/);
    if (fenceMatch) {
      if (fence) {
        out.push(`<pre><code>${escapeHtml(fence.lines.join("\n"))}</code></pre>`);
        fence = null;
      } else {
        flushParagraph(); flushList(); flushTable();
        fence = { lang: fenceMatch[1], lines: [] };
      }
      continue;
    }
    if (fence) {
      fence.lines.push(line);
      continue;
    }
    if (!line.trim()) {
      flushParagraph(); flushList(); flushTable();
      continue;
    }
    if (line.includes("|") && /^\s*\|?[-:| ]+\|[-:| ]+\|?\s*$/.test(lines[lines.indexOf(line) + 1] || "")) {
      flushParagraph(); flushList();
      table.push(line);
      continue;
    }
    if (table.length || /^\s*\|?[-:| ]+\|[-:| ]+\|?\s*$/.test(line)) {
      table.push(line);
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.+)$/);
    if (h) {
      flushParagraph(); flushList(); flushTable();
      const level = h[1].length;
      const text = h[2].trim();
      const id = slug(text);
      out.push(`<h${level} id="${id}"><a class="anchor" href="#${id}">#</a>${inline(text)}</h${level}>`);
      continue;
    }
    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    const ordered = line.match(/^\s*\d+\.\s+(.+)$/);
    if (bullet || ordered) {
      flushParagraph(); flushTable();
      const type = bullet ? "ul" : "ol";
      if (!list || list.type !== type) flushList();
      if (!list) list = { type, items: [] };
      list.items.push((bullet || ordered)[1]);
      continue;
    }
    paragraph.push(line.trim());
  }
  flushParagraph(); flushList(); flushTable();
  return out.join("\n");

  function inline(value) {
    let html = escapeHtml(value);
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, href) => `<a href="${escapeAttr(rewriteHref(href, rel))}">${escapeHtml(text)}</a>`);
    return html;
  }
}

function readCname() {
  const file = path.join(docsDir, "CNAME");
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8").trim() : "";
}

function allMarkdown(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return allMarkdown(full);
    return entry.name.endsWith(".md") ? [full] : [];
  }).sort();
}

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { frontmatter: {}, body: raw };
  const frontmatter = {};
  for (const line of match[1].split("\n")) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*?)\s*$/);
    if (!m) continue;
    frontmatter[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return { frontmatter, body: raw.slice(match[0].length) };
}

function outPath(rel, frontmatter = {}) {
  if (frontmatter.permalink === "/") return "index.html";
  if (rel === "index.md" || rel === "README.md") return "index.html";
  return rel.replace(/\.md$/, ".html");
}

function navTitle(page) {
  if (page.rel === "index.md") return "Overview";
  return page.title;
}

function firstHeading(markdown) {
  return markdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
}

function stripDuplicateTitle(markdown, title) {
  const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return markdown.replace(new RegExp(`^#\\s+${escaped}\\s*\\n+`), "");
}

function titleize(value) {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function slug(text) {
  return text.toLowerCase().replace(/`/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function hrefTo(targetOutRel, currentOutRel) {
  const currentDir = path.posix.dirname(currentOutRel);
  return path.posix.relative(currentDir, targetOutRel) || path.posix.basename(targetOutRel);
}

function rewriteHref(href, rel) {
  if (/^[a-z]+:/i.test(href) || href.startsWith("#")) return href;
  if (href.endsWith(".md")) return href.replace(/\.md$/, ".html");
  return href;
}

function canonical(page) {
  if (!siteBase) return page.outRel;
  if (page.outRel === "index.html") return `${siteBase}/`;
  return `${siteBase}/${page.outRel}`;
}

function llmsTxt() {
  const lines = [
    `# ${productName}`,
    "",
    productDescription,
    "",
    "Canonical documentation:",
    ...orderedPages.map((page) => `- ${page.title}: ${canonical(page)}`),
    "",
    "Install:",
    `- ${installCommand}`,
    "",
    `Source: ${repoBase}`,
  ];
  return `${lines.join("\n")}\n`;
}

function validateLinks(dir) {
  const files = fs.readdirSync(dir, { recursive: true }).filter((file) => String(file).endsWith(".html"));
  const failures = [];
  for (const file of files) {
    const full = path.join(dir, file);
    const html = fs.readFileSync(full, "utf8");
    for (const match of html.matchAll(/href="([^"]+)"/g)) {
      const href = match[1];
      if (/^[a-z]+:/i.test(href) || href.startsWith("#") || href.startsWith("mailto:")) continue;
      const target = path.resolve(path.dirname(full), href.split("#")[0]);
      if (!fs.existsSync(target)) failures.push(`${file} -> ${href}`);
    }
  }
  if (failures.length) throw new Error(`broken docs links:\n${failures.join("\n")}`);
}

function faviconSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#111827"/><path d="M18 18h28v6H18zM18 30h28v6H18zM18 42h18v6H18z" fill="#fff"/><path d="M42 39l5 5 9-12" fill="none" stroke="#5eead4" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

function css() {
  return `
:root{--ink:#111827;--text:#1f2937;--muted:#6b7280;--bg:#f8fafc;--paper:#fff;--line:#e5e7eb;--accent:#0f766e;--accent-soft:#ccfbf1;--code:#0b1220;--code-fg:#e5e7eb}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.65;-webkit-font-smoothing:antialiased}a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline;text-underline-offset:.2em}.shell{display:grid;grid-template-columns:270px minmax(0,1fr);min-height:100vh}.sidebar{position:sticky;top:0;height:100vh;overflow:auto;background:var(--paper);border-right:1px solid var(--line);padding:24px}.brand{display:flex;gap:11px;align-items:center;color:var(--ink);margin-bottom:24px}.brand:hover{text-decoration:none}.brand strong{display:block;font-size:1.05rem;line-height:1}.brand small{display:block;color:var(--muted);font-size:.74rem;margin-top:3px}.mark{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#0f766e,#5eead4);box-shadow:inset 0 0 0 1px rgba(255,255,255,.35)}.search{display:block;margin-bottom:22px}.search span,nav h2,.eyebrow{display:block;color:var(--muted);font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0;margin:0 0 7px}.search input{width:100%;border:1px solid var(--line);background:var(--paper);border-radius:8px;padding:9px 11px;font:inherit;color:var(--text);outline:none}.search input:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}nav section{margin-bottom:18px}.nav-link{display:block;color:var(--text);border-radius:6px;padding:5px 10px;margin:1px 0;font-size:.92rem}.nav-link:hover{background:#f3f4f6;text-decoration:none}.nav-link.active{background:var(--accent-soft);color:#115e59;font-weight:700}main{width:100%;max-width:1040px;margin:0 auto;padding:36px clamp(20px,5vw,64px) 80px}.hero,.home-hero{border-bottom:1px solid var(--line);padding:8px 0 24px;margin-bottom:26px}.hero{display:flex;justify-content:space-between;gap:18px;align-items:flex-end}.hero h1,.home-hero h1{margin:0;color:var(--ink);line-height:1.08;letter-spacing:0}.hero h1{font-size:2.2rem}.home-hero h1{font-size:3.1rem;max-width:12ch}.lede{font-size:1.18rem;max-width:58ch;margin:16px 0 20px}.hero-meta{display:flex;gap:8px;flex-wrap:wrap}.hero-meta a,.btn{border:1px solid var(--line);border-radius:8px;padding:7px 12px;color:var(--text);background:var(--paper);font-weight:600;font-size:.88rem}.hero-meta a:hover,.btn:hover{text-decoration:none;border-color:var(--accent);color:var(--accent)}.home-cta{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.btn-primary{background:var(--accent);border-color:var(--accent);color:white}.btn-primary:hover{background:#115e59;color:white}.home-install{display:flex;gap:10px;align-items:center;background:var(--code);color:var(--code-fg);border-radius:8px;padding:10px 14px;font:500 .9rem/1.2 ui-monospace,SFMono-Regular,Menlo,monospace}.home-install span{color:#94a3b8}.doc{max-width:74ch}.doc h1{font-size:2.45rem;line-height:1.08;color:var(--ink);margin:0 0 .6em}.doc h2{font-size:1.45rem;line-height:1.2;color:var(--ink);margin:2em 0 .5em}.doc h3{font-size:1.12rem;color:var(--ink);margin:1.6em 0 .35em}.doc h1:first-child,.doc h2:first-child{margin-top:0}.anchor{float:left;margin-left:-1em;color:#9ca3af;opacity:0}.doc :is(h1,h2,h3,h4):hover .anchor{opacity:1}.doc code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:#f3f4f6;border:1px solid var(--line);border-radius:5px;padding:.08em .34em;font-size:.86em}.doc pre{background:var(--code);color:var(--code-fg);border-radius:8px;padding:15px 18px;overflow:auto;font-size:.88rem}.doc pre code{background:transparent;border:0;padding:0;color:inherit;font-size:1em}.doc table{width:100%;border-collapse:collapse;margin:1.2em 0}.doc th,.doc td{border-bottom:1px solid var(--line);padding:8px 10px;text-align:left}.doc th{color:var(--ink);background:#f3f4f6}.doc ul,.doc ol{padding-left:1.35rem}.page-nav{display:grid;grid-template-columns:1fr 1fr;gap:14px;border-top:1px solid var(--line);margin-top:44px;padding-top:20px}.page-nav a{border:1px solid var(--line);border-radius:8px;padding:12px 14px;color:var(--text);background:var(--paper)}.page-nav a:hover{text-decoration:none;border-color:var(--accent)}.page-nav small{display:block;color:var(--muted);font-size:.68rem;text-transform:uppercase;font-weight:700}.page-nav span{display:block;color:var(--ink);font-weight:700}.page-nav .next{text-align:right;grid-column:2}.nav-toggle{display:none}
@media(max-width:860px){.shell{display:block}.sidebar{position:fixed;inset:0 28% 0 0;z-index:10;transform:translateX(-100%);transition:transform .2s;box-shadow:0 18px 40px rgba(0,0,0,.18)}.sidebar.open{transform:translateX(0)}.nav-toggle{display:flex;position:fixed;top:14px;right:14px;z-index:20;width:40px;height:40px;border:1px solid var(--line);border-radius:9px;background:var(--paper);padding:10px 9px;flex-direction:column;justify-content:space-between}.nav-toggle span{height:2px;background:var(--ink)}main{padding:64px 18px 56px}.hero{display:block}.hero-meta{margin-top:14px}.home-hero h1{font-size:2.35rem}.doc h1{font-size:2rem}}
`;
}

function js() {
  return `
const sidebar=document.querySelector('.sidebar');
const toggle=document.querySelector('.nav-toggle');
toggle?.addEventListener('click',()=>{const open=!sidebar.classList.contains('open');sidebar.classList.toggle('open',open);toggle.setAttribute('aria-expanded',open?'true':'false')});
document.addEventListener('click',(event)=>{if(!sidebar?.classList.contains('open'))return;if(sidebar.contains(event.target)||toggle?.contains(event.target))return;sidebar.classList.remove('open');toggle?.setAttribute('aria-expanded','false')});
const search=document.querySelector('#doc-search');
const links=[...document.querySelectorAll('.nav-link')];
search?.addEventListener('input',()=>{const q=search.value.toLowerCase().trim();links.forEach((link)=>{link.style.display=!q||link.textContent.toLowerCase().includes(q)?'block':'none'})});
`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function escapeAttr(value) {
  return escapeHtml(value);
}
