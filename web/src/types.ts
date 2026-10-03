// 推文：src/x.ts 从 X 的时间线响应里解析出来，存在 data/tweets.json，批次页拿它画 Tweet
export type Tweet = {
	id: string;
	url: string;
	author: { handle: string; name: string; avatar: string | null };
	created: string;
	text: string;
	lang: string | null;
	media: { type: string; url: string; video?: string }[];
	quoted: Omit<Tweet, "quoted" | "retweetedBy"> | null;
	retweetedBy: string | null;
	replyTo: string | null;
	counts: { replies: number; retweets: number; likes: number; quotes: number; bookmarks: number; views: number | null };
};

// 页面和 daemon 之间：/api/batches 的一项、/api/b/<id> 的返回
export type BatchSummary = { id: string; title: string; created: string | null; items: number; noted: number; done: string | null };
export type BatchData =
	| { id: string; title: string; problems: string[]; done: string | null; spec?: undefined }
	| {
			id: string;
			title: string;
			spec: import("@json-render/core").Spec;
			tweets: Record<string, Tweet>;
			notes: Record<string, { marks: string[]; note: string }>;
			done: string | null;
			problems?: undefined;
	  };

// 学习清单：内容（agent 写）+ 状态（人在页面上改）
export type StudyItem = {
	id: string;
	title: string;
	/** 由来：哪一批的哪一条 */
	from: { batch: string; item: string | null; label: string }[];
	questions: string[];
	/** 读什么：一手优先，where 写到章节 */
	readings: { title: string; url: string | null; where: string | null }[];
	/** 可以写的原子笔记（notes/<名字>.md） */
	notes: string[];
	added: string;
};
export type StudyState = { status: "todo" | "doing" | "done"; read: number[]; note: string; at: string | null };
export type StudyView = { items: (StudyItem & { state: StudyState })[]; written: string[]; problems: string[] };
