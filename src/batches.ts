// 批次和批注：读、校验、存。daemon 和 CLI 共用；页面上来的批注只经 daemon 写，CLI 只读。
// 批次文件 data/batches/<id>.json：{ title, created, spec }，spec 是 json-render 的 { root, elements, state? }，组件见 web/src/catalog.ts。
// 批注 data/annotations.json：一条 (batch, item) 一行，at 是最后改的时间。
// 读完 data/reads.json：{ [batch]: 点「读完了」的时间 }。
// 收件游标 data/inbox.json：{ cursor }，gewu inbox 从这里往后看。
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { formatSpecIssues, type Spec, validateSpec } from "@json-render/core";
import { catalog } from "../web/src/catalog.ts";
import type { BatchData, BatchSummary, StudyState } from "../web/src/types.ts";
import { dataDir, read, write } from "./store.ts";
import { view as studyView } from "./study.ts";
import type { Stored } from "./x.ts";

export type Batch = { title: string; created: string; spec: Spec };
export type Annotation = { batch: string; item: string; kind: string; target?: string | null; marks: string[]; note: string; at: string };

/** 可批注的组件：props.id 是批注的 key */
export const ANNOTATABLE = ["Tweet", "Item", "Source", "Ask"];

export function ids(): string[] {
	try {
		return readdirSync(join(dataDir, "batches")).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)).sort().reverse();
	} catch {
		return [];
	}
}

/** 读一批并校验：catalog 的 props、spec 的结构、引用的推文都在、条目 id 不重复。problems 空的就是对的 */
export function check(id: string): { batch: Batch; problems: string[] } {
	const batch = read<Batch | null>(`batches/${id}`, null);
	if (!batch) throw new Error(`没有这一批：data/batches/${id}.json`);
	const problems: string[] = [];
	if (!batch.title) problems.push("缺 title");
	// 叶子元素可以不写 children
	for (const e of Object.values(batch.spec?.elements ?? {})) e.children ??= [];
	const props = catalog.validate(batch.spec);
	if (!props.success) for (const i of props.error?.issues ?? []) problems.push(`${i.path.join(".")}：${i.message}`);
	const shape = validateSpec(batch.spec);
	if (!shape.valid) problems.push(formatSpecIssues(shape.issues.filter((i) => i.severity === "error")));
	const tweets = read<Record<string, Stored>>("tweets", {});
	const seen = new Set<string>();
	for (const [key, e] of Object.entries(batch.spec?.elements ?? {})) {
		const p = e.props as { id?: string };
		if (e.type === "Tweet" && p.id && !tweets[p.id]) problems.push(`${key}：data/tweets.json 里没有推文 ${p.id}`);
		if (ANNOTATABLE.includes(e.type) && p.id) {
			if (seen.has(p.id)) problems.push(`${key}：id ${p.id} 重复了，批注会串`);
			seen.add(p.id);
		}
	}
	return { batch, problems };
}

const itemIds = (b: Batch) => Object.values(b.spec?.elements ?? {}).filter((e) => ANNOTATABLE.includes(e.type)).map((e) => String((e.props as { id: string }).id));

/** 页面要的一批：spec、用到的推文、已有的批注、读完没有。校验不过的只给 problems */
export function load(id: string): BatchData {
	const { batch, problems } = check(id);
	const done = read<Record<string, string>>("reads", {})[id] ?? null;
	if (problems.length) return { id, title: batch.title ?? id, problems, done };
	const all = read<Record<string, Stored>>("tweets", {});
	const tweets = Object.fromEntries(Object.values(batch.spec.elements).filter((e) => e.type === "Tweet").map((e) => {
		const tid = (e.props as { id: string }).id;
		return [tid, all[tid]];
	}));
	const notes = Object.fromEntries(annotations(id).map((a) => [a.item, { marks: a.marks, note: a.note }]));
	return { id, title: batch.title, spec: batch.spec, tweets, notes, done };
}

/** 首页的列表：新的在前 */
export function list(): BatchSummary[] {
	const notes = annotations();
	const reads = read<Record<string, string>>("reads", {});
	return ids().map((id): BatchSummary => {
		const b = read<Batch>(`batches/${id}`, {} as Batch);
		const items = itemIds(b);
		return {
			id,
			title: b.title ?? id,
			created: b.created ?? null,
			// 和批次页一样，末尾「这一批整体」也算一条
			items: items.length + 1,
			noted: notes.filter((n) => n.batch === id).length,
			done: reads[id] ?? null,
		};
	}).sort((a, b) => (b.created ?? "").localeCompare(a.created ?? ""));
}

/** 这一批（或全部）的批注 */
export function annotations(batch?: string): Annotation[] {
	return read<Annotation[]>("annotations", []).filter((a) => !batch || a.batch === batch);
}

/** 存一条批注；标记和字都空了就是撤掉 */
export function annotate(batch: string, n: Omit<Annotation, "batch" | "at">): void {
	const rest = annotations().filter((a) => !(a.batch === batch && a.item === n.item));
	if (n.marks.length || n.note.trim()) rest.push({ batch, item: n.item, kind: n.kind, target: n.target ?? null, marks: n.marks, note: n.note, at: new Date().toISOString() });
	write("annotations", rest);
}

export function markDone(batch: string): string {
	const reads = read<Record<string, string>>("reads", {});
	reads[batch] = new Date().toISOString();
	write("reads", reads);
	return reads[batch];
}

export type Inbox = {
	since: string | null;
	done: { batch: string; at: string }[];
	notes: Annotation[];
	/** 学习清单里人改过的项（状态、读完哪篇、备注） */
	study: ({ id: string; title: string } & StudyState)[];
};

/** 游标之后：哪些批读完了、哪些批注是新写或改过的。advance 把游标挪到现在 */
export function inbox(advance: boolean): Inbox {
	const since = read<{ cursor: string | null }>("inbox", { cursor: null }).cursor;
	const after = (at: string) => !since || at > since;
	const done = Object.entries(read<Record<string, string>>("reads", {})).filter(([, at]) => after(at)).map(([batch, at]) => ({ batch, at }));
	const notes = annotations().filter((a) => after(a.at)).sort((a, b) => a.at.localeCompare(b.at));
	const study = studyView().items.filter((s) => s.state.at && after(s.state.at)).map((s) => ({ id: s.id, title: s.title, ...s.state }));
	if (advance) write("inbox", { cursor: new Date().toISOString() });
	return { since, done, notes, study };
}
