// 首页：所有批次，新的在前；批注进度、读完没有。有事件就重新取
import { ChevronRight, CircleCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Bar, Nav, Offline, time } from "../components/shell.tsx";
import { api, useEvents } from "../live.ts";
import type { BatchSummary } from "../types.ts";

export function Home() {
	const [list, setList] = useState<BatchSummary[] | null>(null);
	const refresh = useCallback(() => { api<BatchSummary[]>("/api/batches").then(setList, () => {}); }, []);
	useEffect(refresh, []);
	const up = useEvents(refresh);
	useEffect(() => { document.title = "格物"; }, []);

	return (
		<>
			<Bar>
				<Nav at="batches" />
				<span className="ml-auto text-xs text-muted-foreground">{list ? `${list.length} 批` : ""}</span>
			</Bar>
			<main className="mx-auto flex max-w-2xl flex-col gap-3 px-4 py-8">
				<Offline up={up} />
				{list?.length === 0 && <p className="text-sm text-muted-foreground">还没有批次。</p>}
				{list?.map((b) => {
					const pct = b.items ? Math.round((b.noted / b.items) * 100) : 0;
					return (
						<a key={b.id} href={`/b/${b.id}`} className="group flex items-center gap-4 rounded-xl border bg-card px-5 py-4 shadow-sm transition-[border-color,box-shadow] outline-none hover:border-ring/60 focus-visible:ring-[3px] focus-visible:ring-ring/50">
							<div className="flex min-w-0 flex-1 flex-col gap-2">
								<div className="flex items-center gap-2">
									<span className="truncate text-[15px] font-semibold leading-tight">{b.title}</span>
									{b.done && <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-secondary-foreground"><CircleCheck className="size-3" />读完了</span>}
								</div>
								<div className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
									<span>{b.id}</span>
									<span className="flex flex-1 items-center gap-2">
										<span className="h-1 max-w-32 flex-1 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary/70" style={{ width: `${pct}%` }} /></span>
										批注 {b.noted}/{b.items}
									</span>
									{b.done && <span>{time(b.done)}</span>}
								</div>
							</div>
							<ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
						</a>
					);
				})}
			</main>
		</>
	);
}
