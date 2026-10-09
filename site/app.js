const DATA = window.NEXTGEN || [];
const S = window.STATS || {};
const PAGE = 30;
const $ = (id) => document.getElementById(id);
let shown = PAGE;

// Devpost content is user-submitted: escape everything, allow only http(s) URLs.
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const safe = (u) => (/^https?:\/\//i.test(u || "") ? esc(u) : "#");
const short = (u) => esc(String(u).replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""));
const mmss = (s) => (Number.isInteger(s) ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : "");

// YouTube refuses embeds from file:// pages (no referrer -> "Error 153"), so say how to serve it.
if (location.protocol === "file:") $("serve").hidden = false;
$("lede").textContent = `${DATA.length} Next Gen entries found by scanning all ${S.pages} gallery pages (${(S.projects || 0).toLocaleString()} projects). An entry counts as Next Gen if it links a GitHub repo, which only Next Gen requires.`;

function videoHtml(r) {
  const v = r.videos[0];
  if (!v) return `<div class="novideo">No video on Devpost</div>`;
  if (v.host === "invalid") return `<div class="novideo">Video link isn't a video: <a href="${safe(v.url)}" target="_blank" rel="noopener">${short(v.url)}</a></div>`;
  if (v.available === false) return `<div class="novideo">Video unavailable on YouTube&nbsp;<a href="${safe(v.url)}" target="_blank" rel="noopener">(check)</a></div>`;
  const src = v.host === "youtube" ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.id)}`
    : v.host === "vimeo" ? `https://player.vimeo.com/video/${encodeURIComponent(v.id)}` : null;
  if (!src) return `<div class="novideo"><a href="${safe(v.url)}" target="_blank" rel="noopener">Open video</a></div>`;
  return `<div class="video"><iframe src="${src}" title="${esc(r.title)} demo video" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"
    allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`;
}

function badges(r) {
  const b = [];
  if (r.shortlist) b.push(`<span class="badge star">Shortlist #${r.shortlist}</span>`);
  b.push(r.github_where === "try" ? `<span class="badge good">Repo in Try it out</span>` : `<span class="badge warn">GitHub in description only</span>`);
  const v = r.videos[0];
  if (v && v.seconds) b.push(`<span class="badge ${v.seconds > 125 ? "warn" : ""}">▶ ${mmss(v.seconds)}</span>`);
  const rp = r.repo || {};
  if (rp.exists === false) b.push(`<span class="badge warn">Repo not found / private</span>`);
  if (rp.exists) {
    if (rp.license_kind === "proprietary") b.push(`<span class="badge warn">Proprietary license (not open source)</span>`);
    else if (rp.license_kind === "missing") b.push(`<span class="badge warn">No license detected</span>`);
    else if (rp.license === "NOASSERTION" || (!rp.license && rp.has_license_file)) b.push(`<span class="badge warn">License not recognised by GitHub</span>`);
    else b.push(rp.license ? `<span class="badge good">${esc(rp.license)}</span>` : `<span class="badge warn">No license detected</span>`);
    if (rp.rc_hits && rp.rc_hits.length) b.push(`<span class="badge good">RevenueCat in code</span>`);
    if (rp.commits) b.push(`<span class="badge">${rp.commits} commits</span>`);
    if (rp.commit_after_deadline) b.push(`<span class="badge warn" title="Last commit ${esc(rp.last_commit)}">Commits after deadline</span>`);
  }
  if (r.store.length) b.push(`<span class="badge">Store listing</span>`);
  if (r.student_mention || r.nextgen_mention) b.push(`<span class="badge">Mentions student</span>`);
  b.push(`<span class="badge">❤️ ${r.likes}</span>`);
  return b.join("");
}

function card(r) {
  const gh = r.github.map((u) => `<a class="gh" href="${safe(u)}" target="_blank" rel="noopener">GitHub · ${short(u).replace(/^github\.com\//, "")}</a>`);
  const other = r.links.filter((u) => !/github\.com/i.test(u)).map((u) => `<a href="${safe(u)}" target="_blank" rel="noopener">${short(u)}</a>`);
  const vids = r.videos.map((v) => `<a href="${safe(v.url)}" target="_blank" rel="noopener">Video · ${short(v.url)}</a>`);
  const shots = r.images.map((i) => `<a href="${safe(i)}" target="_blank" rel="noopener"><img src="${safe(i)}" alt="${esc(r.title)} screenshot" loading="lazy"></a>`).join("");
  return `<article class="card">
    ${videoHtml(r)}
    <div class="body">
      <h2 class="title"><span class="num">#${r.n}</span><a href="${safe(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a></h2>
      ${r.tagline ? `<p class="tagline">${esc(r.tagline)}</p>` : ""}
      ${r.note ? `<p class="notice">Judge's note: ${esc(r.note)}</p>` : ""}
      <div class="team">by ${r.team.map((m) => `<a href="https://devpost.com/${encodeURIComponent(m.user)}" target="_blank" rel="noopener">${esc(m.name)}</a>`).join(", ")}</div>
      <div class="badges">${badges(r)}</div>
      <div class="links">${gh.join("")}${vids.join("")}${other.join("")}<a href="${safe(r.url)}" target="_blank" rel="noopener">Devpost submission ↗</a></div>
      ${shots ? `<div class="shots">${shots}</div>` : ""}
      ${r.built_with.length ? `<div class="tags">${r.built_with.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>` : ""}
      ${r.description ? `<details class="desc"><summary>Description</summary><div>${esc(r.description)}</div></details>` : ""}
    </div>
  </article>`;
}

function current() {
  const q = $("q").value.trim().toLowerCase();
  const f = $("filter").value;
  const sorters = {
    n: (a, b) => a.n - b.n,
    likes: (a, b) => b.likes - a.likes || a.n - b.n,
    title: (a, b) => a.title.localeCompare(b.title),
    shortlist: (a, b) => (a.shortlist || 1e9) - (b.shortlist || 1e9) || a.n - b.n,
  };
  return DATA.filter((r) => {
    if (f === "try" && r.github_where !== "try") return false;
    if (f === "desc" && r.github_where !== "desc") return false;
    if (f === "nostore" && r.store.length) return false;
    if (f === "student" && !(r.student_mention || r.nextgen_mention)) return false;
    if (f === "rc" && !(r.repo && r.repo.rc_hits && r.repo.rc_hits.length)) return false;
    if (f === "shortlist" && !r.shortlist) return false;
    if (!q) return true;
    return [r.title, r.tagline, r.description, r.built_with.join(" "), r.team.map((m) => m.name + " " + m.user).join(" "), r.github.join(" ")]
      .join(" ").toLowerCase().includes(q);
  }).sort(sorters[$("sort").value]);
}

function render() {
  const rows = current();
  $("list").innerHTML = rows.slice(0, shown).map(card).join("");
  $("count").textContent = `${rows.length} of ${DATA.length} entries`;
  $("more").hidden = shown >= rows.length;
}

const reset = () => { shown = PAGE; render(); };
$("q").addEventListener("input", reset);
$("filter").addEventListener("change", reset);
$("sort").addEventListener("change", reset);
$("more").addEventListener("click", () => { shown += PAGE; render(); });
render();
