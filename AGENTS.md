# Project Context for AI Coding Agents

You are building **Lingua Nexus**, a Tauri v2 + React + TypeScript desktop application for language learning. The user's immediate goal is to run `npm run tauri dev` and see a working Phase 1 MVP.

## Global Constraints
- **No online account, fully local**: all data lives in SQLite inside the app's local data directory (`tauri::api::path::app_local_data_dir`).
- **Use TypeScript strictly**, with proper typing.
- **Rust backend**: use `tauri::command` for all DB operations. Do not access SQLite directly from the frontend.
- **UI style**: clean, minimal, professional. Use Tailwind CSS.
- **Every component must handle loading, empty, and error states.**
- **After every file creation/modification, ensure the app compiles and runs: `npm run tauri dev` should succeed.**

## Phase 1 MVP – Specs
Build the **Corpus Card & Spaced Repetition System**. The user must be able to:
1. Create text-based learning cards manually.
2. Paste whole subtitles (SRT format or plain text sentences) and automatically convert them into cards.
3. Look up a word (using a free dictionary API) and create a card from the result.
4. Review cards based on a simple spaced repetition algorithm (SM-2).
5. See a basic dashboard with cards due today.

## Database Schema (SQLite)
```sql
CREATE TABLE cards (
  id TEXT PRIMARY KEY,          -- UUID
  source_type TEXT NOT NULL,    -- 'text', 'subtitle', 'dictionary'
  source_title TEXT,            -- e.g., "Friends S01E01"
  original_text TEXT NOT NULL,  -- the sentence/clip text
  translated_text TEXT,         -- translation
  word_to_learn TEXT,           -- when source_type='dictionary'
  pronunciation TEXT,
  image_path TEXT,
  audio_path TEXT,
  tags TEXT,                    -- JSON array
  easiness_factor REAL DEFAULT 2.5,
  repetition_number INTEGER DEFAULT 0,
  interval_days INTEGER DEFAULT 0,
  next_review_date TEXT,        -- ISO date string
  last_review_date TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  extra_data TEXT               -- JSON
);

CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  score INTEGER CHECK(score BETWEEN 1 AND 4),
  review_date TEXT DEFAULT (datetime('now'))
);

Rust Commands to Implement
In src-tauri/src/main.rs (or a separated module), create the following commands:

create_card(card: Card) -> Result<Card, String>

get_cards_due_today() -> Vec<Card>

review_card(card_id: String, score: u8) -> Result<(), String>

import_from_srt(srt_content: String, source_title: String) -> Vec<Card>

lookup_word(word: String) -> Card – use a free API like https://api.dictionaryapi.dev/api/v2/entries/en/{word}


Frontend Component Tree

App.tsx
├─ Sidebar.tsx (navigation: Dashboard, Cards, Import, Review)
├─ DashboardPage.tsx
│  ├─ StatsCard.tsx (cards due, total)
│  └─ DueCardsList.tsx (map of CardItem)
├─ ImportPage.tsx
│  ├─ ManualCardForm.tsx
│  ├─ SrtImport.tsx (textarea + preview)
│  └─ DictionaryLookup.tsx (search input)
├─ CardsPage.tsx (search, filter, list)
│  └─ CardDetail.tsx (edit, history)
└─ ReviewPage.tsx
   └─ RevisoryFlow.tsx (show card, tap score 1-4)



Start Building (Step-by-step instructions for you, the coding agent)
1.Initialize the Tauri + React project if not already done in current workspace.
  Use npm create tauri-app@latest with React + TypeScript template.

  Ensure src-tauri and src directories exist.

2.Set up SQLite in Rust

  Add rusqlite with bundled feature to Cargo.toml.

  Create a db.rs module that initializes the connection, runs migration (the above schema), and stores it in Tauri's state.

3.Implement the Rust commands listed above, with error handling.

4.Develop frontend pages

  Start with DashboardPage.tsx: call get_cards_due_today and render Count + DueCardsList.

  Then ManualCardForm.tsx for single card creation.

  Progress to SrtImport.tsx and RevisoryFlow.tsx.

5.Write the review algorithm

  Follow SM-2: update easiness_factor, repetition_number, interval_days, next_review_date based on score.

6.Test full flow: Create a card, patch it to be due today, see it on dashboard, review it, verify date moves forward.


After Phase 1 Works
Commit as v0.1.0 with a tag.

Plan Phase 2: Add a writing area with sidebar that recommends cards (requires a simple text similarity search later).

Plan Phase 3: Visual graph (use reactflow or vis-network).

Now, start implementing step 1. Do not skip the project scaffolding.