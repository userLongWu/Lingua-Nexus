# Design

Final review repair: backup import and review share schedule bounds (ease 1.3–10, repetitions 0–10,000, interval 0–36,500 days). Reject invalid values before writes, use checked addition, and cap extreme valid outputs so review/export/restore stays round-trippable without mutex poisoning.

## Implementation boundaries
Root owns README, USER_GUIDE and .trellis. Lingua executor owns application code, package scripts (no dependency changes), tests and .env.example/.gitignore entries.
AI config uses env vars; npm tauri launcher loads .env.local using Node's native --env-file-if-exists (Node 24 tested). Production binary can inherit these env vars. Never embed a shared developer key into a distributed desktop binary.
Use existing Rust reqwest/serde and Tauri invoke boundary. Network work must not hold SQLite locks or block the main UI. Expose safe config status. Reuse the existing models/DB; add import validation and transaction boundaries rather than a parallel storage layer.
Export to the user's Downloads directory with a unique filename and report the path; restore reads file content selected by the user in the WebView, validates size/schema/references before DB access, and reports skipped conflicts explicitly. Treat review history of a skipped conflicting card conservatively.

## Official API evidence
- https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create
- https://developers.openai.com/api/reference/overview
- https://developers.openai.com/api/docs/guides/error-codes
