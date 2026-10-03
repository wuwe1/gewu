// 批次页的组件目录（json-render 的 catalog）：agent 写 spec 只能用这里列的组件，props 按这里的 zod 校验。
// 两类组件：
//   shadcn 现成的（排版、分组、提示）：直接取 @json-render/shadcn 的定义
//   gewu 自己的（信息流的条目）：Tweet、Item、Ask、Source，每个都自带批注栏
// 这个文件不碰 React：node 端（阅读服务、gewu check）也 import 它来校验 spec、生成给 agent 看的组件说明。
// 加组件改两处：这里的定义，registry.tsx 的画法。
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { shadcnComponentDefinitions as shadcn } from "@json-render/shadcn/catalog";
import { z } from "zod";

export const catalog = defineCatalog(schema, {
	components: {
		Stack: shadcn.Stack,
		Card: shadcn.Card,
		Heading: shadcn.Heading,
		Text: shadcn.Text,
		Badge: shadcn.Badge,
		Separator: shadcn.Separator,
		Alert: shadcn.Alert,
		Link: shadcn.Link,
		Collapsible: shadcn.Collapsible,
		Accordion: shadcn.Accordion,
		Tabs: shadcn.Tabs,
		Table: shadcn.Table,

		Tweet: {
			props: z.object({
				id: z.string().describe("推文 id：data/tweets.json 里有的。渲染时从那里取全文、图、引用"),
				note: z.string().nullable().describe("为什么放进这一批：这条在说什么、和哪件事相关、背后可能的源头。一两句，可以为 null"),
			}),
			description: "一条推文，带批注栏。批注按推文 id 记",
		},
		Item: {
			props: z.object({
				id: z.string().describe("批注用的 id，这一批里唯一（例 url 的 slug）"),
				title: z.string(),
				url: z.string().nullable(),
				site: z.string().nullable().describe("来自哪里：站点、作者、期刊"),
				text: z.string().nullable().describe("摘要或摘录"),
				note: z.string().nullable().describe("为什么放进这一批"),
			}),
			description: "一条不是推文的信息：文章、论文、仓库、视频。带批注栏",
		},
		Source: {
			props: z.object({
				id: z.string().describe("信息源的 id，同 data/sources.json（例 x:karpathy、web:arxiv-cs.CL）"),
				name: z.string(),
				url: z.string().nullable(),
				kind: z.enum(["x", "blog", "paper", "repo", "site", "book", "person", "other"]),
				why: z.string().describe("为什么认为它是源头：哪几条热点追溯到它、它一手在做什么"),
			}),
			description: "一个候选的信息源（热点的上游）。批注栏的标记是 跟踪 / 不用",
		},
		Ask: {
			props: z.object({
				id: z.string().describe("批注用的 id，这一批里唯一"),
				question: z.string(),
				hint: z.string().nullable().describe("提示：从哪想起、想到什么程度就够"),
			}),
			description: "问读者的一个问题，读者在下面写答案。用来逼自己想清楚，不是考试",
		},
	},
	actions: {},
});

/** 每条可批注的东西都能打的标记；Source 用 SOURCE_MARKS */
export const MARKS = ["有意思", "追源", "要学", "存疑", "噪音"] as const;
export const SOURCE_MARKS = ["跟踪", "不用"] as const;
