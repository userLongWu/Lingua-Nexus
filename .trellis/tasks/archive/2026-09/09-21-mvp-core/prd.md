# Real AI local MVP

## Confirmed scope
User selected real-AI single-user local MVP, using configurable OpenAI-compatible endpoints with local base URL, model and API key. No accounts, cloud sync, public deployment or GitHub push. No new package dependencies. Preserve all existing data.

## Shared acceptance
- Backend-only provider calls using AI_BASE_URL, AI_MODEL, AI_API_KEY from local environment; .env.local is ignored and never exported. Frontend only receives enabled/model status, never the key.
- Minimum Chat Completions contract (model/messages, choices[0].message.content), finite timeout and bounded payloads, no automatic retries, no silent mock fallback. HTTPS endpoints; HTTP only for explicit loopback endpoints. Disable redirects to avoid credential forwarding.
- Missing configuration, bad key, rate/quota limits, malformed output and timeout produce actionable errors without raw provider payloads. Original user input stays available.
- Versioned JSON backups validate entirely before writes; restore merges into existing data, preserves conflicting records and never wipes the database. Credentials are excluded.
- Targeted regressions, build/type checks, independent review and actual browser/native UI verification are required. Live external API validation depends on a user-configured key; contract tests must be explicitly described as local fixtures.
## Product acceptance
- Manual cards and existing card editor offer an explicit AI translate action producing Chinese translation from source text, with pending/error/result feedback. Applying an AI response must not overwrite text edited after the request or another selected card.
- Dashboard shows reviewed-today and the last seven days of review counts, sourced from saved reviews and using local dates consistently.
- A Data/Settings page exports all cards and reviews to a versioned JSON file in Downloads using the Rust backend, and accepts a selected JSON file for validated merge restore. Show added/skipped counts; never replace conflicting existing IDs or duplicate history.
- Existing card import, review, search and dictionary workflows remain working. Keep the current review schedule behavior. No database migration is needed.
