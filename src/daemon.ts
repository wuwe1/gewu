// 管阅读服务（src/server.ts）的起停。服务在不在、是谁、新不新，一律问端口上的 /api/health，不记 pid 文件：
// 进程自己报的才是真的，文件会过期。
// 代码版本是 src、bin、web/src 等源码内容的哈希：gewu open 发现服务跑的是旧代码，就自己重启它。
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, openSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { dataDir, root } from "./store.ts";

export const port = Number(process.env.GEWU_PORT ?? 4747);
export const url = (path = "/") => `http://127.0.0.1:${port}${path}`;
export const logFile = join(dataDir, "serve.log");

export type Health = { app: "gewu"; pid: number; version: string; root: string; started: string };

/** 源码的哈希：改了任何一个文件就变 */
export function version(): string {
	const h = createHash("sha1");
	const add = (p: string) => {
		if (statSync(p).isDirectory()) for (const f of readdirSync(p).sort()) add(join(p, f));
		else h.update(p).update(readFileSync(p));
	};
	for (const p of ["bin", "src", "web/src", "web/index.html", "web/vite.config.ts", "package.json"]) add(join(root, p));
	return h.digest("hex").slice(0, 10);
}

/** 端口上的服务：没有返回 null；有但不是 gewu 就报错 */
export async function health(): Promise<Health | null> {
	let res: Response;
	try {
		res = await fetch(url("/api/health"), { signal: AbortSignal.timeout(1500) });
	} catch {
		return null;
	}
	const h = (await res.json().catch(() => null)) as Health | null;
	if (h?.app !== "gewu") throw new Error(`端口 ${port} 被别的程序占着；换一个：GEWU_PORT=…`);
	return h;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const tail = () => { try { return readFileSync(logFile, "utf8").trimEnd().split("\n").slice(-15).join("\n"); } catch { return ""; } };

/** 在后台起服务：脱离调用它的进程（会话关了、命令被杀了，它都还在），输出追加到 data/serve.log */
export async function start(): Promise<Health> {
	const now = await health();
	if (now) return now;
	const log = openSync(logFile, "a");
	spawn(process.execPath, [join(root, "bin/gewu.ts"), "serve"], { cwd: root, detached: true, stdio: ["ignore", log, log] }).unref();
	closeSync(log);
	// 第一次起要打包页面，等久一点
	for (let i = 0; i < 60; i++) {
		await sleep(250);
		const h = await health();
		if (h) return h;
	}
	throw new Error(`服务没起来，看 data/serve.log：\n${tail()}`);
}

export async function stop(): Promise<boolean> {
	const h = await health();
	if (!h) return false;
	if (h.root !== root) throw new Error(`端口 ${port} 上是另一个仓库的 gewu（${h.root}），不动它`);
	process.kill(h.pid, "SIGTERM");
	for (let i = 0; i < 40; i++) {
		await sleep(100);
		if (!(await health())) return true;
	}
	throw new Error(`服务（pid ${h.pid}）4 秒没退出`);
}

/** 保证服务在、是这个仓库的、跑的是现在的代码 */
export async function ensure(log: (s: string) => void = () => {}): Promise<Health> {
	const h = await health();
	if (h && h.root !== root) throw new Error(`端口 ${port} 上是另一个仓库的 gewu（${h.root}）；换一个：GEWU_PORT=…`);
	if (h && h.version === version()) return h;
	if (h) {
		log("代码改过了，重启阅读服务");
		await stop();
	} else log("起阅读服务");
	return start();
}
