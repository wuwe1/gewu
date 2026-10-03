// 文字里的链接、@人、#话题 变成可点的；时间、数字的显示
const TOKEN = /(https?:\/\/[^\s<>"）)]+)|(?<![\w/])@(\w{1,15})|(?<![\w/&])#([\p{L}\p{N}_]+)/gu;

export function Rich({ text, className }: { text: string; className?: string }) {
	const out: React.ReactNode[] = [];
	let last = 0;
	for (const m of text.matchAll(TOKEN)) {
		const i = m.index ?? 0;
		if (i > last) out.push(text.slice(last, i));
		const [all, url, handle, tag] = m;
		const href = url ?? (handle ? `https://x.com/${handle}` : `https://x.com/hashtag/${encodeURIComponent(tag)}`);
		const label = url ? url.replace(/^https?:\/\/(www\.)?/, "").replace(/(.{48}).+/, "$1…") : all;
		out.push(<a key={i} href={href} target="_blank" rel="noreferrer" className="text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary">{label}</a>);
		last = i + all.length;
	}
	if (last < text.length) out.push(text.slice(last));
	return <p className={`whitespace-pre-wrap break-words ${className ?? ""}`}>{out}</p>;
}

const compact = new Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 });
export const count = (n: number | null | undefined) => (n ? compact.format(n) : "");

const rtf = new Intl.RelativeTimeFormat("zh-CN", { numeric: "auto" });
export function ago(iso: string): string {
	const s = (Date.parse(iso) - Date.now()) / 1000;
	const steps: [number, Intl.RelativeTimeFormatUnit][] = [[60, "second"], [60, "minute"], [24, "hour"], [7, "day"], [4.35, "week"], [12, "month"], [Infinity, "year"]];
	let v = s;
	for (const [n, unit] of steps) {
		if (Math.abs(v) < n) return rtf.format(Math.round(v), unit);
		v /= n;
	}
	return iso;
}

export const full = (iso: string) => new Date(iso).toLocaleString("zh-CN", { hour12: false });
