# Lingua Nexus · 本地语言学习 MVP

使用 **Tauri 2、React、TypeScript、Rust 和 SQLite** 构建的单用户桌面学习工具。可以创建语料卡片、导入字幕、查询英文单词、调用自己配置的 AI 翻译，再通过间隔复习回顾内容。

卡片与复习历史保存在本机，无需账号。**不配置 AI 也能使用手动建卡、导入、编辑和复习。** 当前没有云同步、AI 写作区或知识图谱。

## 已实现功能

| 页面 | 功能 |
| --- | --- |
| Dashboard | 总卡片数、到期数、今日复习操作数、最近 7 个本地日的复习次数 |
| Cards | 搜索、来源筛选、编辑、复习历史、确认删除；编辑时可请求 AI 中译 |
| Import | 手动建卡、SRT／纯文本预览导入、在线英文词典；手动表单可请求 AI 中译 |
| Review | 先回想再翻面，按 Again / Hard / Good / Easy 评分，保存历史并安排下次复习 |
| Data | AI 配置状态、导出完整卡片与复习历史、选择 JSON 备份进行合并恢复 |

AI 翻译由 Rust 后端调用 OpenAI 兼容的 Chat Completions 接口。只有点击 **Translate with AI** 才会发送原文；先预览，再由你应用译文和保存卡片。在线词典则会将查询单词发送给 [Free Dictionary API](https://dictionaryapi.dev/)。

## 本地运行

验证环境为 macOS、Node.js 24、npm 11、Rust 1.97 和 Xcode。安装平台编译工具前可参考 [Tauri 前置要求](https://v2.tauri.app/start/prerequisites/)。启动脚本使用 Node 的原生 env-file 支持，建议使用 Node.js 24 或更新版本。

```bash
node --version
cargo --version
rustc --version
npm ci
npm run tauri dev
```

如果 Rust 已安装但终端找不到 Cargo，先执行 `source "$HOME/.cargo/env"`。`npm run tauri dev` 会启动前端服务和桌面窗口。单独运行 `npm run dev` 只提供前端页面；普通浏览器没有 Tauri 数据库或 AI 后端，不能替代完整应用。

### 可选：配置真实 AI

首次配置时将 `.env.example` 复制为仓库根目录的 `.env.local`，填入自己的提供方参数：

```dotenv
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4.1-mini
AI_API_KEY=你的密钥
```

- `AI_BASE_URL` 是 API 基础地址，**不要附加 `/chat/completions`**；可换成兼容提供方的基础地址。
- `AI_MODEL` 必须是该提供方及账号可用的模型；示例模型可按实际情况替换。
- `AI_API_KEY` 为自己的密钥。`.env.local` 已被 Git 忽略，不要提交或分享。
- 地址要求 HTTPS；仅 `localhost`、`127.0.0.1`、`::1` 允许 HTTP，便于本机服务和测试。地址不能包含账号、密码、查询参数或 fragment。

修改配置后重启 `npm run tauri dev`。该命令通过 `node --env-file-if-exists=.env.local` 加载配置；终端已设置的同名环境变量优先。**Data** 页显示配置是否完整及模型名，不显示密钥；“Configured”不代表已验证服务连通性或账号权限。

应用向 `/chat/completions` 发送 `model` 与 `messages`，要求模型在返回内容中提供有效的 `{"translation":"中文译文"}` JSON。没有模拟答案或静默降级；认证、配额、超时及无效返回会显示错误并保留原文。请求上限为 30 秒，不自动重试、不跟随重定向；输入最多 20,000 UTF-8 字节，响应体最多 64 KiB。

### 打包与运行时配置

```bash
npm run tauri build
```

构建结果位于 `src-tauri/target/release/bundle/`。**密钥不会被嵌入桌面程序**：打包后的进程仍从运行时环境读取 `AI_BASE_URL`、`AI_MODEL`、`AI_API_KEY`。构建时加载 `.env.local` 不会让安装包自动携带这些值。

使用打包应用的 AI 功能时，应从已设置上述变量的终端或进程启动配置运行实际应用可执行文件。直接在 Finder 双击不会自动读取仓库里的 `.env.local`；未提供环境变量时仍可使用手动功能。不要把自己的配置文件随安装包分发。

## 快速体验

1. **Import** 手动填写原文 `I'm gonna head out.`。可自行填写“我要走了。”；配置 AI 后也可点击 **Translate with AI → Apply translation**，最后 **Create card**。
2. 在字幕区粘贴下方 SRT，检查预览为两张卡后导入：

   ```srt
   1
   00:00:01,000 --> 00:00:03,000
   Dr. Smith paid 3.14 dollars...

   2
   00:00:04,000 --> 00:00:06,000
   2026
   ```

3. **Cards** 搜索 `Smith`，进入编辑，补充或请求 AI 译文并保存。
4. **Review** 点击 **Show answer** 后评分；回到 **Dashboard** 查看今日和 7 日复习次数。
5. **Data → Export backup**，记录成功提示中的 Downloads 文件路径。恢复时选择该 JSON，检查新增／跳过／冲突数量。

完整操作与故障排查见 [使用指南](./USER_GUIDE.md)。

## 数据与本地边界

- 数据库为 Tauri 应用本地数据目录中的 `lingua-nexus.sqlite3`。macOS 默认：`~/Library/Application Support/com.linguanexus.desktop/lingua-nexus.sqlite3`。
- **Data** 导出的版本 1 JSON 包含所有卡片字段与复习历史，每次以唯一文件名保存到 Downloads；不包含 AI 配置或密钥，也不复制媒体路径指向的外部文件。
- 恢复会先完整验证格式、日期、数值和关联关系，再用 SQLite 事务合并。不会清空数据库或覆盖已有 ID；相同记录跳过，冲突记录保留本地，冲突卡在备份里的关联历史也跳过。
- 备份最多 20 MiB、50,000 张卡、200,000 条复习记录。复习数值须在支持范围内：ease 1.3–10、重复次数 0–10,000、间隔 0–36,500 天；极端计算结果封顶，正常 SM-2 流程不变。
- 今日与 7 日统计按**本地日的复习操作次数**计数，不是唯一卡片数、正确率或连续学习天数。
- 删除卡片会一并删除其复习历史。需要直接复制 SQLite 文件时，请先退出应用；日常优先使用 JSON 导出。
- 只有显式 AI 翻译和词典查询会使用对应外部服务。AI 提供方会接收你提交的原文；其他卡片不会自动上传，没有账号、云同步或云端备份功能。

## 验证

```bash
npm test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
```

测试覆盖过期 AI 结果、显式应用、备份冲突与事务回滚、异常数值及统计。Rust 数据测试使用内存 SQLite 和临时目录，不修改日常学习库；AI 合约测试使用本机 HTTP fixture，覆盖成功、坏密钥、配额错误、无效输出和超时。**尚未使用真实提供方密钥验证线上 AI 服务**，本地 fixture 通过不代表你的模型或账户已可用。
