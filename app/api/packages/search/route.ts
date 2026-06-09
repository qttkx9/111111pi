import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const NPM_SEARCH_API = "https://registry.npmjs.org/-/v1/search";

interface NpmPackage {
  name: string;
  description: string;
  version: string;
  keywords?: string[];
  publisher?: { username: string };
  date: string;
  links: {
    npm?: string;
    homepage?: string;
    repository?: string;
  };
}

interface NpmSearchObject {
  package: NpmPackage;
  downloads: { monthly: number; weekly: number };
  score: { final: number };
}

interface NpmSearchResponse {
  objects: NpmSearchObject[];
  total: number;
}

function parseType(keywords?: string[]): string {
  if (!keywords) return "package";
  if (keywords.includes("pi-extension")) return "extension";
  if (keywords.includes("pi-skill")) return "skill";
  if (keywords.includes("pi-theme")) return "theme";
  if (keywords.includes("pi-prompt")) return "prompt";
  return "package";
}

function formatDownloads(monthly: number): string {
  if (monthly >= 1_000_000) return `${(monthly / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (monthly >= 1_000) return `${(monthly / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${monthly}`;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim() || "";
    const type = searchParams.get("type") || "all"; // extension | skill | theme | prompt | all
    const sort = searchParams.get("sort") || "downloads"; // downloads | date | name
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const size = Math.min(50, Math.max(1, parseInt(searchParams.get("size") || "20")));
    const from = (page - 1) * size;

    // Build npm search query
    let npmQuery = "keywords:pi-package";
    if (query) {
      npmQuery = `${query} ${npmQuery}`;
    }
    // Add type filter via npm search text
    if (type === "extension") npmQuery += " keywords:pi-extension";
    else if (type === "skill") npmQuery += " keywords:pi-skill";

    const npmSort = sort === "date" ? "updated" : sort === "name" ? "name" : "popularity";

    const url = `${NPM_SEARCH_API}?text=${encodeURIComponent(npmQuery)}&size=${size}&from=${from}&sort=${npmSort}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`npm search failed: HTTP ${res.status}`);

    const data = (await res.json()) as NpmSearchResponse;

    const results = data.objects.map((obj) => ({
      name: obj.package.name,
      description: obj.package.description,
      version: obj.package.version,
      author: obj.package.publisher?.username || "",
      type: parseType(obj.package.keywords),
      downloads: formatDownloads(obj.downloads.monthly),
      downloadsRaw: obj.downloads.monthly,
      updated: obj.package.date,
      url: obj.package.links.npm || obj.package.links.homepage || "",
      repository: obj.package.links.repository || "",
    }));

    return NextResponse.json({ results, total: data.total, page, size });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
