# Journal - userLongWu (Part 1)

> AI development session journal
> Started: 2026-09-21

---



## Session 1: 完善可演示版本

**Date**: 2026-09-21
**Task**: 完善可演示版本
**Branch**: `main`

### Summary

完成用户确认的 Demo 范围，自动测试、独立审查与实际 UI 验证通过；无新依赖或数据迁移，未推送 GitHub。

### Main Changes

# 验证记录 · 2026-09-21

## 完成范围
- 词典复习先显示单词，翻面显示释义；清除过期查询结果并防止重复保存。
- SRT 按片段、纯文本按非空行导入，前后端预览与解析一致。
- 选择卡片与请求结果绑定，过期的历史和保存响应不抢占当前卡片。
- 导入和复习写入使用 SQLite 事务，异常时完整回滚。
- 修复 CardDetail 在 React StrictMode 中访问失效 currentTarget 的输入崩溃。
- README 与 USER_GUIDE 按已实现的本地 Demo 重写，去除未实现功能描述。

## 自动验证（最终代码）
- npm test：20/20。
- npm run build：TypeScript 与前端构建通过。
- cargo test --manifest-path src-tauri/Cargo.toml：12/12 后端测试。
- cargo fmt --manifest-path src-tauri/Cargo.toml --check：通过。
- cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings：通过。
- git diff --check：通过。
- npm run tauri build -- --debug --bundles app（测试 identifier 配置）：成功生成本机 app。

## 原生窗口验证
使用 com.linguanexus.demoqa20260921 隔离测试数据库，未触及默认用户数据。
- 空 Dashboard 正确显示 0 张卡。
- 新建手动卡，编辑原文与中文译文后保存成功。
- SRT 示例 Dr. Smith paid 3.14 dollars... 与 2026 预览和导入均为 2 张卡，正文完整。
- hello 在线查询成功，保存后按钮为禁用的 Card created。
- 词典卡复习正面仅有 hello，Show answer 后才出现英文释义。
- Good 评分后剩余待复习从 4 变为 3，复习历史为 Score 3，下次日期更新。
- 退出再打开应用，4 张卡和已保存的复习安排均保留。
- 搜索 Smith、打开结果，正文与空复习历史对应正确卡片。

## 独立审查
初次审查发现 CardDetail 现有事件生命周期缺陷；修复后复审确认根因已解决。新增测试先复现旧实现崩溃，再验证事件清空后 updater 重放仍可编辑和保存。现有 hook adapter 是单元测试工具，不等价于真实 React DOM，因此另做上述原生窗口验证。

## 边界
未新增依赖、迁移数据结构、接入真实 AI、部署或推送。验证平台为本机 macOS，未验证 Windows/Linux 打包；第三方词典仍受网络状态影响。


### Git Commits

| Hash | Message |
|------|---------|
| `b2d1eec` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete


## Session 2: 真实 AI 本地 MVP

**Date**: 2026-09-21
**Task**: 真实 AI 本地 MVP
**Branch**: `main`

### Summary

完成真实翻译、备份恢复、复习统计与排期边界修复。27 前端和26 Rust测试通过；隔离桌面实际流程通过。真实提供方需用户本机配置。

### Main Changes

# MVP verification — 2026-09-21

## Result

Implemented and independently reviewed the confirmed local, single-user real-AI MVP. No new dependency or SQLite schema migration. No production deployment or GitHub push.

## Automated evidence

- `npm test`: 27/27 frontend tests passed.
- `npm run build`: TypeScript and Vite passed.
- `cargo test --manifest-path src-tauri/Cargo.toml`: 26 Rust tests passed (3 AI HTTP, 8 backup, 15 existing/backend regressions).
- `cargo fmt --manifest-path src-tauri/Cargo.toml --check`: passed.
- `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings`: passed.
- Debug macOS application bundle built successfully after the final schedule fix.
- `git diff --check`: passed; fixture credential absent from frontend dist; `.env.local` ignored.
- Independent reviewer verified the final schedule patch with 23 Rust backend/backup tests; the unchanged AI contract suite had also passed. No remaining blocking findings.

## Actual desktop verification

Used isolated identifier `com.linguanexus.mvpqa20260921`, synthetic cards, and a loopback HTTP fixture. The daily-use database was untouched.

- Missing configuration disables translation and shows setup guidance; manual card creation succeeds.
- After restarting with fixture configuration, the manual card persists.
- Source text → Translate with AI → result preview leaves translation field unchanged → Apply translation fills it → Create card persists it.
- Review shows saved translation; Good records one review. Dashboard reports two cards, one due card, one review today, and one in today's seven-day bucket.
- Export creates a JSON in Downloads with two cards and one review. Selecting it in the native file picker reports 0 additions, 2 skipped cards, 1 skipped review, no conflicts.
- Fixture quota failure preserves original and existing translation, with actionable error text.
- Data page layout inspected in the actual native window.

## Review repair

Malicious repetition counts could previously overflow while holding the database mutex. Restore now validates the shared schedule domain before any write; checked addition avoids panic. Maximum valid schedules remain valid through review/export/restore. Bounds: ease 1.3–10, repetitions 0–10,000, interval 0–36,500 days. Regression tests prove zero writes for malformed backups and continued database access after invalid schedules.

## Validation limits

No live provider key was supplied. HTTP contracts, error handling and UI integration were tested with a deterministic local fixture; actual provider/model availability and translation quality remain unverified. Only macOS was exercised. Cloud sync, writing workspace, graph features and distribution signing are outside this MVP.


### Git Commits

| Hash | Message |
|------|---------|
| `35124ce` | (see git log) |

### Testing

- [OK] (Add test results)

### Status

[OK] **Completed**

### Next Steps

- None - task complete
