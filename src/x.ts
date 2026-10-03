// X（推特）：在 gewu 的标签页里打开一条时间线、往下滚，把页面本来就会收到的时间线响应（GraphQL）截下来，解析成推文。
// 不自己调 X 的接口：请求都是页面自己发的，登录态、签名、限流都是页面的事。
// 钩子装在每个新文档的页面脚本之前（XHR 和 fetch 都拦），只留操作名像时间线的响应（HomeTimeline、ListLatestTweetsTimeline、UserTweets、SearchTimeline……）。
// 解析只认时间线里的 TimelineTweet 条目：广告（promotedMetadata）不要，引用的推文挂在引用它的那条下面。
import type { Tweet } from "../web/src/types.ts";
import { page } from "./browser.ts";
import { read, write } from "./store.ts";

/** 存在 data/tweets.json 里的推文：多了第一次见到的时间、从哪条时间线见到的 */
export type Stored = Tweet & { seen: string; via: string[] };

function hook() {
	const w = window as unknown as { __gewu?: { op: string; body: string }[] };
	if (w.__gewu) return;
	const caps: { op: string; body: string }[] = (w.__gewu = []);
	const want = (u: unknown) => {
		const m = /\/graphql\/[^/]+\/(\w+)/.exec(String(u));
		return m && /Timeline|Tweets|TweetDetail/.test(m[1]) ? m[1] : null;
	};
	const X = XMLHttpRequest.prototype;
	const open = X.open;
	const send = X.send;
	X.open = function (this: XMLHttpRequest & { __op?: string | null }, ...args: unknown[]) {
		this.__op = want(args[1]);
		return (open as (...a: unknown[]) => void).apply(this, args);
	} as typeof X.open;
	X.send = function (this: XMLHttpRequest & { __op?: string | null }, ...args: unknown[]) {
		const op = this.__op;
		if (op) this.addEventListener("load", () => {
			if (this.status !== 200) return;
			caps.push({ op, body: this.responseType === "json" ? JSON.stringify(this.response) : this.responseText });
		});
		return (send as (...a: unknown[]) => void).apply(this, args);
	} as typeof X.send;
	const f = window.fetch;
	window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
		const res = await f.call(this, input, init);
		const op = want(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
		if (op && res.ok) res.clone().text().then((body) => caps.push({ op, body }), () => {});
		return res;
	};
}

/** 在页面里跑：把截下来的响应解析成推文。ops 是只要哪些操作的响应（null 是都要） */
function extract(ops: string[] | null) {
	type Any = any; // biome-ignore lint: X 的响应没有类型
	const caps: { op: string; body: string }[] = (window as Any).__gewu ?? [];
	const dec = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
	const unwrap = (r: Any) => (r?.__typename === "TweetWithVisibilityResults" ? r.tweet : r?.__typename === "TweetTombstone" ? null : r);
	const num = (x: unknown) => (x === undefined || x === null ? 0 : Number(x));
	const user = (t: Any) => {
		const u = t?.core?.user_results?.result;
		return {
			handle: u?.core?.screen_name ?? u?.legacy?.screen_name ?? "i",
			name: u?.core?.name ?? u?.legacy?.name ?? "",
			avatar: u?.avatar?.image_url ?? u?.legacy?.profile_image_url_https ?? null,
		};
	};
	const body = (t: Any) => {
		const lg = t.legacy;
		const note = t.note_tweet?.note_tweet_results?.result;
		let text: string = note?.text ?? lg.full_text ?? "";
		// t.co 换回原链接；图片、视频的 t.co 去掉（图另外画）
		for (const u of (note?.entity_set ?? lg.entities)?.urls ?? []) if (u.url && u.expanded_url) text = text.split(u.url).join(u.expanded_url);
		for (const m of lg.entities?.media ?? []) if (m.url) text = text.split(m.url).join("");
		const media = (lg.extended_entities?.media ?? []).map((m: Any) => {
			const v = (m.video_info?.variants ?? []).filter((x: Any) => x.content_type === "video/mp4").sort((a: Any, b: Any) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0];
			return v ? { type: m.type, url: m.media_url_https, video: v.url } : { type: m.type, url: m.media_url_https };
		});
		const author = user(t);
		return {
			id: lg.id_str as string,
			url: `https://x.com/${author.handle}/status/${lg.id_str}`,
			author,
			created: new Date(lg.created_at).toISOString(),
			text: dec(text).trim(),
			lang: lg.lang ?? null,
			media,
			replyTo: lg.in_reply_to_screen_name ?? null,
			counts: {
				replies: num(lg.reply_count), retweets: num(lg.retweet_count), likes: num(lg.favorite_count),
				quotes: num(lg.quote_count), bookmarks: num(lg.bookmark_count),
				views: t.views?.count ? Number(t.views.count) : null,
			},
		};
	};
	const tweet = (raw: Any) => {
		let t = unwrap(raw);
		if (!t?.legacy) return null;
		let by: string | null = null;
		const rt = unwrap(t.legacy.retweeted_status_result?.result);
		if (rt?.legacy) { by = user(t).handle; t = rt; }
		const q = unwrap(t.quoted_status_result?.result);
		return { ...body(t), quoted: q?.legacy ? body(q) : null, retweetedBy: by };
	};
	const out: Any[] = [];
	const seen = new Set<string>();
	const walk = (o: Any): void => {
		if (!o || typeof o !== "object") return;
		if (Array.isArray(o)) { for (const x of o) walk(x); return; }
		if (o.itemType === "TimelineTweet") {
			if (o.promotedMetadata) return;
			const t = tweet(o.tweet_results?.result);
			if (t && !seen.has(t.id)) { seen.add(t.id); out.push(t); }
			return;
		}
		for (const k in o) walk(o[k]);
	};
	for (const c of caps) {
		if (ops && !ops.includes(c.op)) continue;
		try { walk(JSON.parse(c.body)); } catch {}
	}
	return { ops: caps.map((c) => c.op), tweets: out };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type Feed = {
	/** 记在推文的 via 里 */
	via: string;
	url: string;
	/** 只要这些操作的响应；首页的「为你推荐」「正在关注」在同一页，靠它分开 */
	ops?: string[];
	/** 首页要点第几个标签（0 为你推荐、1 正在关注）才会出这条时间线 */
	tab?: number;
};

export const feeds = {
	home: (): Feed => ({ via: "home", url: "https://x.com/home", ops: ["HomeTimeline"], tab: 0 }),
	following: (): Feed => ({ via: "following", url: "https://x.com/home", ops: ["HomeLatestTimeline"], tab: 1 }),
	list: (id: string): Feed => ({ via: `list:${id}`, url: `https://x.com/i/lists/${id}` }),
	user: (handle: string): Feed => ({ via: `user:${handle}`, url: `https://x.com/${handle.replace(/^@/, "")}`, ops: ["UserTweets", "UserOriginalsTimeline"] }),
	/** 一条帖子和它下面的回复（作者自己的补充常在这里） */
	thread: (id: string): Feed => ({ via: `thread:${id}`, url: `https://x.com/i/status/${id}`, ops: ["TweetDetail"] }),
	search: (q: string): Feed => ({ via: `search:${q}`, url: `https://x.com/search?q=${encodeURIComponent(q)}&f=live`, ops: ["SearchTimeline"] }),
};

/** 打开一条时间线，滚 scrolls 屏，返回读到的推文（按时间线上的顺序） */
export async function timeline(feed: Feed, scrolls: number, log: (s: string) => void = () => {}): Promise<Tweet[]> {
	const p = await page("https://x.com");
	const off = await p.beforeLoad(`(${hook.toString()})()`);
	const got = async () => (await p.run(extract, feed.ops ?? null)).tweets.length;
	const until = async (ok: () => Promise<boolean>, ms: number) => {
		for (const end = Date.now() + ms; Date.now() < end; await sleep(500)) if (await ok()) return true;
		return false;
	};
	try {
		await p.goto(feed.url);
		if (!(await until(async () => (await got()) > 0, 8_000)) && feed.tab !== undefined) {
			// 首页停在另一个标签上：点过去
			await p.run((i: number) => (document.querySelectorAll('[role="tab"]')[i] as HTMLElement | undefined)?.click(), feed.tab);
		}
		if (!(await until(async () => (await got()) > 0, 15_000))) {
			const { ops } = await p.run(extract, null);
			throw new Error(`${feed.url} 没读到推文（截到的响应：${ops.join(", ") || "无"}）。登录了吗？`);
		}
		let n = await got();
		let still = 0;
		for (let i = 0; i < scrolls && still < 3; i++) {
			await p.run(() => window.scrollTo(0, document.documentElement.scrollHeight));
			await sleep(2_000);
			const m = await got();
			still = m === n ? still + 1 : 0;
			n = m;
			log(`滚了 ${i + 1} 屏，${n} 条`);
		}
		return (await p.run(extract, feed.ops ?? null)).tweets as Tweet[];
	} finally {
		await off();
	}
}

/** 读到的推文并进 data/tweets.json：记下第一次见到的时间和从哪条时间线见到的。返回新几条、一共几条 */
export function merge(got: Tweet[], via: string): { new: number; total: number } {
	const store = read<Record<string, Stored>>("tweets", {});
	const now = new Date().toISOString();
	let fresh = 0;
	for (const t of got) {
		const old = store[t.id];
		if (!old) fresh++;
		store[t.id] = { ...t, seen: old?.seen ?? now, via: [...new Set([...(old?.via ?? []), via])] };
	}
	write("tweets", store);
	return { new: fresh, total: Object.keys(store).length };
}
