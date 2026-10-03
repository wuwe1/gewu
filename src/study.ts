// 学习清单：热点引出来、值得弄懂的基础知识。和批次一样，内容和人的状态分两个文件，两边各写各的：
//   data/study.json        内容，agent 写：[{ id, title, from, questions, readings, notes, added }]
//   data/study-state.json  人的状态，只有阅读服务写：{ [id]: { status, read: [第几篇读完], note, at } }
// 页面在 /study；notes 里提议的笔记，notes/<名字>.md 写了就算写了。
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { StudyItem, StudyState, StudyView } from "../web/src/types.ts";
import { read, root, write } from "./store.ts";

export const STATUS = ["todo", "doing", "done"] as const;

function written(): string[] {
	const dir = join(root, "notes");
	return existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".md") && f !== "README.md").map((f) => f.slice(0, -3)) : [];
}

/** 内容的问题：缺字段、id 重复。页面和 gewu study 都会列出来 */
export function problems(items: StudyItem[]): string[] {
	const out: string[] = [];
	const seen = new Set<string>();
	items.forEach((s, i) => {
		const at = s.id ? `「${s.id}」` : `第 ${i + 1} 项`;
		if (!s.id) out.push(`${at}缺 id`);
		else if (seen.has(s.id)) out.push(`${at} id 重复了`);
		seen.add(s.id);
		if (!s.title) out.push(`${at}缺 title`);
		for (const k of ["from", "questions", "readings", "notes"] as const) if (!Array.isArray(s[k])) out.push(`${at}的 ${k} 要是数组`);
	});
	return out;
}

export function view(): StudyView {
	const items = read<StudyItem[]>("study", []);
	const state = read<Record<string, StudyState>>("study-state", {});
	return {
		items: items.map((s) => ({ ...s, state: state[s.id] ?? { status: "todo", read: [], note: "", at: null } })),
		written: written(),
		problems: problems(items),
	};
}

/** 人在页面上改了一项：状态、某一篇读完没有、备注 */
export function update(id: string, patch: { status?: StudyState["status"]; read?: { index: number; done: boolean }; note?: string }): StudyState {
	if (!read<StudyItem[]>("study", []).some((s) => s.id === id)) throw new Error(`没有这一项：${id}`);
	const all = read<Record<string, StudyState>>("study-state", {});
	const s: StudyState = all[id] ?? { status: "todo", read: [], note: "", at: null };
	if (patch.status && STATUS.includes(patch.status)) s.status = patch.status;
	if (patch.read) s.read = patch.read.done ? [...new Set([...s.read, patch.read.index])].sort() : s.read.filter((i) => i !== patch.read?.index);
	if (patch.note !== undefined) s.note = patch.note;
	s.at = new Date().toISOString();
	all[id] = s;
	write("study-state", all);
	return s;
}
