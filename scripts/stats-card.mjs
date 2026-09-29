// Renders the self-hosted profile images (light + dark) for the READMEs:
//   profile-card.svg — terminal-style card for README.md, content from profile.config.json
//   stats.svg        — stats + top languages card for README-creative.md
//
// Usage:
//   GITHUB_TOKEN=... USERNAME=octocat node scripts/stats-card.mjs dist
//   node scripts/stats-card.mjs dist --fixture data.json   # render from saved API data
//
// Uses only the public GraphQL API, so the default Actions GITHUB_TOKEN is enough.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const outDir = process.argv[2] ?? "dist";
const fixtureIdx = process.argv.indexOf("--fixture");
const username = process.env.USERNAME ?? "AkashProfessionalCoder";
// Languages that come from generated platform folders rather than code Akash writes.
const IGNORED_LANGS = new Set(["HTML", "CSS", "CMake", "C++", "C", "Objective-C", "Ruby", "Makefile", "Batchfile", "Shell"]);

const QUERY = `query($login: String!) {
  user(login: $login) {
    name
    avatarUrl(size: 240)
    followers { totalCount }
    pullRequests { totalCount }
    repositories(ownerAffiliations: OWNER, isFork: false, first: 100, privacy: PUBLIC) {
      totalCount
      nodes {
        stargazerCount
        languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name color } }
        }
      }
    }
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { contributionCount date } }
      }
    }
  }
}`;

async function fetchData() {
  if (fixtureIdx !== -1) return JSON.parse(readFileSync(process.argv[fixtureIdx + 1], "utf8"));
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is required");
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { login: username } }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(JSON.stringify(json.errors ?? json));
  return json.data;
}

function summarize({ user }) {
  const repos = user.repositories.nodes;
  const days = user.contributionsCollection.contributionCalendar.weeks.flatMap((w) => w.contributionDays);

  let longest = 0, run = 0;
  for (const d of days) {
    run = d.contributionCount > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  const activeDays = days.filter((d) => d.contributionCount > 0).length;

  // Rank by sqrt(bytes) * sqrt(repo count) so one repo with vendored or bundled
  // code can't dominate the chart (same idea as github-readme-stats' weights).
  const langs = new Map();
  for (const r of repos) {
    for (const { size, node } of r.languages.edges) {
      if (IGNORED_LANGS.has(node.name)) continue;
      const prev = langs.get(node.name) ?? { size: 0, count: 0, color: node.color ?? "#8b949e" };
      prev.size += size;
      prev.count += 1;
      langs.set(node.name, prev);
    }
  }
  const weighted = [...langs.entries()].map(([name, l]) => ({ name, color: l.color, w: Math.sqrt(l.size) * Math.sqrt(l.count) }));
  const total = weighted.reduce((a, l) => a + l.w, 0) || 1;
  const top = weighted
    .sort((a, b) => b.w - a.w)
    .slice(0, 5)
    .map((l) => ({ name: l.name, color: l.color, pct: (l.w / total) * 100 }));

  return {
    contributions: user.contributionsCollection.contributionCalendar.totalContributions,
    activeDays,
    longest,
    stars: repos.reduce((a, r) => a + r.stargazerCount, 0),
    repos: user.repositories.totalCount,
    prs: user.pullRequests.totalCount,
    followers: user.followers.totalCount,
    avatarUrl: user.avatarUrl,
    top,
  };
}

const THEMES = {
  light: { bg: "#ffffff", border: "#d0d7de", text: "#1f2328", muted: "#59636e", accent: "#0969da", track: "#eaeef2" },
  dark: { bg: "#0d1117", border: "#30363d", text: "#e6edf3", muted: "#9198a1", accent: "#58a6ff", track: "#21262d" },
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function render(s, t) {
  const W = 840, H = 200;
  const tiles = [
    [s.contributions, "contributions · last year"],
    [s.activeDays, "active days"],
    [`${s.longest}d`, "longest streak"],
    [s.repos, "public repos"],
    [s.prs, "pull requests"],
    [s.stars, "stars earned"],
  ];
  const tileSvg = tiles
    .map(([v, l], i) => {
      const x = 28 + (i % 3) * 150, y = 56 + Math.floor(i / 3) * 66;
      return `<text x="${x}" y="${y}" font-size="26" font-weight="700" fill="${t.text}">${esc(v)}</text>
    <text x="${x}" y="${y + 20}" font-size="12" fill="${t.muted}">${esc(l)}</text>`;
    })
    .join("\n    ");

  const barX = 500, barW = 312;
  let off = 0;
  const bar = s.top
    .map((l) => {
      const w = (l.pct / 100) * barW;
      const seg = `<rect x="${barX + off}" y="46" width="${w.toFixed(1)}" height="10" fill="${l.color}"/>`;
      off += w;
      return seg;
    })
    .join("");
  const legend = s.top
    .map((l, i) => {
      const y = 86 + i * 20;
      return `<circle cx="${barX + 6}" cy="${y - 4}" r="5" fill="${l.color}"/>
    <text x="${barX + 18}" y="${y}" font-size="13" fill="${t.text}">${esc(l.name)}</text>
    <text x="${barX + barW}" y="${y}" font-size="13" fill="${t.muted}" text-anchor="end">${l.pct.toFixed(1)}%</text>`;
    })
    .join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="GitHub stats for ${esc(username)}">
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="12" fill="${t.bg}" stroke="${t.border}"/>
  <g font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif">
    <text x="28" y="24" font-size="11" font-weight="600" letter-spacing="1" fill="${t.accent}">GITHUB ACTIVITY</text>
    ${tileSvg}
    <line x1="472" y1="24" x2="472" y2="176" stroke="${t.border}"/>
    <text x="${barX}" y="24" font-size="11" font-weight="600" letter-spacing="1" fill="${t.accent}">TOP LANGUAGES</text>
    <clipPath id="bar"><rect x="${barX}" y="46" width="${barW}" height="10" rx="5"/></clipPath>
    <rect x="${barX}" y="46" width="${barW}" height="10" rx="5" fill="${t.track}"/>
    <g clip-path="url(#bar)">${bar}</g>
    ${legend}
  </g>
</svg>
`;
}

// ---- Profile card (neofetch-style) ----------------------------------------

const CARD_THEMES = {
  light: { bg: "#f6f8fa", border: "#d0d7de", text: "#1f2328", muted: "#8c959f", key: "#953800", value: "#0a3069", accent: "#0969da" },
  dark: { bg: "#161b22", border: "#30363d", text: "#e6edf3", muted: "#6e7681", key: "#ffa657", value: "#a5d6ff", accent: "#58a6ff" },
};

function uptime(start, now = new Date()) {
  const s = new Date(start);
  let months = (now.getFullYear() - s.getFullYear()) * 12 + (now.getMonth() - s.getMonth());
  if (now.getDate() < s.getDate()) months--;
  const y = Math.floor(months / 12), m = months % 12;
  const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
  return m ? `${plural(y, "year")}, ${plural(m, "month")}` : plural(y, "year");
}

async function avatarDataUri(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/png";
    return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

function renderProfileCard(cfg, s, avatar, t) {
  const W = 1000, X = 340, KEY_W = 150, LINE = 22, RULE_END = W - 36;
  const up = uptime(cfg.careerStart);
  const langs = s.top.slice(0, 3).map((l) => `${l.name} ${Math.round(l.pct)}%`).join(" · ");
  const sections = [
    ...cfg.sections,
    {
      title: "GitHub",
      rows: [
        ["Repos", `${s.repos} public · ${s.stars} star${s.stars === 1 ? "" : "s"} · ${s.prs} pull requests`],
        ["Contributions", `${s.contributions} in the last year · ${s.activeDays} active days`],
        ["Languages", langs],
      ],
    },
  ];

  const lines = [];
  let y = 52;
  const rule = (label) => {
    const labelW = label.length * 9.2 + 24;
    lines.push(`<text x="${X}" y="${y}" fill="${t.accent}" font-weight="700">${esc(label)}</text>
    <line x1="${X + labelW}" y1="${y - 5}" x2="${RULE_END}" y2="${y - 5}" stroke="${t.border}" stroke-width="1.5"/>`);
    y += LINE + 4;
  };
  rule(cfg.handle);
  for (const [i, sec] of sections.entries()) {
    if (sec.title) {
      if (i) y += 6;
      rule(sec.title);
    } else if (i) y += 12;
    for (const [k, v] of sec.rows) {
      lines.push(`<text x="${X}" y="${y}"><tspan fill="${t.key}">${esc(k)}</tspan><tspan fill="${t.muted}">:</tspan></text>
    <text x="${X + KEY_W}" y="${y}" fill="${t.value}">${esc(String(v).replace("{uptime}", up))}</text>`);
      y += LINE;
    }
  }
  const H = y + 18;
  const cy = H / 2, r = 120;
  const avatarSvg = avatar
    ? `<clipPath id="av"><circle cx="170" cy="${cy}" r="${r}"/></clipPath>
  <image href="${avatar}" x="${170 - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" clip-path="url(#av)" preserveAspectRatio="xMidYMid slice"/>
  <circle cx="170" cy="${cy}" r="${r}" fill="none" stroke="${t.border}" stroke-width="2"/>`
    : `<circle cx="170" cy="${cy}" r="${r}" fill="${t.border}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(cfg.handle)}: ${esc(sections[0].rows.map((r) => r[1]).join(", "))}">
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="14" fill="${t.bg}" stroke="${t.border}"/>
  <circle cx="26" cy="22" r="5" fill="#ff5f56"/><circle cx="44" cy="22" r="5" fill="#ffbd2e"/><circle cx="62" cy="22" r="5" fill="#27c93f"/>
  ${avatarSvg}
  <g font-family="ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace" font-size="15">
    ${lines.join("\n    ")}
  </g>
</svg>
`;
}

const stats = summarize(await fetchData());
const config = JSON.parse(readFileSync(new URL("../profile.config.json", import.meta.url), "utf8"));
const avatar = await avatarDataUri(stats.avatarUrl);
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "stats.svg"), render(stats, THEMES.light));
writeFileSync(join(outDir, "stats-dark.svg"), render(stats, THEMES.dark));
writeFileSync(join(outDir, "profile-card.svg"), renderProfileCard(config, stats, avatar, CARD_THEMES.light));
writeFileSync(join(outDir, "profile-card-dark.svg"), renderProfileCard(config, stats, avatar, CARD_THEMES.dark));
const { avatarUrl, ...summary } = stats;
console.log("Rendered profile images:", JSON.stringify(summary));
