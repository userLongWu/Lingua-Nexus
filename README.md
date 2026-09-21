# Lingua Nexus · 语言学习 Demo

一个使用 **Tauri 2、React、TypeScript、Rust 和 SQLite** 构建的桌面学习工具。当前演示的是完整的第一阶段流程：创建语料卡片、导入字幕、查询单词，再通过间隔复习回顾内容。

> 这是学习与验证交互的 Demo。AI 写作辅助、知识图谱和云同步尚未实现；当前版本无需账号，也不需要 AI API Key。

## 当前功能

- **Dashboard**：查看卡片总数、到期数量及待复习卡片。
- **Cards**：搜索卡片、按来源筛选，编辑原文、译文、标签和复习日期，查看复习历史，确认后删除。
- **Import**：手动建卡、粘贴 SRT 字幕或纯文本、预览导入内容；通过在线词典查询英文单词并保存。
- **Review**：先回想答案，再翻面查看，按 Again / Hard / Good / Easy 评分并更新下次复习日期。

数据保存在本机 SQLite。只有在线词典查询需要网络，会将查询的单词发送到 [Free Dictionary API](https://dictionaryapi.dev/)。

## 本地运行

本次验证环境：macOS、Node.js 24、npm 11、Rust 1.97、Xcode。其他系统还需满足 [Tauri 的平台前置要求](https://v2.tauri.app/start/prerequisites/)。

先确认 Node.js、Rust/Cargo 和平台编译工具已安装：

```bash
node --version
cargo --version
rustc --version

npm ci
npm run tauri dev
```

如果已安装 Rust 但终端提示找不到 Cargo，可先加载 Rust 环境：

```bash
source "$HOME/.cargo/env"
```

`npm run tauri dev` 会启动前端开发服务并打开桌面窗口。单独运行 `npm run dev` 只启动前端，浏览器没有 Tauri 的数据库接口，不能代替完整桌面演示。

## 三分钟演示

1. 打开 **Import**，手动添加原文 `I'm gonna head out.`，译文填写“我要走了。”，点击 **Create card**。
2. 粘贴以下 SRT，确认预览为两张卡片，然后导入：

   ```srt
   1
   00:00:01,000 --> 00:00:03,000
   Dr. Smith paid 3.14 dollars...

   2
   00:00:04,000 --> 00:00:06,000
   2026
   ```

3. 进入 **Cards**，搜索 `Smith`，编辑该卡的译文并保存。纯文本按非空行导入，SRT 按字幕片段导入；小数、缩写、省略号和数字正文会保留。
4. 进入 **Review**。新卡可以立即复习；点击 **Show answer** 后评分，完成的卡会移出本次队列，下次日期同时更新。
5. 回到 **Dashboard** 检查到期数；关闭再打开应用，确认记录仍在。

联网时还可以查询 `hello`，保存词典卡。词典卡复习时先显示单词，翻面后才显示释义；词典提供的是英文释义，不是自动中文翻译。

更详细的步骤与故障排查见 [使用指南](./USER_GUIDE.md)。

## 数据与限制

- 默认数据库文件名：`lingua-nexus.sqlite3`，位于 Tauri 应用本地数据目录。
- macOS 默认位置：`~/Library/Application Support/com.linguanexus.desktop/lingua-nexus.sqlite3`。
- 如需备份，先退出应用，再复制数据库文件；本 Demo 没有云同步。
- 词典依赖外部服务，网络不可用时可继续手动建卡、导入和复习。
- 删除卡片会一并删除其复习历史，请先确认。
- 当前间隔复习是简化算法，没有学习打卡、正确率统计或 AI 生成内容。

## 验证命令

```bash
npm test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
```

`npm run build` 验证 TypeScript 并构建前端资源。Rust 测试使用内存 SQLite，不修改日常学习数据库。
