// 批注：页面里的一份内存副本 + 改了就存回阅读服务（POST /api/b/<id>/note，停手 600ms 后存）。
// 页面里的副本是准的：批次文件改了、页面换新 spec 时不重载批注，免得冲掉正在写的字。
// 组件用 useNote(id) 读写，顶栏用 useNoted() 数批注过几条。
import { useSyncExternalStore } from "react";

export type Note = { marks: string[]; note: string };
export type Ref = { kind: string; target?: string | null };
type Status = "saving" | "saved" | "error";

let batch = "";
let notes: Record<string, Note> = {};
const status: Record<string, Status> = {};
const listeners = new Set<() => void>();
const emit = () => { version++; for (const l of listeners) l(); };
let version = 0;
const timers: Record<string, ReturnType<typeof setTimeout>> = {};

/** 打开一批时调一次：已存的批注 */
export function initNotes(id: string, saved: Record<string, Note>): void {
	batch = id;
	notes = { ...saved };
	emit();
}

const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };

export function setNote(id: string, ref: Ref, next: Note): void {
	notes[id] = next;
	status[id] = "saving";
	emit();
	clearTimeout(timers[id]);
	timers[id] = setTimeout(async () => {
		try {
			const r = await fetch(`/api/b/${batch}/note`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ item: id, ...ref, ...notes[id] }),
			});
			status[id] = r.ok ? "saved" : "error";
		} catch {
			status[id] = "error";
		}
		emit();
	}, 600);
}

export function useNote(id: string): { note: Note; status: Status | undefined } {
	useSyncExternalStore(subscribe, () => version);
	return { note: notes[id] ?? { marks: [], note: "" }, status: status[id] };
}

const filled = (n: Note | undefined) => !!n && (n.marks.length > 0 || n.note.trim() !== "");

/** 已经批注过的条数（有标记或写了字） */
export function useNoted(ids: string[]): number {
	useSyncExternalStore(subscribe, () => version);
	return ids.filter((id) => filled(notes[id])).length;
}

/** 还有没存完的批注吗：点「读完了」前要等它们 */
export const pending = () => Object.values(status).some((s) => s === "saving");
