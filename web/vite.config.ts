import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	root: import.meta.dirname,
	plugins: [react(), tailwindcss()],
	// 本机看的页面，包大一点没关系
	build: { outDir: "dist", emptyOutDir: true, chunkSizeWarningLimit: 2000 },
});
