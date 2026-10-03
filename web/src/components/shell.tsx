// 页面骨架：顶栏、断线提示、键盘提示
import { WifiOff } from "lucide-react";

export function Bar({ children }: { children: React.ReactNode }) {
	return (
		<header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="mx-auto flex h-14 max-w-2xl items-center gap-4 px-4">{children}</div>
		</header>
	);
}

export function Offline({ up }: { up: boolean }) {
	if (up) return null;
	return (
		<div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
			<WifiOff className="size-4 shrink-0" />
			阅读服务断开了，批注暂时存不上。终端里跑 <code className="font-mono text-xs">gewu open</code> 会把它起来，这一页会自己连回去。
		</div>
	);
}

export function Kbd({ children }: { children: React.ReactNode }) {
	return <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1 font-mono text-[10px] font-medium text-muted-foreground">{children}</kbd>;
}

export const time = (iso: string) => new Date(iso).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

/** 顶栏左边：格物 + 批次 / 学习 */
export function Nav({ at }: { at: "batches" | "study" }) {
	const tab = (href: string, label: string, on: boolean) => (
		<a href={href} aria-current={on ? "page" : undefined} className={`inline-flex h-8 items-center rounded-md px-2.5 text-sm font-medium transition-colors ${on ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}>
			{label}
		</a>
	);
	return (
		<nav className="flex items-center gap-1">
			<span className="mr-2 text-sm font-semibold">格物</span>
			{tab("/", "批次", at === "batches")}
			{tab("/study", "学习", at === "study")}
		</nav>
	);
}
