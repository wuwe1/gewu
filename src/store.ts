// 数据都是 data/ 下的 JSON 文件（不进 git）。整份读、整份写；写先写临时文件再改名，写一半不会坏。
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const root = new URL("../", import.meta.url).pathname;
export const dataDir = join(root, "data");

const file = (name: string) => join(dataDir, `${name}.json`);

/** name 不带 .json，可以带目录（例 batches/2026-10-02-a） */
export function read<T>(name: string, fallback: T): T {
	const f = file(name);
	return existsSync(f) ? (JSON.parse(readFileSync(f, "utf8")) as T) : fallback;
}

export function write(name: string, value: unknown): void {
	const f = file(name);
	mkdirSync(dirname(f), { recursive: true });
	writeFileSync(`${f}.tmp`, `${JSON.stringify(value, null, "\t")}\n`);
	renameSync(`${f}.tmp`, f);
}

export const exists = (name: string) => existsSync(file(name));
