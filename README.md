# Lingua Nexus（语言第二大脑）

> 一个基于真实语料的语言学习闭环系统。从视频/字幕中捕获知识切片，在写作输出时智能激活，最终构建个人语言知识星系。

## 核心理念
打破 Duolingo 式的“散装知识点”，将 **输入 → 内化 → 输出** 串联为可生长的个人语料库。
- **Capture**：从视频、文本中一键生成带上下文的语料卡片。
- **Connect**：以可视化图谱组织词汇、语法，形成网络。
- **Activate**：写作/口语时主动推送相关表达，并给出语境化反馈。

## 技术栈
- **桌面应用**：Tauri v2 (Rust 后端) + React (TypeScript) 前端
- **数据库**：SQLite（通过 `better-sqlite3` 或 `sqlx`，在 Rust 端操作）
- **UI**：Tailwind CSS + 组件库（Radix UI / Ant Design）
- **AI 集成**：预留 OpenAI / Ollama 接口用于语法润色、写作推荐

## 开发阶段
1. **Phase 1 (MVP)** – 基础语料卡片与间隔重复复习
2. **Phase 2** – 写作辅助面板与 AI 语法手术灯
3. **Phase 3** – 可视化知识图谱与多语言对比

## 本地开发
```bash
# 安装依赖
cd src-tauri
cargo install tauri-cli
cd ..
npm install

# 启动开发服务器
npm run tauri dev