// 批次页：顶栏（返回、标题、批注进度、读完了）+ json-render 画的 spec + 整批的批注。
// 批次文件改了（服务推 batch 事件）就重新取 spec 原地换新；批注以页面里的为准，不重载。
// 键盘：j/k 上下一条，1–5 打标记，e 写批注，Esc 退出输入框。
import { JSONUIProvider, Renderer } from "@json-render/react";
import { ArrowLeft, CheckCheck, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Annotate } from "../components/annotate.tsx";
import { Bar, Kbd, Offline, time } from "../components/shell.tsx";
import { api, Tweets, useEvents } from "../live.ts";
import { initNotes, pending, useNoted } from "../notes.ts";
import { registry } from "../registry.tsx";
import type { BatchData } from "../types.ts";

const ANNOTATABLE = new Set(["Tweet", "Item", "Source", "Ask"]);

function useKeys() {
	useEffect(() => {
		const cards = () => [...document.querySelectorAll<HTMLElement>("[data-annotate]")];
		const current = () => document.querySelector<HTMLElement>("[data-annotate][data-current]");
		const select = (el: HTMLElement | undefined | null, scroll = true) => {
			if (!el) return;
			current()?.removeAttribute("data-current");
			el.setAttribute("data-current", "");
			if (scroll) el.scrollIntoView({ block: "start", behavior: "smooth" });
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.metaKey || e.ctrlKey || e.altKey) return;
			const typing = e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement;
			if (typing) {
				if (e.key === "Escape") (e.target as HTMLElement).blur();
				return;
			}
			const all = cards();
			const i = all.indexOf(current() as HTMLElement);
			if (e.key === "j") select(all[Math.min(i + 1, all.length - 1)]);
			else if (e.key === "k") select(all[Math.max(i - 1, 0)]);
			else if (/^[1-9]$/.test(e.key)) current()?.querySelector<HTMLElement>(`[data-mark="${e.key}"]`)?.click();
			else if (e.key === "e" || e.key === "Enter") current()?.querySelector<HTMLElement>("[data-note]")?.focus();
			else return;
			e.preventDefault();
		};
		// 鼠标点进哪张卡片，哪张就是当前
		const onPoint = (e: Event) => select((e.target as HTMLElement).closest?.<HTMLElement>("[data-annotate]"), false);
		addEventListener("keydown", onKey);
		addEventListener("focusin", onPoint);
		addEventListener("pointerdown", onPoint);
		return () => { removeEventListener("keydown", onKey); removeEventListener("focusin", onPoint); removeEventListener("pointerdown", onPoint); };
	}, []);
}

function Progress({ ids }: { ids: string[] }) {
	const n = useNoted(ids);
	return <>已批注 {n}/{ids.length}</>;
}

export function BatchPage({ id }: { id: string }) {
	const [data, setData] = useState<BatchData | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [done, setDone] = useState<string | null>(null);
	const loaded = useRef(false);

	const fetchBatch = useCallback(() => {
		api<BatchData>(`/api/b/${id}`).then((d) => {
			// 批注只在第一次打开时取：之后页面里的才是准的
			if (!loaded.current && d.spec) { initNotes(id, d.notes); loaded.current = true; }
			setData(d);
			setDone(d.done);
			setError(null);
			document.title = d.title;
		}, (e: Error) => setError(e.message));
	}, [id]);
	useEffect(fetchBatch, [fetchBatch]);
	const up = useEvents(useCallback((e) => { if (e.type === "batch" && (e.id === id || e.id === null)) fetchBatch(); }, [id, fetchBatch]));
	useKeys();

	const finish = async () => {
		while (pending()) await new Promise((r) => setTimeout(r, 200));
		const r = await api<{ done: string }>(`/api/b/${id}/done`, { method: "POST", body: {} }).catch(() => null);
		if (r) setDone(r.done);
	};

	const ids = data?.spec ? [...Object.values(data.spec.elements).filter((e) => ANNOTATABLE.has(e.type)).map((e) => String((e.props as { id: string }).id)), "_batch"] : [];

	return (
		<>
			<Bar>
				<a href="/" title="全部批次" className="-ml-2 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
					<ArrowLeft className="size-4" />
				</a>
				<div className="flex min-w-0 flex-col">
					<span className="truncate text-sm font-semibold">{data?.title ?? id}</span>
					<span className="text-[11px] text-muted-foreground tabular-nums">{id}{data?.spec && <> · <Progress ids={ids} /></>}</span>
				</div>
				<div className="ml-auto hidden shrink-0 items-center gap-1.5 whitespace-nowrap text-[11px] text-muted-foreground md:flex">
					<Kbd>j</Kbd><Kbd>k</Kbd>上下<span className="mx-1" /><Kbd>1</Kbd>–<Kbd>5</Kbd>标记<span className="mx-1" /><Kbd>e</Kbd>批注
				</div>
				{data?.spec && (
					<button
						type="button"
						onClick={finish}
						title={done ? "再标一次：告诉 Claude 又有新批注了" : "告诉 Claude 这一批读完了"}
						className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm font-medium shadow-xs transition-all outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 max-md:ml-auto ${
							done ? "border bg-background hover:bg-accent hover:text-accent-foreground" : "bg-primary text-primary-foreground hover:bg-primary/90"
						}`}
					>
						<CheckCheck className="size-4" />
						{done ? `读完了 · ${time(done)}` : "读完了"}
					</button>
				)}
			</Bar>
			<main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
				<Offline up={up} />
				{error && <p className="text-sm text-destructive">{error}</p>}
				{data?.problems && (
					<div className="flex flex-col gap-2 rounded-xl border border-destructive/40 bg-card px-5 py-4 text-sm shadow-sm">
						<span className="flex items-center gap-2 font-semibold text-destructive"><TriangleAlert className="size-4" />这一批的 spec 有问题，改好了会自动刷新</span>
						<ul className="list-disc space-y-1 pl-5 font-mono text-xs text-muted-foreground">{data.problems.map((p) => <li key={p}>{p}</li>)}</ul>
					</div>
				)}
				{data?.spec && (
					<Tweets.Provider value={data.tweets}>
						<JSONUIProvider registry={registry} initialState={data.spec.state ?? {}}>
							<Renderer spec={data.spec} registry={registry} />
						</JSONUIProvider>
						<section className="flex flex-col gap-3 pt-4">
							<h2 className="text-sm font-semibold">这一批整体</h2>
							<div data-annotate tabIndex={-1} className="rounded-xl border bg-card px-5 py-4 shadow-sm outline-none data-[current]:border-ring data-[current]:ring-[3px] data-[current]:ring-ring/30">
								<Annotate id="_batch" kind="batch" marks={[]} placeholder="整体的感受：哪条线值得追、哪些是噪音、想往哪学" />
							</div>
						</section>
					</Tweets.Provider>
				)}
			</main>
		</>
	);
}
