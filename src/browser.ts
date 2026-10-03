// 唯一碰 booey 的地方（照 x2）：在登录着的 Chrome 里用 gewu 自己开的标签页做事，不碰正在用的标签页。
// 一个 origin 一个标签页，window.name 是记号，下次按记号找回来。
// 连着几个浏览器时用 GEWU_BROWSER（booey 扩展里的名字或 id）选一个。
import { RelayClient, type TabInfo } from "@wuwe1/booey";

const MARK = "gewu";

export type Page = {
	/** 在页面里调用一个函数：fn 要自给自足（不引用外面的变量），参数经 JSON 传进去 */
	run<A extends readonly unknown[], R>(fn: (...args: A) => R, ...args: A): Promise<Awaited<R>>;
	/** 导航到一个地址，等到 DOM 就绪（不等 load：X 有时有资源一直挂着，load 永远不来） */
	goto(url: string): Promise<void>;
	/** 每个新文档在页面脚本之前先跑这段（拦响应的钩子），返回撤掉它的函数 */
	beforeLoad(source: string): Promise<() => Promise<void>>;
};

async function client(): Promise<RelayClient> {
	const browser = process.env.GEWU_BROWSER;
	const c = new RelayClient(browser ? { browser } : {});
	const all = await c.browsers().catch(() => { throw new Error("连不上 booey：daemon 起了吗（npx booey daemon start）？Chrome 开着吗？"); });
	if (all.length === 0) throw new Error("没有连上的浏览器：打开 Chrome，确认 booey 扩展已连接");
	if (all.length > 1 && !browser) throw new Error(`连着 ${all.length} 个浏览器，用 GEWU_BROWSER 选一个：${all.map((b) => b.label || b.id).join("、")}`);
	return c;
}

/** 这个 origin 的 gewu 标签页：有就用，没有就在后台开一个 */
export async function page(origin: string): Promise<Page> {
	const c = await client();
	let tab: TabInfo | undefined;
	for (const t of (await c.tabs()).filter((t) => t.url.startsWith(origin))) {
		await c.attach(t.tabId);
		if ((await c.eval<string>(t.tabId, "window.name")) === MARK) { tab = t; break; }
	}
	if (!tab) {
		tab = await c.openTab(origin);
		await c.attach(tab.tabId);
		await waitLoaded(c, tab.tabId);
		await c.eval(tab.tabId, `window.name = ${JSON.stringify(MARK)}`);
	}
	const id = tab.tabId;
	// 后台标签页当成有焦点：不然有的页面不加载、不发请求
	await c.send(id, "Emulation.setFocusEmulationEnabled", { enabled: true });
	return {
		run: (fn, ...args) => c.evalFn(id, fn, ...args),
		goto: async (url) => {
			await c.navigate(id, url);
			await waitLoaded(c, id);
			await c.eval(id, `window.name = ${JSON.stringify(MARK)}`);
		},
		beforeLoad: async (source) => {
			const { identifier } = await c.send<{ identifier: string }>(id, "Page.addScriptToEvaluateOnNewDocument", { source });
			return async () => { await c.send(id, "Page.removeScriptToEvaluateOnNewDocument", { identifier }); };
		},
	};
}

async function waitLoaded(c: RelayClient, tabId: number, timeoutMs = 30_000): Promise<void> {
	const until = Date.now() + timeoutMs;
	for (;;) {
		const state = await c.eval<string>(tabId, "document.readyState").catch(() => "loading");
		if (state !== "loading") return;
		if (Date.now() > until) throw new Error(`页面 ${timeoutMs / 1000} 秒还没加载完`);
		await new Promise((r) => setTimeout(r, 300));
	}
}
