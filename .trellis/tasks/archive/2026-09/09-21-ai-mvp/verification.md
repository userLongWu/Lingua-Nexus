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
