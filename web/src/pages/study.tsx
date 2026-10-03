// 学习清单：在学 / 待学 / 学完 三组。每项：由来、要回答的问题、读什么（勾掉）、可以写的笔记（写了自动打勾）、备注。
// 内容是 agent 写的（data/study.json），这里只改人的状态；改了先在页面上变，再存回服务。
import { ArrowUpRight, Check, CircleDashed, FileText } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Bar, Nav, Offline } from "../components/shell.tsx";
import { api, useEvents } from "../live.ts";
import type { StudyState, StudyView } from "../types.ts";

type Item = StudyView["items"][number];
type Patch = { status?: StudyState["status"]; read?: { index: number; done: boolean }; note?: string };

const STATUS: { value: StudyState["status"]; label: string }[] = [
	{ value: "todo", label: "待学" },
	{ value: "doing", label: "在学" },
	{ value: "done", label: "学完" },
];
const GROUPS: StudyState["status"][] = ["doing", "todo", "done"];

function Status({ value, onChange }: { value: StudyState["status"]; onChange: (v: StudyState["status"]) => void }) {
	return (
		<div role="radiogroup" className="inline-flex h-8 shrink-0 items-center rounded-lg bg-muted p-[3px]">
			{STATUS.map((s) => (
				<button
					key={s.value}
					type="button"
					role="radio"
					aria-checked={value === s.value}
					onClick={() => onChange(s.value)}
					className={`inline-flex h-full items-center rounded-md px-2.5 text-xs font-medium transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
						value === s.value ? "bg-background text-foreground shadow-sm dark:bg-input/30" : "text-muted-foreground hover:text-foreground"
					}`}
				>
					{s.label}
				</button>
			))}
		</div>
	);
}

function Label({ children }: { children: React.ReactNode }) {
	return <h4 className="text-xs font-medium text-muted-foreground">{children}</h4>;
}

/** 备注：本地为准（取回来的新数据不冲掉正在写的字），停手 600ms 存 */
function Note({ initial, onSave }: { initial: string; onSave: (v: string) => void }) {
	const [v, setV] = useState(initial);
	const area = useRef<HTMLTextAreaElement>(null);
	const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
	useLayoutEffect(() => {
		const el = area.current;
		if (!el) return;
		el.style.height = "auto";
		el.style.height = `${el.scrollHeight}px`;
	}, [v]);
	return (
		<textarea
			ref={area}
			rows={1}
			value={v}
			placeholder="备注：读到哪、卡在哪、想到什么"
			onChange={(e) => {
				setV(e.target.value);
				clearTimeout(timer.current);
				const next = e.target.value;
				timer.current = setTimeout(() => onSave(next), 600);
			}}
			className="w-full resize-none overflow-hidden rounded-md border border-input bg-transparent px-3 py-2 text-sm leading-relaxed shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
		/>
	);
}

function Card({ s, written, patch }: { s: Item; written: string[]; patch: (p: Patch) => void }) {
	const notesDone = s.notes.filter((n) => written.includes(n)).length;
	return (
		<article className={`flex flex-col gap-4 rounded-xl border bg-card px-5 py-4 text-card-foreground shadow-sm ${s.state.status === "done" ? "opacity-75" : ""}`}>
			<div className="flex items-start gap-3">
				<div className="flex min-w-0 flex-1 flex-col gap-1.5">
					<h3 className="text-base font-semibold leading-snug">{s.title}</h3>
					<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground tabular-nums">
						<span>读 {s.state.read.length}/{s.readings.length}</span>
						<span>笔记 {notesDone}/{s.notes.length}</span>
						{s.from.map((f) => (
							<a key={`${f.batch}-${f.item}`} href={`/b/${f.batch}`} className="underline decoration-border underline-offset-4 hover:text-foreground hover:decoration-foreground">{f.label}</a>
						))}
					</div>
				</div>
				<Status value={s.state.status} onChange={(status) => patch({ status })} />
			</div>

			{s.practice && s.practice.length > 0 && (
				<section className="flex flex-col gap-2 rounded-lg border bg-muted/40 px-4 py-3">
					<Label>动手（先做，卡住再查）</Label>
					<ol className="flex flex-col gap-1.5 text-sm leading-relaxed">
						{s.practice.map((p, i) => (
							<li key={p.task} className="flex gap-2">
								<span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] tabular-nums ${p.done ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{p.done ? <Check className="size-3" /> : i + 1}</span>
								<span className={p.done ? "text-muted-foreground" : ""}>{p.task}</span>
							</li>
						))}
					</ol>
				</section>
			)}

			{s.questions.length > 0 && (
				<section className="flex flex-col gap-2">
					<Label>要回答</Label>
					<ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm leading-relaxed marker:text-muted-foreground">
						{s.questions.map((q) => <li key={q}>{q}</li>)}
					</ol>
				</section>
			)}

			{s.readings.length > 0 && (
				<section className="flex flex-col gap-1">
					<Label>查（做到卡住时翻）</Label>
					{s.readings.map((r, i) => {
						const on = s.state.read.includes(i);
						return (
							<label key={r.title} className="group -mx-2 flex cursor-pointer items-start gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/60">
								<button
									type="button"
									role="checkbox"
									aria-checked={on}
									onClick={() => patch({ read: { index: i, done: !on } })}
									className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[4px] border shadow-xs transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${on ? "border-primary bg-primary text-primary-foreground" : "border-input dark:bg-input/30"}`}
								>
									{on && <Check className="size-3" />}
								</button>
								<span className={`flex min-w-0 flex-col text-sm leading-snug ${on ? "text-muted-foreground" : ""}`}>
									<span className={on ? "line-through decoration-muted-foreground/50" : ""}>
										{r.title}
										{r.url && (
											<a href={r.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="ml-1 inline-flex align-text-bottom text-muted-foreground hover:text-foreground" title={r.url}>
												<ArrowUpRight className="size-4" />
											</a>
										)}
									</span>
									{r.where && <span className="text-xs text-muted-foreground">{r.where}</span>}
								</span>
							</label>
						);
					})}
				</section>
			)}

			{s.notes.length > 0 && (
				<section className="flex flex-col gap-2">
					<Label>可以写的笔记</Label>
					<div className="flex flex-wrap gap-1.5">
						{s.notes.map((n) => {
							const done = written.includes(n);
							return (
								<span
									key={n}
									title={done ? `notes/${n}.md 写了` : `还没写 notes/${n}.md`}
									className={`inline-flex h-6 items-center gap-1 rounded-md border px-2 font-mono text-[11px] ${done ? "border-transparent bg-secondary text-secondary-foreground" : "border-dashed text-muted-foreground"}`}
								>
									{done ? <FileText className="size-3" /> : <CircleDashed className="size-3" />}
									{n}
								</span>
							);
						})}
					</div>
				</section>
			)}

			<Note initial={s.state.note} onSave={(note) => patch({ note })} />
		</article>
	);
}

export function StudyPage() {
	const [v, setV] = useState<StudyView | null>(null);
	const refresh = useCallback(() => { api<StudyView>("/api/study").then(setV, () => {}); }, []);
	useEffect(refresh, []);
	const up = useEvents(useCallback((e) => { if (e.type === "study" || e.id === null) refresh(); }, [refresh]));
	useEffect(() => { document.title = "学习 · 格物"; }, []);

	// 先在页面上改，再存；存完服务会推 study 事件，页面重新取一次
	const patch = (id: string) => (p: Patch) => {
		setV((cur) => cur && {
			...cur,
			items: cur.items.map((s) => {
				if (s.id !== id) return s;
				const read = p.read ? (p.read.done ? [...s.state.read, p.read.index] : s.state.read.filter((x) => x !== p.read?.index)) : s.state.read;
				return { ...s, state: { ...s.state, ...(p.status ? { status: p.status } : {}), ...(p.note !== undefined ? { note: p.note } : {}), read } };
			}),
		});
		api(`/api/study/${id}`, { method: "POST", body: p }).catch(refresh);
	};

	const count = (st: StudyState["status"]) => v?.items.filter((s) => s.state.status === st).length ?? 0;

	return (
		<>
			<Bar>
				<Nav at="study" />
				<span className="ml-auto text-xs text-muted-foreground tabular-nums">{v ? `在学 ${count("doing")} · 待学 ${count("todo")} · 学完 ${count("done")}` : ""}</span>
			</Bar>
			<main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-8">
				<Offline up={up} />
				{v?.problems.length ? (
					<div className="rounded-xl border border-destructive/40 bg-card px-5 py-4 text-sm shadow-sm">
						<p className="font-semibold text-destructive">data/study.json 有问题</p>
						<ul className="mt-2 list-disc space-y-1 pl-5 font-mono text-xs text-muted-foreground">{v.problems.map((p) => <li key={p}>{p}</li>)}</ul>
					</div>
				) : null}
				{v?.items.length === 0 && <p className="text-sm text-muted-foreground">还没有要学的。读批次时标「要学」，Claude 会整理进来。</p>}
				{v && GROUPS.map((g) => {
					const items = v.items.filter((s) => s.state.status === g);
					if (!items.length) return null;
					return (
						<section key={g} className="flex flex-col gap-3">
							<h2 className="flex items-baseline gap-2 text-sm font-semibold">
								{STATUS.find((s) => s.value === g)?.label}
								<span className="text-xs font-normal text-muted-foreground tabular-nums">{items.length}</span>
							</h2>
							{items.map((s) => <Card key={s.id} s={s} written={v.written} patch={patch(s.id)} />)}
						</section>
					);
				})}
			</main>
		</>
	);
}
