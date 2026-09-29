// Renders self-hosted GitHub stats cards (light + dark) for the profile README.
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

const stats = summarize(await fetchData());
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "stats.svg"), render(stats, THEMES.light));
writeFileSync(join(outDir, "stats-dark.svg"), render(stats, THEMES.dark));
console.log("Rendered stats cards:", JSON.stringify(stats));
