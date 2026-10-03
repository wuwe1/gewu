// 批注栏：一排标记（shadcn Toggle 的样子）+ 一个会长高的输入框。改了就存（notes.ts）。
// 键盘：卡片带 data-annotate，页面级的快捷键（main.tsx）按 data-mark 点标记、按 data-note 聚焦输入框。
import { Check, Loader2, TriangleAlert } from "lucide-react";
import { useLayoutEffect, useRef } from "react";
import { type Ref, setNote, useNote } from "../notes.ts";

export function Annotate({ id, marks, placeholder = "批注：想到什么、哪里不懂、和什么有关……", ...target }: { id: string; marks: readonly string[]; placeholder?: string } & Ref) {
	const { note, status } = useNote(id);
	const area = useRef<HTMLTextAreaElement>(null);

	// 输入框跟着内容长高
	useLayoutEffect(() => {
		const el = area.current;
		if (!el) return;
		el.style.height = "auto";
		el.style.height = `${el.scrollHeight}px`;
	}, [note.note]);

	const toggle = (m: string) => {
		const on = note.marks.includes(m);
		setNote(id, target, { ...note, marks: on ? note.marks.filter((x) => x !== m) : [...note.marks, m] });
	};

	return (
		<div className="flex flex-col gap-2 border-t border-dashed pt-3">
			<div className="flex flex-wrap items-center gap-1.5">
				{marks.map((m, i) => {
					const on = note.marks.includes(m);
					return (
						<button
							key={m}
							type="button"
							data-mark={i + 1}
							aria-pressed={on}
							onClick={() => toggle(m)}
							className={`inline-flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-[color,box-shadow,background-color] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
								on ? "border-primary bg-primary text-primary-foreground shadow-xs" : "border-input bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground"
							}`}
						>
							<kbd className={`font-mono text-[10px] ${on ? "opacity-70" : "opacity-50"}`}>{i + 1}</kbd>
							{m}
						</button>
					);
				})}
				<span className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
					{status === "saving" && <><Loader2 className="size-3 animate-spin" />存着</>}
					{status === "saved" && <><Check className="size-3" />已存</>}
					{status === "error" && <span className="flex items-center gap-1 text-destructive"><TriangleAlert className="size-3" />没存上：阅读服务断了？跑一下 gewu open</span>}
				</span>
			</div>
			<textarea
				ref={area}
				data-note
				rows={1}
				value={note.note}
				placeholder={placeholder}
				onChange={(e) => setNote(id, target, { ...note, note: e.target.value })}
				className="w-full resize-none overflow-hidden rounded-md border border-input bg-transparent px-3 py-2 text-sm leading-relaxed shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
			/>
		</div>
	);
}

/** 可批注的卡片外壳：shadcn Card 的样子，键盘选中时有一圈 ring */
export function Entry({ children }: { children: React.ReactNode }) {
	return (
		<article
			data-annotate
			tabIndex={-1}
			className="group/entry flex w-full scroll-mt-20 flex-col gap-4 rounded-xl border bg-card px-5 py-4 text-card-foreground shadow-sm transition-[box-shadow,border-color] outline-none data-[current]:border-ring data-[current]:ring-[3px] data-[current]:ring-ring/30"
		>
			{children}
		</article>
	);
}

/** agent 写的「为什么放进这一批」 */
export function Why({ text }: { text: string | null }) {
	if (!text) return null;
	return <p className="border-l-2 border-primary/40 pl-3 text-sm leading-relaxed text-muted-foreground">{text}</p>;
}
