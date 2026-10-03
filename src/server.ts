// gewu 的阅读服务：常驻，127.0.0.1:<port>。一个进程管所有批次，和谁开的、哪个会话无关。
//   GET  /api/health          { app, pid, version, root, started }：CLI 靠它判断在不在、是不是这个仓库、代码新不新
//   GET  /api/batches         首页的列表
//   GET  /api/b/<id>          一批（每次现读文件，校验不过给 problems）
//   POST /api/b/<id>/note     存一条批注
//   POST /api/b/<id>/done     标记读完（只记一笔，不关服务）
//   GET  /api/study           学习清单（内容 + 人的状态 + 哪些笔记写了）
//   POST /api/study/<id>      改一项的状态、某篇读完没有、备注
//   GET  /api/events          SSE：批次文件改了（batch）、批注存了（note）、读完了（done）、学习清单变了（study）
//   其余                       web/dist 的页面（单页应用，路由在前端）
// 写的接口只收 JSON、只认本机页面的 Origin：别的网页往这个端口发不了。关服务用信号（gewu serve stop），没有 HTTP 接口。
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, watch } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, join } from "node:path";
import { annotate, ids, list, load, markDone } from "./batches.ts";
import { update as updateStudy, view as studyView } from "./study.ts";
import { dataDir, root } from "./store.ts";

/** web/src 比 web/dist 新就重新打包 */
function build(): void {
	const web = join(root, "web");
	const dist = join(web, "dist/index.html");
	const newest = (dir: string): number => Math.max(...readdirSync(dir, { withFileTypes: true }).map((d) => {
		const p = join(dir, d.name);
		return d.isDirectory() ? newest(p) : statSync(p).mtimeMs;
	}));
	if (existsSync(dist) && statSync(dist).mtimeMs > Math.max(newest(join(web, "src")), statSync(join(web, "index.html")).mtimeMs)) return;
	console.log("打包页面……");
	execFileSync(join(root, "node_modules/.bin/vite"), ["build", web, "--logLevel", "warn"], { stdio: "inherit" });
}

const TYPES: Record<string, string> = { ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" };

export function serve(port: number, version: string): void {
	build();
	const dist = join(root, "web/dist");
	const started = new Date().toISOString();
	const origins = [`http://127.0.0.1:${port}`, `http://localhost:${port}`];

	// SSE：每个打开的页面一条连接
	const clients = new Set<ServerResponse>();
	const emit = (event: string, id: string) => { for (const c of clients) c.write(`event: ${event}\ndata: ${JSON.stringify({ id })}\n\n`); };
	setInterval(() => { for (const c of clients) c.write(": keepalive\n\n"); }, 30_000).unref();

	// 批次文件改了（agent 重写了一批）：通知页面原地换新。编辑器、write() 的临时文件改名会连着触发几次，200ms 内合成一次
	const batchDir = join(dataDir, "batches");
	mkdirSync(batchDir, { recursive: true });
	const timers = new Map<string, ReturnType<typeof setTimeout>>();
	watch(batchDir, (_, file) => {
		const id = file?.toString().replace(/\.json(\.tmp)?$/, "");
		if (!id || !ids().includes(id)) return;
		clearTimeout(timers.get(id));
		timers.set(id, setTimeout(() => emit("batch", id), 200));
	});

	// 学习清单的内容（agent 写的）、笔记目录改了：页面重新取
	watch(dataDir, (_, file) => {
		if (file?.toString().startsWith("study.json")) { clearTimeout(timers.get("study")); timers.set("study", setTimeout(() => emit("study", ""), 200)); }
	});
	mkdirSync(join(root, "notes"), { recursive: true });
	watch(join(root, "notes"), () => { clearTimeout(timers.get("notes")); timers.set("notes", setTimeout(() => emit("study", ""), 200)); });

	const json = (res: ServerResponse, status: number, v: unknown) => res.writeHead(status, { "content-type": "application/json; charset=utf-8" }).end(JSON.stringify(v));
	const body = (req: IncomingMessage) => new Promise<string>((ok) => { let s = ""; req.on("data", (c) => { s += c; }); req.on("end", () => ok(s)); });

	const server = createServer(async (req, res) => {
		const url = new URL(req.url ?? "/", origins[0]);
		const path = url.pathname;
		try {
			if (req.method === "POST") {
				if (!req.headers["content-type"]?.startsWith("application/json") || (req.headers.origin && !origins.includes(req.headers.origin))) return json(res, 403, { error: "只收本机页面的 JSON" });
				const st = /^\/api\/study\/([\w.-]+)$/.exec(path);
				if (st) {
					const r = updateStudy(st[1], JSON.parse(await body(req)));
					emit("study", st[1]);
					return json(res, 200, r);
				}
				const m = /^\/api\/b\/([\w.-]+)\/(note|done)$/.exec(path);
				if (!m || !ids().includes(m[1])) return json(res, 404, { error: "没有这一批" });
				const [, id, what] = m;
				if (what === "note") {
					annotate(id, JSON.parse(await body(req)));
					emit("note", id);
					return void res.writeHead(204).end();
				}
				const at = markDone(id);
				emit("done", id);
				return json(res, 200, { done: at });
			}
			if (path === "/api/health") return json(res, 200, { app: "gewu", pid: process.pid, version, root, started });
			if (path === "/api/batches") return json(res, 200, list());
			if (path === "/api/study") return json(res, 200, studyView());
			if (path === "/api/events") {
				res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" });
				res.write(": hi\n\n");
				clients.add(res);
				req.on("close", () => clients.delete(res));
				return;
			}
			const b = /^\/api\/b\/([\w.-]+)$/.exec(path);
			if (b) return ids().includes(b[1]) ? json(res, 200, load(b[1])) : json(res, 404, { error: `没有这一批：${b[1]}` });
			if (path.startsWith("/assets/")) {
				const f = join(dist, path);
				if (!f.startsWith(join(dist, "assets")) || !existsSync(f)) return void res.writeHead(404).end();
				return void res.writeHead(200, { "content-type": TYPES[extname(f)] ?? "application/octet-stream", "cache-control": "public, max-age=31536000, immutable" }).end(readFileSync(f));
			}
			res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" }).end(readFileSync(join(dist, "index.html")));
		} catch (e) {
			console.error(e);
			json(res, 500, { error: e instanceof Error ? e.message : String(e) });
		}
	});
	server.listen(port, "127.0.0.1", () => console.log(`${started} gewu 阅读服务 http://127.0.0.1:${port}/ pid ${process.pid} 版本 ${version}`));
	const bye = () => { console.log(`${new Date().toISOString()} 收到信号，退出`); process.exit(0); };
	process.on("SIGTERM", bye);
	process.on("SIGINT", bye);
}
