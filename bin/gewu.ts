#!/usr/bin/env node
// gewu <命令>：人和 agent 用同一套命令。说明见 CLAUDE.md。
import { setTimeout as sleep } from "node:timers/promises";
import { catalog } from "../web/src/catalog.ts";
import { execFile } from "node:child_process";
import { annotations, type Batch, check, ids, inbox, list } from "../src/batches.ts";
import { ensure, health, logFile, port, start, stop, url, version } from "../src/daemon.ts";
import { serve } from "../src/server.ts";
import { fetchVideo } from "../src/youtube.ts";
import { view as studyView } from "../src/study.ts";
import { read, write } from "../src/store.ts";
import { type Feed, feeds, merge, type Stored, timeline } from "../src/x.ts";
import { type Article, pull, type Repo, type Source, velocity } from "../src/sources.ts";

const HELP = `gewu — 格物

采集（经 booey，在登录着的 Chrome 里开 gewu 自己的标签页）
  gewu x home | following | list <id> | user <handle> | thread <推文 id> | search <词>  [--scrolls N]
      读一条时间线，并进 data/tweets.json，打印读到几条、新几条

YouTube（追源：频道、发布日期、简介、字幕）
  gewu yt <链接或 id>   读视频的元数据进 data/videos.json，字幕进 data/transcripts/<id>.txt

看推文（给 agent 挑一批用）
  gewu tweets [--fresh] [--via <时间线>] [--limit N]
      一行一条，新的在前；--fresh 只要还没进过任何一批的

信息源（data/sources.json：status 是「跟踪」的才拉）
  gewu sources          所有源和状态
  gewu pull             拉所有在跟踪的源：X 账号抓时间线，有 feed 的读 RSS/Atom（文章进 data/items.json）
  gewu items [--fresh] [--source <id>] [--limit N]
      一行一篇文章，新的在前；--fresh 只要还没进过任何一批的
  gewu repos [--fresh] [--limit N]
      GitHub 新仓库，按涨速排（两次拉取之间每天涨几颗星；只拉过一次按建仓以来平均）

批次（data/batches/<id>.json：{ title, created, spec }）
  gewu catalog          spec 能用的组件和写法
  gewu check <id>       校验一批
  gewu open [<id>]      在浏览器里打开一批（不给 id 打开首页）；阅读服务不在或代码旧了会先起、先重启
  gewu batches          所有批次、批注进度、读完没有
  gewu notes [<id>]     批注（某一批或全部）

学习清单（内容 data/study.json 由 agent 写；页面 /study 上人改状态）
  gewu study            一行一项：状态、读了几篇、笔记写了几条，内容有问题会列出来
  gewu open study       打开学习清单页

收批注（和阅读服务、会话都无关，只读 data/）
  gewu inbox [--peek]   上次看过之后：哪些批读完了、哪些批注新写或改过、学习清单改了什么；--peek 不挪游标
  gewu wait [<id>]      等到这一批（不给 id 就是任何一批）点了「读完了」，打印它的批注

阅读服务（常驻 127.0.0.1:4747，GEWU_PORT 可改；日志 data/serve.log）
  gewu serve start | stop | restart | status
  gewu serve            在前台跑（调试用）`;

const args = process.argv.slice(2);
const flag = (name: string) => {
	const i = args.indexOf(`--${name}`);
	if (i < 0) return undefined;
	const v = args[i + 1];
	args.splice(i, v === undefined || v.startsWith("--") ? 1 : 2);
	return v === undefined || v.startsWith("--") ? "" : v;
};
const out = (v: unknown) => console.log(JSON.stringify(v, null, 2));


async function main() {
	const cmd = args.shift();
	switch (cmd) {
		case "x": {
			const scrolls = Number(flag("scrolls") ?? 8);
			const [kind, arg] = args;
			const make = feeds[kind as keyof typeof feeds] as ((a: string) => Feed) | undefined;
			if (!make) throw new Error("gewu x home | following | list <id> | user <handle> | thread <推文 id> | search <词>");
			if (["list", "user", "thread", "search"].includes(kind) && !arg) throw new Error(`gewu x ${kind} 后面要跟参数`);
			const feed = make(arg);
			const got = await timeline(feed, scrolls, (s) => console.error(s));
			out({ via: feed.via, got: got.length, ...merge(got, feed.via) });
			return;
		}
		case "tweets": {
			const fresh = flag("fresh") !== undefined;
			const via = flag("via");
			const limit = Number(flag("limit") ?? 80);
			const used = new Set(ids().flatMap((id) => Object.values(read<Batch>(`batches/${id}`, { spec: { elements: {} } } as unknown as Batch).spec.elements)
				.filter((e) => e.type === "Tweet").map((e) => (e.props as { id: string }).id)));
			const list = Object.values(read<Record<string, Stored>>("tweets", {}))
				.filter((t) => (!fresh || !used.has(t.id)) && (!via || t.via.includes(via)))
				.sort((a, b) => b.created.localeCompare(a.created))
				.slice(0, limit);
			const line = (s: string, n: number) => s.replace(/\s+/g, " ").slice(0, n);
			for (const t of list) {
				const c = t.counts;
				console.log(`${t.id}  @${t.author.handle}${t.retweetedBy ? ` (RT @${t.retweetedBy})` : ""}  ${t.created.slice(5, 16).replace("T", " ")}  ♥${c.likes} ↻${c.retweets} 👁${c.views ?? "-"}${t.media.length ? ` 🖼${t.media.length}` : ""}\n  ${line(t.text, 280)}${t.quoted ? `\n  ↳ @${t.quoted.author.handle}: ${line(t.quoted.text, 160)}` : ""}`);
			}
			console.error(`${list.length} 条`);
			return;
		}
		case "yt": {
			if (!args[0]) throw new Error("gewu yt <链接或 id>");
			const v = await fetchVideo(args[0]);
			out({ ...v, description: v.description.slice(0, 1500) });
			return;
		}
		case "sources":
			for (const s of read<Source[]>("sources", [])) console.log(`[${s.status}] ${s.id}  ${s.name}${s.feed ? "  (feed)" : ""}\n  ${s.why}`);
			return;
		case "pull":
			out(await pull((s) => console.error(s)));
			return;
		case "items": {
			const fresh = flag("fresh") !== undefined;
			const source = flag("source");
			const limit = Number(flag("limit") ?? 50);
			const used = new Set(ids().flatMap((id) => Object.values(read<Batch>(`batches/${id}`, { spec: { elements: {} } } as unknown as Batch).spec.elements)
				.filter((e) => e.type === "Item").map((e) => (e.props as { url?: string }).url)));
			const list = Object.values(read<Record<string, Article>>("items", {}))
				.filter((a) => (!fresh || !used.has(a.url)) && (!source || a.source === source))
				.sort((a, b) => (b.published ?? b.seen).localeCompare(a.published ?? a.seen))
				.slice(0, limit);
			for (const a of list) console.log(`${(a.published ?? "").slice(0, 10)}  [${a.source}]  ${a.title}\n  ${a.url}\n  ${a.summary.slice(0, 200)}`);
			console.error(`${list.length} 篇`);
			return;
		}
		case "repos": {
			const fresh = flag("fresh") !== undefined;
			const limit = Number(flag("limit") ?? 60);
			const used = new Set(ids().flatMap((id) => Object.values(read<Batch>(`batches/${id}`, { spec: { elements: {} } } as unknown as Batch).spec.elements)
				.filter((e) => e.type === "Item").map((e) => (e.props as { url?: string }).url)));
			const list = Object.values(read<Record<string, Repo>>("repos", {}))
				.filter((r) => !fresh || !used.has(r.url))
				.sort((a, b) => velocity(b) - velocity(a))
				.slice(0, limit);
			for (const r of list) console.log(`★${r.stars} +${Math.round(velocity(r))}/天  ${r.id}  ${r.created.slice(0, 10)} ${r.language ?? ""}  [${r.sources.join(",")}]\n  ${r.description.slice(0, 160)}`);
			console.error(`${list.length} 个仓库`);
			return;
		}
		case "catalog":
			console.log(catalog.prompt({ system: "你给 gewu 的批次页写 spec（JSON：{ root, elements, state? }），不用 JSONL patch。" }));
			return;
		case "check": {
			const { problems } = check(args[0]);
			if (problems.length) { console.error(problems.join("\n")); process.exitCode = 1; } else console.error("没问题");
			return;
		}
		case "open": {
			const id = args[0];
			if (id && id !== "study") {
				const { problems } = check(id);
				if (problems.length) console.error(`这一批有问题，页面上会列出来：\n${problems.map((p) => `  ${p}`).join("\n")}`);
			}
			await ensure((s) => console.error(s));
			const target = url(id === "study" ? "/study" : id ? `/b/${id}` : "/");
			if (!process.env.GEWU_NO_OPEN) execFile("open", [target], () => {});
			console.log(target);
			return;
		}
		case "serve": {
			const sub = args[0];
			if (!sub) return serve(port, version());
			if (sub === "start") return out(await start());
			if (sub === "stop") { console.error((await stop()) ? "停了" : "本来就没在跑"); return; }
			if (sub === "restart") { await stop(); return out(await start()); }
			if (sub === "status") {
				const h = await health();
				const v = version();
				out(h ? { running: true, url: url(), ...h, stale: h.version !== v, log: logFile } : { running: false, url: url(), log: logFile });
				return;
			}
			throw new Error("gewu serve start | stop | restart | status");
		}
		case "inbox":
			out(inbox(flag("peek") === undefined));
			return;
		case "wait": {
			const id = args[0];
			const before = Object.fromEntries(list().map((b) => [b.id, b.done]));
			console.error(id ? `等 ${id} 读完……` : "等任何一批读完……");
			for (;;) {
				const hit = list().find((b) => (!id || b.id === id) && b.done && b.done !== before[b.id]);
				if (hit) return out({ batch: hit.id, done: hit.done, notes: annotations(hit.id) });
				await sleep(1000);
			}
		}
		case "study": {
			const v = studyView();
			const NAME = { todo: "待学", doing: "在学", done: "学完" };
			for (const s of v.items) {
				const notes = s.notes.filter((n) => v.written.includes(n)).length;
				console.log(`[${NAME[s.state.status]}] ${s.id}  ${s.title}  读 ${s.state.read.length}/${s.readings.length}  笔记 ${notes}/${s.notes.length}${s.state.note ? `\n  备注：${s.state.note}` : ""}`);
			}
			if (v.problems.length) { console.error(`data/study.json 有问题：\n${v.problems.map((p) => `  ${p}`).join("\n")}`); process.exitCode = 1; }
			return;
		}
		case "batches":
			out(list());
			return;
		case "notes":
			out(annotations(args[0]));
			return;
		default:
			console.log(HELP);
	}
}

main().catch((e) => {
	console.error(e instanceof Error ? e.message : e);
	process.exit(1);
});
