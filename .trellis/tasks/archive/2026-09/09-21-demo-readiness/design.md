# Design

Preserve the Tauri command boundary and Card schema. Derive dictionary front/back content compatibly from sourceType, wordToLearn and originalText. Import one SRT cue or nonempty plain-text line per card instead of splitting punctuation. Ignore stale async detail responses. Wrap multi-write SQLite operations in transactions without a schema migration.

## Compatibility
Keep existing data and feature contracts. Use focused diffs and the existing test stack. Never reset user records. Changes remain local and reviewable.
