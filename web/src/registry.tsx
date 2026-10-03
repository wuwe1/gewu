// catalog 里每个组件怎么画：shadcn 的直接用 @json-render/shadcn 的实现，gewu 自己的在 components/entries.tsx
import { defineRegistry } from "@json-render/react";
import { shadcnComponents as shadcn } from "@json-render/shadcn";
import { catalog } from "./catalog.ts";
import { Ask, Item, Source, Tweet } from "./components/entries.tsx";

export const { registry } = defineRegistry(catalog, {
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
		Tweet,
		Item,
		Source,
		Ask,
	},
});
