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
  <script>${preThemeScript()}</script>
  <style>${css()}</style>
</head>
<body${home ? ' class="home"' : ""}>
  <button class="nav-toggle" type="button" aria-label="Toggle navigation" aria-expanded="false">
    <span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span>
  </button>
  <div class="shell">
    <aside class="sidebar">
      <div class="sidebar-head">
        <a class="brand" href="${hrefTo("index.html", page.outRel)}" aria-label="${productName} docs home">
          <span class="mark" aria-hidden="true"><i></i><i></i><i></i></span>
          <span><strong>${productName}</strong><small>Reminders CLI docs</small></span>
        </a>
        ${themeToggleHtml()}
      </div>
      <label class="search"><span>Search</span><input id="doc-search" type="search" placeholder="add, today, export"></label>
      <nav>${navHtml(page)}</nav>
    </aside>
    <main>
      ${home ? homeHero() : standardHero(page, sectionName, editUrl)}
      <article class="doc${home ? " doc-home" : ""}">${html}${pageNav(prev, next, page.outRel)}</article>
    </main>
  </div>
  <script>${js()}</script>
</body>
</html>`;
}

function homeHero() {
  return `<header class="home-hero">
    <div class="home-copy">
      <p class="eyebrow">macOS - EventKit - One CLI</p>
      <h1>${productTagline}</h1>
      <p class="lede">${productDescription}</p>
      <div class="home-cta">
        <a class="btn btn-primary" href="install.html">Install</a>
        <a class="btn btn-ghost" href="${repoBase}" rel="noopener">GitHub</a>
      </div>
      <div class="home-install" aria-label="Install with Homebrew"><span class="prompt" aria-hidden="true">$</span><code>${installCommand}</code></div>
    </div>
    <div class="reminder-card" aria-label="Reminder preview">
      <div class="card-bar"><span></span><span></span><span></span></div>
      <div class="time-rail" aria-hidden="true"><i></i><i></i><i></i></div>
      <ol>
        <li><time>09:00</time><strong>Ship docs polish</strong><small>Work - due today</small></li>
        <li><time>13:30</time><strong>Run e2e proof</strong><small>Terminal - JSON ready</small></li>
        <li><time>17:00</time><strong>Review release notes</strong><small>Open - synced by iCloud</small></li>
      </ol>
    </div>
  </header>`;
}

function standardHero(page, sectionName, editUrl) {
  return `<header class="hero">
    <div class="hero-text">
      <p class="eyebrow">${escapeHtml(sectionName)}</p>
      <h1>${escapeHtml(page.title)}</h1>
    </div>
    <div class="hero-meta">
      <a class="repo" href="${repoBase}" rel="noopener">GitHub</a>
      <a class="edit" href="${escapeAttr(editUrl)}" rel="noopener">Edit page</a>
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
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="remindctl">
<rect width="64" height="64" rx="14" fill="#111827"/>
<rect x="15" y="12" width="34" height="40" rx="8" fill="#f8fafc"/>
<path d="M22 10v8M42 10v8" stroke="#14b8a6" stroke-width="5" stroke-linecap="round"/>
<path d="M23 30h18M23 39h12" stroke="#111827" stroke-width="4" stroke-linecap="round"/>
<path d="M39 42l4 4 8-11" fill="none" stroke="#f59e0b" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
}

function css() {
  return `
:root{
  --ink:#111827;--text:#242a32;--muted:#687383;--subtle:#9aa3af;--bg:#fafafa;--paper:#ffffff;--line:#e5e7eb;--line-soft:#f3f4f6;
  --accent:#0f766e;--accent-soft:rgba(15,118,110,.12);--accent-strong:#115e59;--gold:#d97706;--rose:#e11d48;
  --code-bg:#101827;--code-fg:#e6edf3;--code-inline-fg:#172033;--shadow-card:0 8px 28px rgba(35,31,24,.09);
}
:root[data-theme="dark"]{
  --ink:#f5f7fb;--text:#cad1dc;--muted:#8d96a4;--subtle:#5d6472;--bg:#0d1117;--paper:#161b22;--line:#2a303a;--line-soft:#1f252e;
  --accent:#5eead4;--accent-soft:rgba(94,234,212,.13);--accent-strong:#99f6e4;--gold:#fbbf24;--rose:#fb7185;
  --code-bg:#070b12;--code-fg:#edf2f7;--code-inline-fg:#e6edf3;--shadow-card:0 8px 28px rgba(0,0,0,.42);
}
:root{color-scheme:light}:root[data-theme="dark"]{color-scheme:dark}
*{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:24px}
body{margin:0;background:var(--bg);color:var(--text);font-family:"Inter",ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.65;overflow-x:hidden;-webkit-font-smoothing:antialiased;transition:background-color .18s,color .18s}
::selection{background:var(--accent);color:#fff}
a{color:var(--accent);text-decoration:none;transition:color .12s}a:hover{text-decoration:underline;text-underline-offset:.2em}
.shell{display:grid;grid-template-columns:268px minmax(0,1fr);min-height:100vh}
.sidebar{position:sticky;top:0;height:100vh;overflow:auto;background:var(--paper);border-right:1px solid var(--line);padding:24px 22px;scrollbar-width:thin;scrollbar-color:var(--line) transparent;transition:background-color .18s,border-color .18s}
.sidebar::-webkit-scrollbar{width:6px}.sidebar::-webkit-scrollbar-thumb{background:var(--line);border-radius:6px}
.sidebar-head{display:flex;align-items:center;gap:10px;margin-bottom:24px}
.brand{display:flex;gap:11px;align-items:center;color:var(--ink);flex:1;min-width:0}.brand:hover{text-decoration:none}
.brand strong{display:block;font-size:1.05rem;line-height:1.1;font-weight:650;letter-spacing:0;color:var(--ink)}.brand small{display:block;color:var(--muted);font-size:.74rem;margin-top:3px;font-weight:400}
.brand .mark{position:relative;display:block;width:29px;height:29px;border-radius:8px;background:var(--ink);box-shadow:inset 0 -9px 0 rgba(255,255,255,.08);flex:0 0 auto}
.brand .mark i{position:absolute;left:7px;right:7px;height:2px;border-radius:2px;background:var(--paper);opacity:.95}.brand .mark i:nth-child(1){top:9px}.brand .mark i:nth-child(2){top:15px}.brand .mark i:nth-child(3){top:21px;width:9px;right:auto}.brand .mark:after{content:"";position:absolute;right:-2px;bottom:-2px;width:10px;height:10px;border-radius:50%;background:var(--gold);box-shadow:0 0 0 3px var(--paper)}
.theme-toggle{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;width:34px;height:34px;border-radius:8px;border:1px solid var(--line);background:var(--paper);color:var(--muted);cursor:pointer;padding:0;transition:border-color .15s,color .15s,background-color .15s,transform .12s}
.theme-toggle:hover{border-color:var(--ink);color:var(--ink)}.theme-toggle:active{transform:scale(.94)}.theme-toggle svg{width:16px;height:16px;display:block}.theme-icon-sun{display:none}:root[data-theme="dark"] .theme-icon-sun{display:block}:root[data-theme="dark"] .theme-icon-moon{display:none}
.search{display:block;margin:0 0 22px}.search span,nav h2,.eyebrow{display:block;color:var(--muted);font-size:.68rem;font-weight:650;text-transform:uppercase;letter-spacing:0;margin:0 0 7px}
.search input{width:100%;border:1px solid var(--line);background:var(--paper);border-radius:8px;padding:9px 12px;font:inherit;font-size:.9rem;color:var(--text);outline:none;transition:border-color .15s,box-shadow .15s,background-color .18s}.search input:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
nav section{margin:0 0 18px}.nav-link{display:block;color:var(--text);border-radius:6px;padding:5px 10px;margin:1px 0;font-size:.9rem;line-height:1.4;transition:background .12s,color .12s}.nav-link:hover{background:var(--line-soft);color:var(--ink);text-decoration:none}.nav-link.active{background:var(--accent-soft);color:var(--accent);font-weight:650}
main{width:100%;max-width:1180px;margin:0 auto;padding:32px clamp(20px,4.5vw,56px) 80px;min-width:0}
.hero{display:flex;align-items:flex-end;justify-content:space-between;gap:22px;border-bottom:1px solid var(--line);padding:8px 0 22px;margin-bottom:26px;flex-wrap:wrap}.hero-text{min-width:0;flex:1 1 320px}
.hero h1,.home-hero h1{margin:0;color:var(--ink);line-height:1.08;letter-spacing:0}.hero h1{font-size:2.25rem;font-weight:720}.hero-meta{display:flex;gap:8px;flex:0 0 auto;flex-wrap:wrap}
.repo,.edit,.btn{border:1px solid var(--line);border-radius:8px;padding:7px 12px;color:var(--text);background:var(--paper);font-weight:600;font-size:.86rem;text-decoration:none;transition:border-color .15s,color .15s,background .15s,transform .12s}.repo:hover,.edit:hover,.btn:hover{text-decoration:none;border-color:var(--ink);color:var(--ink)}.edit{color:var(--muted)}
.home-hero{display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,410px);gap:36px;align-items:center;border-bottom:1px solid var(--line);padding:12px 0 34px;margin-bottom:30px}
.home-hero h1{font-size:3.35rem;font-weight:760;max-width:12ch}.lede{font-size:1.18rem;line-height:1.55;max-width:58ch;margin:16px 0 20px}.home-cta{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:0 0 14px}.btn-primary{background:var(--accent);border-color:var(--accent);color:#fff}.btn-primary:hover{background:var(--accent-strong);border-color:var(--accent-strong);color:#fff}
.home-install{position:relative;display:inline-flex;gap:12px;align-items:center;max-width:100%;background:var(--code-bg);color:var(--code-fg);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:10px 12px 10px 16px;font:500 .9rem/1.2 "JetBrains Mono","SF Mono",ui-monospace,monospace;box-shadow:var(--shadow-card)}.home-install .prompt{color:#8391a6;user-select:none}.home-install code{background:transparent;border:0;color:inherit;font:inherit;padding:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.copy{background:rgba(255,255,255,.08);color:var(--code-fg);border:1px solid rgba(255,255,255,.16);border-radius:6px;padding:5px 10px;font:600 .7rem/1 ui-sans-serif,system-ui,sans-serif;cursor:pointer;transition:background .15s,border-color .15s}.copy:hover{background:rgba(255,255,255,.16)}.copy.copied{background:var(--accent);border-color:var(--accent)}
.reminder-card{position:relative;overflow:hidden;background:var(--paper);border:1px solid var(--line);border-radius:8px;padding:18px 18px 16px;box-shadow:var(--shadow-card);min-height:286px}.reminder-card:before{content:"";position:absolute;inset:0;background:linear-gradient(135deg,rgba(15,118,110,.12),transparent 38%),linear-gradient(315deg,rgba(217,119,6,.12),transparent 38%);pointer-events:none}.card-bar{position:relative;display:flex;gap:6px;margin-bottom:18px}.card-bar span{width:9px;height:9px;border-radius:50%;background:var(--line)}.card-bar span:nth-child(1){background:var(--rose)}.card-bar span:nth-child(2){background:var(--gold)}.card-bar span:nth-child(3){background:var(--accent)}
.time-rail{position:absolute;top:62px;bottom:28px;left:35px;width:2px;background:var(--line)}.time-rail i{position:absolute;left:50%;width:12px;height:12px;border-radius:50%;transform:translateX(-50%);background:var(--paper);border:2px solid var(--accent)}.time-rail i:nth-child(1){top:2px}.time-rail i:nth-child(2){top:72px;border-color:var(--gold)}.time-rail i:nth-child(3){top:144px;border-color:var(--rose)}
.reminder-card ol{position:relative;list-style:none;margin:0;padding:0 0 0 36px}.reminder-card li{margin:0 0 14px;padding:11px 12px;border:1px solid var(--line);border-radius:8px;background:color-mix(in srgb,var(--paper) 88%,var(--bg));min-height:58px}.reminder-card time{display:block;color:var(--muted);font:600 .74rem/1.2 "JetBrains Mono","SF Mono",ui-monospace,monospace;margin-bottom:4px}.reminder-card strong{display:block;color:var(--ink);font-size:.94rem;line-height:1.25}.reminder-card small{display:block;color:var(--muted);font-size:.78rem;margin-top:2px}
.doc{max-width:74ch;min-width:0;overflow-wrap:break-word}.doc-home{max-width:78ch}body:not(.home) .doc>h1:first-child{display:none}.doc h1{font-size:2.45rem;line-height:1.08;color:var(--ink);margin:0 0 .6em;letter-spacing:0}.doc h2{font-size:1.45rem;line-height:1.2;color:var(--ink);margin:2em 0 .5em;letter-spacing:0}.doc h3{font-size:1.12rem;color:var(--ink);margin:1.6em 0 .35em;letter-spacing:0}.doc h4{color:var(--ink);margin:1.4em 0 .25em}.doc h1:first-child,.doc h2:first-child{margin-top:0}.doc p{margin:0 0 1.05em}.doc ul,.doc ol{padding-left:1.35rem;margin:0 0 1.15em}.doc li{margin:.25em 0}.doc strong{color:var(--ink);font-weight:650}
.anchor{float:left;margin-left:-1em;color:var(--subtle);opacity:0}.doc :is(h1,h2,h3,h4):hover .anchor{opacity:.75}.anchor:hover{opacity:1;text-decoration:none}
.doc code{font-family:"JetBrains Mono","SF Mono",ui-monospace,monospace;background:var(--line-soft);border:1px solid var(--line);border-radius:5px;padding:.08em .35em;font-size:.84em;color:var(--code-inline-fg)}.doc pre{position:relative;background:var(--code-bg);color:var(--code-fg);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:15px 18px;overflow:auto;font-size:.86rem;line-height:1.6;scrollbar-width:thin;scrollbar-color:#334155 transparent}.doc pre code{display:block;background:transparent;border:0;padding:0;color:inherit;font-size:1em;white-space:pre}.doc pre .copy{position:absolute;top:8px;right:8px;opacity:0}.doc pre:hover .copy,.doc pre .copy:focus{opacity:1}
.doc table{width:100%;border-collapse:collapse;margin:1.2em 0;font-size:.92em}.doc th,.doc td{border-bottom:1px solid var(--line);padding:9px 10px;text-align:left;vertical-align:top}.doc th{color:var(--ink);background:var(--line-soft);font-weight:650}
.page-nav{display:grid;grid-template-columns:1fr 1fr;gap:14px;border-top:1px solid var(--line);margin-top:44px;padding-top:20px}.page-nav a{display:block;border:1px solid var(--line);border-radius:8px;padding:12px 14px;color:var(--text);background:var(--paper);transition:border-color .15s,transform .15s,box-shadow .15s}.page-nav a:hover{text-decoration:none;border-color:var(--accent);color:var(--ink)}.page-nav small{display:block;color:var(--muted);font-size:.68rem;text-transform:uppercase;font-weight:650}.page-nav span{display:block;color:var(--ink);font-weight:650}.page-nav .next{text-align:right;grid-column:2}
.nav-toggle{display:none;position:fixed;top:14px;right:14px;top:calc(14px + env(safe-area-inset-top,0px));right:calc(14px + env(safe-area-inset-right,0px));z-index:20;width:40px;height:40px;border-radius:9px;background:var(--paper);border:1px solid var(--line);color:var(--ink);cursor:pointer;padding:10px 9px;flex-direction:column;align-items:stretch;justify-content:space-between;box-shadow:var(--shadow-card)}.nav-toggle span{display:block;width:100%;height:2px;background:currentColor;border-radius:2px;transition:transform .2s,opacity .2s}.nav-toggle[aria-expanded="true"] span:nth-child(1){transform:translateY(8px) rotate(45deg)}.nav-toggle[aria-expanded="true"] span:nth-child(2){opacity:0}.nav-toggle[aria-expanded="true"] span:nth-child(3){transform:translateY(-8px) rotate(-45deg)}
@media(max-width:960px){.home-hero{grid-template-columns:1fr;gap:22px}.reminder-card{max-width:540px}.home-hero h1{font-size:2.7rem}}
@media(max-width:860px){.shell{display:block}.sidebar{position:fixed;inset:0 30% 0 0;max-width:320px;z-index:15;transform:translateX(-100%);transition:transform .25s ease,background-color .18s,border-color .18s;box-shadow:0 18px 40px rgba(0,0,0,.18);pointer-events:none}.sidebar.open{transform:translateX(0);pointer-events:auto}.nav-toggle{display:flex}main{padding:64px 18px 56px}.hero{display:block}.hero h1{font-size:1.9rem}.hero-meta{margin-top:14px}.home-hero{padding-top:8px}.home-hero h1{font-size:2.35rem}.doc h1{font-size:2rem}.anchor{display:none}}
@media(max-width:520px){main{padding:60px 14px 48px}.home-hero h1{font-size:2.15rem}.home-install{display:flex;width:100%}.reminder-card{padding:16px 14px}.doc pre{margin-left:-14px;margin-right:-14px;border-radius:0;border-left:0;border-right:0}.page-nav{grid-template-columns:1fr}.page-nav .next{grid-column:1;text-align:left}}
`;
}

function js() {
  return `
const root=document.documentElement;
function applyTheme(mode){root.dataset.theme=mode;document.querySelectorAll('[data-theme-toggle]').forEach((button)=>button.setAttribute('aria-pressed',mode==='dark'?'true':'false'))}
function storedTheme(){try{return localStorage.getItem('theme')}catch(e){return null}}
function persistTheme(mode){try{localStorage.setItem('theme',mode)}catch(e){}}
applyTheme(root.dataset.theme==='dark'?'dark':'light');
document.querySelectorAll('[data-theme-toggle]').forEach((button)=>button.addEventListener('click',()=>{const next=root.dataset.theme==='dark'?'light':'dark';applyTheme(next);persistTheme(next)}));
const systemDark=window.matchMedia&&matchMedia('(prefers-color-scheme: dark)');
function onSystemChange(event){if(storedTheme())return;applyTheme(event.matches?'dark':'light')}
if(systemDark){if(systemDark.addEventListener)systemDark.addEventListener('change',onSystemChange);else if(systemDark.addListener)systemDark.addListener(onSystemChange)}
const sidebar=document.querySelector('.sidebar');
const toggle=document.querySelector('.nav-toggle');
const mobileNav=window.matchMedia('(max-width: 860px)');
function setSidebarOpen(open){
  if(!sidebar||!toggle)return;
  sidebar.classList.toggle('open',open);
  toggle.setAttribute('aria-expanded',open?'true':'false');
  if(mobileNav.matches){
    sidebar.inert=!open;
    if(open)sidebar.removeAttribute('aria-hidden');else sidebar.setAttribute('aria-hidden','true');
  }else{
    sidebar.inert=false;
    sidebar.removeAttribute('aria-hidden');
  }
}
setSidebarOpen(false);
toggle?.addEventListener('click',()=>setSidebarOpen(!sidebar?.classList.contains('open')));
document.addEventListener('click',(event)=>{if(!sidebar?.classList.contains('open'))return;if(sidebar.contains(event.target)||toggle?.contains(event.target))return;setSidebarOpen(false)});
document.addEventListener('keydown',(event)=>{if(event.key==='Escape')setSidebarOpen(false)});
if(mobileNav.addEventListener)mobileNav.addEventListener('change',()=>setSidebarOpen(sidebar?.classList.contains('open')??false));
const search=document.querySelector('#doc-search');
search?.addEventListener('input',()=>{const q=search.value.toLowerCase().trim();document.querySelectorAll('nav section').forEach((section)=>{let any=false;section.querySelectorAll('.nav-link').forEach((link)=>{const match=!q||link.textContent.toLowerCase().includes(q);link.style.display=match?'block':'none';if(match)any=true});section.style.display=any?'block':'none'})});
function attachCopy(target,getText){const button=document.createElement('button');button.type='button';button.className='copy';button.textContent='Copy';button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(getText());button.textContent='Copied';button.classList.add('copied');setTimeout(()=>{button.textContent='Copy';button.classList.remove('copied')},1400)}catch{button.textContent='Failed';setTimeout(()=>{button.textContent='Copy'},1400)}});target.appendChild(button)}
document.querySelectorAll('.doc pre').forEach((pre)=>attachCopy(pre,()=>pre.querySelector('code')?.textContent??''));
document.querySelectorAll('.home-install').forEach((el)=>attachCopy(el,()=>el.querySelector('code')?.textContent??''));
`;
}

function preThemeScript() {
  return `(function(){var stored;try{stored=localStorage.getItem('theme')}catch(e){}var dark=window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=stored||(dark?'dark':'light')})();`;
}

function themeToggleHtml() {
  return `<button class="theme-toggle" type="button" aria-label="Toggle dark mode" aria-pressed="false" data-theme-toggle>
    <svg class="theme-icon-moon" viewBox="0 0 20 20" aria-hidden="true"><path d="M14.6 12.1A6.5 6.5 0 0 1 7.4 2.7a6.5 6.5 0 1 0 7.2 9.4z" fill="currentColor"/></svg>
    <svg class="theme-icon-sun" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="3.4" fill="currentColor"/><g stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><line x1="10" y1="2" x2="10" y2="4"/><line x1="10" y1="16" x2="10" y2="18"/><line x1="2" y1="10" x2="4" y2="10"/><line x1="16" y1="10" x2="18" y2="10"/><line x1="4.2" y1="4.2" x2="5.6" y2="5.6"/><line x1="14.4" y1="14.4" x2="15.8" y2="15.8"/><line x1="4.2" y1="15.8" x2="5.6" y2="14.4"/><line x1="14.4" y1="5.6" x2="15.8" y2="4.2"/></g></svg>
  </button>`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function escapeAttr(value) {
  return escapeHtml(value);
}
