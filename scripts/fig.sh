#!/bin/sh
# notes/figures/*.tex（TikZ）→ 同名 .svg。字形转成路径，Obsidian 里直接显示，不用装字体。
# 用法：scripts/fig.sh            编译全部
#       scripts/fig.sh 名字.tex   只编译一个
set -e
export PATH="$HOME/Library/TinyTeX/bin/universal-darwin:$PATH"
cd "$(dirname "$0")/../notes/figures"
tmp=$(mktemp -d)
for f in ${@:-*.tex}; do
	name=${f%.tex}
	[ "$name" = style ] && continue  # 共用的样式，不是一张图
	latex -interaction=nonstopmode -halt-on-error -output-directory="$tmp" "$f" >/dev/null || { echo "$f 编译失败："; grep -A3 '^!' "$tmp/$name.log" | head -12; exit 1; }
	dvisvgm --no-fonts --exact-bbox -o "$name.svg" "$tmp/$name.dvi" 2>/dev/null
	echo "$name.svg"
done
rm -rf "$tmp"
