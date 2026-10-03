// 入口：/ 是首页（所有批次），/b/<id> 是一批，/study 是学习清单。页面间用普通链接跳，不用前端路由库。
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BatchPage } from "./pages/batch.tsx";
import { Home } from "./pages/home.tsx";
import { StudyPage } from "./pages/study.tsx";
import "./index.css";

// 跟系统的深浅色
const dark = matchMedia("(prefers-color-scheme: dark)");
const theme = () => document.documentElement.classList.toggle("dark", dark.matches);
dark.addEventListener("change", theme);
theme();

const batch = /^\/b\/([\w.-]+)\/?$/.exec(location.pathname)?.[1];

createRoot(document.getElementById("root") as HTMLElement).render(<StrictMode>{batch ? <BatchPage id={decodeURIComponent(batch)} /> : location.pathname.startsWith("/study") ? <StudyPage /> : <Home />}</StrictMode>);
