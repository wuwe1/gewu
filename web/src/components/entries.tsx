// gewu 自己的组件：Tweet、Item、Source、Ask。外壳都是 Entry（卡片）+ Annotate（批注栏）。
import { ArrowUpRight, Bookmark, Eye, Heart, MessageCircle, Repeat2 } from "lucide-react";
import { MARKS, SOURCE_MARKS } from "../catalog.ts";
import { useContext, useState } from "react";
import { Tweets } from "../live.ts";
import type { Tweet as T } from "../types.ts";
import { Annotate, Entry, Why } from "./annotate.tsx";
import { ago, count, full, Rich } from "./rich.tsx";

function Avatar({ src, name }: { src: string | null; name: string }) {
	return (
		<span className="relative flex size-9 shrink-0 overflow-hidden rounded-full bg-muted">
			{src ? <img src={src} alt="" className="size-full object-cover" /> : <span className="m-auto text-xs font-medium text-muted-foreground">{name.slice(0, 1)}</span>}
		</span>
	);
}

function Media({ items }: { items: T["media"] }) {
	const [big, setBig] = useState<string | null>(null);
	if (items.length === 0) return null;
	return (
		<>
			<div className={`grid gap-1 overflow-hidden rounded-lg border ${items.length > 1 ? "grid-cols-2" : ""}`}>
				{items.map((m) =>
					m.video ? (
						<video key={m.url} src={m.video} poster={m.url} controls preload="none" className="max-h-[28rem] w-full bg-muted object-contain" />
					) : (
						<button key={m.url} type="button" onClick={() => setBig(m.url)} className="block cursor-zoom-in bg-muted">
							<img src={m.url} alt="" loading="lazy" className={`w-full object-cover ${items.length > 1 ? "aspect-square" : "max-h-[28rem] object-contain"}`} />
						</button>
					),
				)}
			</div>
			{big && (
				<button type="button" onClick={() => setBig(null)} className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/80 p-6 animate-in fade-in-0">
					<img src={`${big}?name=large`} alt="" className="max-h-full max-w-full rounded-md" />
				</button>
			)}
		</>
	);
}

function Byline({ t, size = "md" }: { t: Pick<T, "author" | "created" | "url">; size?: "sm" | "md" }) {
	return (
		<div className="flex min-w-0 items-center gap-2.5">
			{size === "md" && <Avatar src={t.author.avatar} name={t.author.name} />}
			<div className={`flex min-w-0 ${size === "md" ? "flex-col" : "items-baseline gap-1.5"}`}>
				<span className="truncate text-sm font-semibold leading-tight">{t.author.name}</span>
				<span className="truncate text-xs text-muted-foreground">
					@{t.author.handle} · <time title={full(t.created)}>{ago(t.created)}</time>
				</span>
			</div>
			<a href={t.url} target="_blank" rel="noreferrer" title="在 X 上打开" className="ml-auto inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
				<ArrowUpRight className="size-4" />
			</a>
		</div>
	);
}

function Stat({ icon: Icon, n }: { icon: typeof Heart; n: number | null }) {
	if (!n) return null;
	return <span className="inline-flex items-center gap-1 tabular-nums"><Icon className="size-3.5" />{count(n)}</span>;
}

export function Tweet({ props }: { props: { id: string; note: string | null } }) {
	const t = useContext(Tweets)[props.id];
	if (!t) {
		return <Entry><p className="text-sm text-destructive">data/tweets.json 里没有推文 {props.id}</p><Annotate id={props.id} kind="tweet" target={props.id} marks={MARKS} /></Entry>;
	}
	return (
		<Entry>
			<Why text={props.note} />
			{t.retweetedBy && <p className="-mb-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Repeat2 className="size-3.5" />@{t.retweetedBy} 转发</p>}
			<Byline t={t} />
			{t.replyTo && <p className="-mt-2 text-xs text-muted-foreground">回复 @{t.replyTo}</p>}
			<Rich text={t.text} className="text-[15px] leading-7" />
			<Media items={t.media} />
			{t.quoted && (
				<div className="flex flex-col gap-2 rounded-lg border bg-muted/40 px-4 py-3">
					<Byline t={t.quoted} size="sm" />
					<Rich text={t.quoted.text} className="text-sm leading-6" />
					<Media items={t.quoted.media} />
				</div>
			)}
			<div className="flex gap-4 text-xs text-muted-foreground">
				<Stat icon={MessageCircle} n={t.counts.replies} />
				<Stat icon={Repeat2} n={t.counts.retweets + t.counts.quotes} />
				<Stat icon={Heart} n={t.counts.likes} />
				<Stat icon={Bookmark} n={t.counts.bookmarks} />
				<Stat icon={Eye} n={t.counts.views} />
			</div>
			<Annotate id={t.id} kind="tweet" target={t.id} marks={MARKS} />
		</Entry>
	);
}

type ItemProps = { id: string; title: string; url: string | null; site: string | null; text: string | null; note: string | null };
export function Item({ props: p }: { props: ItemProps }) {
	return (
		<Entry>
			<Why text={p.note} />
			<div className="flex flex-col gap-1">
				{p.site && <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{p.site}</span>}
				<h3 className="text-base font-semibold leading-snug">
					{p.url ? <a href={p.url} target="_blank" rel="noreferrer" className="hover:underline underline-offset-4">{p.title}<ArrowUpRight className="ml-0.5 inline size-4 align-text-top text-muted-foreground" /></a> : p.title}
				</h3>
			</div>
			{p.text && <Rich text={p.text} className="text-sm leading-6 text-muted-foreground" />}
			<Annotate id={p.id} kind="item" target={p.url} marks={MARKS} />
		</Entry>
	);
}

const KIND: Record<string, string> = { x: "X", blog: "博客", paper: "论文", repo: "仓库", site: "网站", book: "书", person: "人", other: "其他" };
type SourceProps = { id: string; name: string; url: string | null; kind: string; why: string };
export function Source({ props: p }: { props: SourceProps }) {
	return (
		<Entry>
			<div className="flex items-start gap-3">
				<span className="inline-flex h-5 shrink-0 items-center rounded-md border px-2 text-[11px] font-medium text-muted-foreground">{KIND[p.kind] ?? p.kind}</span>
				<div className="flex min-w-0 flex-col gap-1">
					<h3 className="text-base font-semibold leading-tight">
						{p.url ? <a href={p.url} target="_blank" rel="noreferrer" className="hover:underline underline-offset-4">{p.name}</a> : p.name}
					</h3>
					<p className="text-sm leading-6 text-muted-foreground">{p.why}</p>
				</div>
			</div>
			<Annotate id={p.id} kind="source" target={p.url} marks={SOURCE_MARKS} placeholder="为什么跟踪 / 为什么不用" />
		</Entry>
	);
}

type AskProps = { id: string; question: string; hint: string | null };
export function Ask({ props: p }: { props: AskProps }) {
	return (
		<Entry>
			<div className="flex flex-col gap-1.5">
				<span className="text-xs font-medium text-primary">想一想</span>
				<h3 className="text-base font-semibold leading-snug">{p.question}</h3>
				{p.hint && <p className="text-sm text-muted-foreground">{p.hint}</p>}
			</div>
			<Annotate id={p.id} kind="ask" marks={[]} placeholder="用自己的话写，写不清楚的地方就是要学的地方" />
		</Entry>
	);
}
