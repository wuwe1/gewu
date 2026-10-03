// YouTube：在 gewu 的标签页里打开视频页，读页面自带的 ytInitialPlayerResponse：标题、频道、发布日期、简介、时长，
// 有字幕就在页面里取字幕（优先人工字幕，其次自动字幕），存成纯文本。追源用：频道是不是官方的、什么时候发的、简介里注没注明出处。
// 视频的元数据进 data/videos.json，字幕进 data/transcripts/<id>.txt。
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { page } from "./browser.ts";
import { dataDir, read, write } from "./store.ts";

export type Video = {
	id: string;
	url: string;
	title: string;
	channel: string;
	channelUrl: string | null;
	published: string | null;
	seconds: number;
	views: number;
	description: string;
	transcript: { lang: string; auto: boolean; chars: number } | null;
	seen: string;
};

export function videoId(arg: string): string {
	const m = /(?:v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/.exec(arg) ?? /^([\w-]{11})$/.exec(arg);
	if (!m) throw new Error(`认不出视频 id：${arg}`);
	return m[1];
}

/** 在页面里跑：读元数据、取字幕 */
async function readPage() {
	type Any = any; // biome-ignore lint: YouTube 的数据没有类型
	const r: Any = (window as Any).ytInitialPlayerResponse;
	if (!r?.videoDetails) return null;
	const d = r.videoDetails;
	const mf = r.microformat?.playerMicroformatRenderer ?? {};
	const tracks: Any[] = r.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
	// 人工字幕优先；同类里中文、英文优先
	const rank = (t: Any) => (t.kind === "asr" ? 10 : 0) + (/^zh/.test(t.languageCode) ? 0 : /^en/.test(t.languageCode) ? 1 : 2);
	const track = [...tracks].sort((a, b) => rank(a) - rank(b))[0];
	let text: string | null = null;
	if (track?.baseUrl) {
		try {
			const res = await fetch(`${track.baseUrl}&fmt=json3`);
			const j: Any = await res.json();
			text = (j.events ?? []).map((e: Any) => (e.segs ?? []).map((s: Any) => s.utf8).join("")).join("").replace(/\n+/g, " ").trim() || null;
		} catch {
			text = null;
		}
	}
	return {
		title: d.title as string,
		channel: d.author as string,
		channelUrl: (mf.ownerProfileUrl as string) ?? null,
		published: (mf.publishDate as string) ?? (mf.uploadDate as string) ?? null,
		seconds: Number(d.lengthSeconds),
		views: Number(d.viewCount),
		description: (d.shortDescription as string) ?? "",
		track: track ? { lang: track.languageCode as string, auto: track.kind === "asr" } : null,
		text,
	};
}

export async function fetchVideo(arg: string): Promise<Video> {
	const id = videoId(arg);
	const url = `https://www.youtube.com/watch?v=${id}`;
	const p = await page("https://www.youtube.com");
	await p.goto(url);
	// 页面数据由脚本填进来：等它出现
	let got = null;
	for (let i = 0; i < 30 && !got; i++) {
		got = await p.run(readPage);
		if (!got) await new Promise((r) => setTimeout(r, 500));
	}
	if (!got) throw new Error(`${url} 没读到视频数据（页面结构变了？没登录？）`);
	const v: Video = {
		id,
		url,
		title: got.title,
		channel: got.channel,
		channelUrl: got.channelUrl,
		published: got.published,
		seconds: got.seconds,
		views: got.views,
		description: got.description,
		transcript: got.text && got.track ? { ...got.track, chars: got.text.length } : null,
		seen: new Date().toISOString(),
	};
	if (got.text) {
		const dir = join(dataDir, "transcripts");
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, `${id}.txt`), `${got.text}\n`);
	}
	const all = read<Record<string, Video>>("videos", {});
	all[id] = v;
	write("videos", all);
	return v;
}
