// 信息源：热点的上游。data/sources.json 由 agent 按批注维护，status 是「跟踪」的才拉：
//   kind x     → 抓这个账号的时间线，推文并进 data/tweets.json
//   有 feed 的 → 读 RSS / Atom，文章并进 data/items.json
//   kind github → 用 GitHub 搜索（gh api）找最近新建、星数最多的仓库，并进 data/repos.json；每次记一笔星数，算涨得多快
// 文章不存全文，只存标题、链接、时间、摘要：读的时候点过去看原文。
import { execFileSync } from "node:child_process";
import { read, write } from "./store.ts";
import { feeds, merge, timeline } from "./x.ts";

export type Source = {
	id: string;
	kind: "x" | "blog" | "paper" | "repo" | "site" | "book" | "person" | "github" | "other";
	name: string;
	url: string | null;
	/** RSS / Atom 地址（kind 不是 x 的源，有它才能拉） */
	feed?: string | null;
	/** kind github：搜索词（GitHub 搜索语法，例 "agent in:name,description,topics"），空串是不限领域 */
	query?: string;
	/** kind github：只看最近几天新建的（默认 21）、至少几颗星（默认 100） */
	days?: number;
	minStars?: number;
	why: string;
	from: string[];
	/** 核实：不订阅，只在要查证某条说法时用（例 Polymarket 链上账户） */
	status: "候选" | "跟踪" | "核实" | "不用";
	added: string;
};

export type Repo = {
	id: string;
	url: string;
	description: string;
	language: string | null;
	topics: string[];
	created: string;
	stars: number;
	/** 每次拉取记一笔：算涨速 */
	history: { at: string; stars: number }[];
	sources: string[];
	seen: string;
};

/** 涨速：最近两次拉取之间每天涨多少星；只拉过一次就用「建仓以来平均每天」 */
export function velocity(r: Repo): number {
	const h = r.history;
	if (h.length >= 2) {
		const [a, b] = [h[h.length - 2], h[h.length - 1]];
		const days = Math.max((Date.parse(b.at) - Date.parse(a.at)) / 864e5, 1 / 24);
		return (b.stars - a.stars) / days;
	}
	return r.stars / Math.max((Date.now() - Date.parse(r.created)) / 864e5, 1);
}

function searchRepos(s: Source): Repo[] {
	const since = new Date(Date.now() - (s.days ?? 21) * 864e5).toISOString().slice(0, 10);
	const q = `${s.query ?? ""} created:>${since} stars:>${s.minStars ?? 100}`.trim();
	const out = execFileSync("gh", ["api", "-X", "GET", "search/repositories", "-f", `q=${q}`, "-f", "sort=stars", "-f", "per_page=40"], { encoding: "utf8" });
	const now = new Date().toISOString();
	// biome-ignore lint: GitHub 的返回
	return (JSON.parse(out).items as any[]).map((r) => ({
		id: r.full_name,
		url: r.html_url,
		description: r.description ?? "",
		language: r.language ?? null,
		topics: r.topics ?? [],
		created: r.created_at,
		stars: r.stargazers_count,
		history: [{ at: now, stars: r.stargazers_count }],
		sources: [s.id],
		seen: now,
	}));
}

export type Article = { id: string; source: string; title: string; url: string; published: string | null; summary: string; seen: string };

const decode = (s: string) =>
	s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
		.replace(/<[^>]+>/g, " ")
		.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ")
		.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
		.replace(/&amp;/g, "&")
		.replace(/\s+/g, " ")
		.trim();

/** RSS 的 <item> 或 Atom 的 <entry>，只取要用的几个字段；不引 XML 库，订阅源的格式就这么几种 */
export function parseFeed(xml: string): { title: string; url: string; published: string | null; summary: string }[] {
	const tag = (block: string, names: string[]) => {
		for (const n of names) {
			const m = new RegExp(`<${n}(?:\\s[^>]*)?>([\\s\\S]*?)</${n}>`, "i").exec(block);
			if (m) return m[1];
		}
		return "";
	};
	const blocks = [...xml.matchAll(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi)].map((m) => m[0]);
	return blocks.map((b) => {
		const link = tag(b, ["link"]).trim() || /<link[^>]*href="([^"]+)"/i.exec(b)?.[1] || "";
		const date = tag(b, ["pubDate", "published", "updated", "dc:date"]).trim();
		const t = date ? new Date(date) : null;
		return {
			title: decode(tag(b, ["title"])),
			url: decode(link),
			published: t && !Number.isNaN(t.getTime()) ? t.toISOString() : null,
			summary: decode(tag(b, ["description", "summary", "content"])).slice(0, 600),
		};
	}).filter((x) => x.url);
}

/** 拉所有在跟踪的源。返回每个源拉到几条、新几条 */
export async function pull(log: (s: string) => void): Promise<{ source: string; got: number; new: number; error?: string }[]> {
	const out = [];
	const now = new Date().toISOString();
	for (const s of read<Source[]>("sources", []).filter((s) => s.status === "跟踪")) {
		try {
			if (s.kind === "x") {
				const handle = s.id.replace(/^x:/, "");
				log(`X @${handle}`);
				const feed = feeds.user(handle);
				const got = await timeline(feed, 2);
				out.push({ source: s.id, got: got.length, new: merge(got, feed.via).new });
			} else if (s.kind === "github") {
				log(`GitHub ${s.name}`);
				const got = searchRepos(s);
				const store = read<Record<string, Repo>>("repos", {});
				let fresh = 0;
				for (const r of got) {
					const old = store[r.id];
					if (!old) fresh++;
					store[r.id] = old
						? { ...r, history: [...old.history, ...r.history], sources: [...new Set([...old.sources, s.id])], seen: old.seen }
						: r;
				}
				write("repos", store);
				out.push({ source: s.id, got: got.length, new: fresh });
			} else if (s.feed) {
				log(`订阅 ${s.name}`);
				const res = await fetch(s.feed, { signal: AbortSignal.timeout(20_000), headers: { "user-agent": "gewu (personal reader)" } });
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const got = parseFeed(await res.text());
				const store = read<Record<string, Article>>("items", {});
				let fresh = 0;
				for (const a of got) {
					if (!store[a.url]) fresh++;
					store[a.url] = { id: a.url, source: s.id, ...a, seen: store[a.url]?.seen ?? now };
				}
				write("items", store);
				out.push({ source: s.id, got: got.length, new: fresh });
			} else {
				out.push({ source: s.id, got: 0, new: 0, error: "没有 feed，拉不了；找到它的 RSS/Atom 填进 sources.json 的 feed" });
			}
		} catch (e) {
			out.push({ source: s.id, got: 0, new: 0, error: e instanceof Error ? e.message : String(e) });
		}
	}
	return out;
}
