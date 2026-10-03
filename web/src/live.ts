// 和阅读服务之间：取数据、订阅事件（SSE）。连接断了 EventSource 会自己重连，重连上就当作「可能错过了改动」通知一次 batch。
import { createContext, useEffect, useState } from "react";
import type { Tweet } from "./types.ts";

export async function api<T>(path: string, init?: { method: "POST"; body: unknown }): Promise<T> {
	const r = await fetch(path, init && { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(init.body) });
	if (!r.ok) throw new Error((await r.json().catch(() => null))?.error ?? `${r.status}`);
	return (r.status === 204 ? null : await r.json()) as T;
}

type Event = { type: "batch" | "note" | "done" | "study"; id: string | null };

/** 订阅服务的事件；返回连接是否正常 */
export function useEvents(on: (e: Event) => void): boolean {
	const [up, setUp] = useState(true);
	useEffect(() => {
		const es = new EventSource("/api/events");
		let lost = false;
		for (const type of ["batch", "note", "done", "study"] as const) es.addEventListener(type, (m) => on({ type, id: JSON.parse((m as MessageEvent).data).id }));
		es.onopen = () => { setUp(true); if (lost) on({ type: "batch", id: null }); lost = false; };
		es.onerror = () => { setUp(false); lost = true; };
		return () => es.close();
	}, [on]);
	return up;
}

/** 这一批用到的推文：批次页放进来，Tweet 组件取 */
export const Tweets = createContext<Record<string, Tweet>>({});
