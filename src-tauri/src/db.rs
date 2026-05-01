use crate::models::{Card, CardStats, Review};
use chrono::Local;
use rusqlite::{params, Connection, OptionalExtension, Row};
use std::fs;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};
use uuid::Uuid;

pub struct AppState {
    pub conn: Mutex<Connection>,
}

pub fn init_database(app: &AppHandle) -> Result<Connection, Box<dyn std::error::Error>> {
    let data_dir = app.path().app_local_data_dir()?;
    fs::create_dir_all(&data_dir)?;
    let db_path = data_dir.join("lingua-nexus.sqlite3");
    let conn = Connection::open(db_path)?;
    run_migration(&conn)?;
    Ok(conn)
}

pub fn run_migration(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        r#"
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS cards (
          id TEXT PRIMARY KEY,
          source_type TEXT NOT NULL,
          source_title TEXT,
          original_text TEXT NOT NULL,
          translated_text TEXT,
          word_to_learn TEXT,
          pronunciation TEXT,
          image_path TEXT,
          audio_path TEXT,
          tags TEXT,
          easiness_factor REAL DEFAULT 2.5,
          repetition_number INTEGER DEFAULT 0,
          interval_days INTEGER DEFAULT 0,
          next_review_date TEXT,
          last_review_date TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          extra_data TEXT
        );

        CREATE TABLE IF NOT EXISTS reviews (
          id TEXT PRIMARY KEY,
          card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
          score INTEGER CHECK(score BETWEEN 1 AND 4),
          review_date TEXT DEFAULT (datetime('now'))
        );
        "#,
    )
}

pub fn create_card(conn: &Connection, card: Card) -> Result<Card, String> {
    let card = normalize_new_card(card)?;
    insert_card(conn, &card)?;
    find_card(conn, &card.id)
}

pub fn create_cards(conn: &Connection, cards: Vec<Card>) -> Result<Vec<Card>, String> {
    let mut created = Vec::with_capacity(cards.len());
    for card in cards {
        created.push(create_card(conn, card)?);
    }
    Ok(created)
}

pub fn due_today(conn: &Connection) -> Result<Vec<Card>, String> {
    let today = today_string();
    query_cards(
        conn,
        "SELECT * FROM cards WHERE next_review_date IS NULL OR date(next_review_date) <= date(?1) ORDER BY datetime(created_at) DESC",
        params![today],
    )
}

pub fn all_cards(conn: &Connection) -> Result<Vec<Card>, String> {
    query_cards(
        conn,
        "SELECT * FROM cards ORDER BY datetime(created_at) DESC",
        params![],
    )
}

pub fn card_stats(conn: &Connection) -> Result<CardStats, String> {
    let today = today_string();
    let total = conn
        .query_row("SELECT COUNT(*) FROM cards", [], |row| row.get(0))
        .map_err(|err| err.to_string())?;
    let due_today = conn
        .query_row(
            "SELECT COUNT(*) FROM cards WHERE next_review_date IS NULL OR date(next_review_date) <= date(?1)",
            params![today],
            |row| row.get(0),
        )
        .map_err(|err| err.to_string())?;

    Ok(CardStats { due_today, total })
}

pub fn reviews_for_card(conn: &Connection, card_id: &str) -> Result<Vec<Review>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, card_id, score, review_date FROM reviews WHERE card_id = ?1 ORDER BY datetime(review_date) DESC",
        )
        .map_err(|err| err.to_string())?;

    let rows = stmt
        .query_map(params![card_id], |row| {
            Ok(Review {
                id: row.get("id")?,
                card_id: row.get("card_id")?,
                score: row.get("score")?,
                review_date: row.get("review_date")?,
            })
        })
        .map_err(|err| err.to_string())?;

    collect_rows(rows)
}

pub fn find_card(conn: &Connection, id: &str) -> Result<Card, String> {
    conn.query_row("SELECT * FROM cards WHERE id = ?1", params![id], map_card)
        .optional()
        .map_err(|err| err.to_string())?
        .ok_or_else(|| "Card not found.".to_string())
}

pub fn update_review_schedule(
    conn: &Connection,
    card_id: &str,
    score: u8,
    easiness_factor: f64,
    repetition_number: i64,
    interval_days: i64,
    next_review_date: &str,
) -> Result<(), String> {
    conn.execute(
        r#"
        INSERT INTO reviews (id, card_id, score)
        VALUES (?1, ?2, ?3)
        "#,
        params![Uuid::new_v4().to_string(), card_id, score as i64],
    )
    .map_err(|err| err.to_string())?;

    conn.execute(
        r#"
        UPDATE cards
        SET easiness_factor = ?1,
            repetition_number = ?2,
            interval_days = ?3,
            next_review_date = ?4,
            last_review_date = ?5
        WHERE id = ?6
        "#,
        params![
            easiness_factor,
            repetition_number,
            interval_days,
            next_review_date,
            today_string(),
            card_id
        ],
    )
    .map_err(|err| err.to_string())?;

    Ok(())
}

fn insert_card(conn: &Connection, card: &Card) -> Result<(), String> {
    conn.execute(
        r#"
        INSERT INTO cards (
          id, source_type, source_title, original_text, translated_text,
          word_to_learn, pronunciation, image_path, audio_path, tags,
          easiness_factor, repetition_number, interval_days, next_review_date,
          last_review_date, extra_data
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)
        "#,
        params![
            card.id,
            card.source_type,
            card.source_title,
            card.original_text,
            card.translated_text,
            card.word_to_learn,
            card.pronunciation,
            card.image_path,
            card.audio_path,
            card.tags,
            card.easiness_factor,
            card.repetition_number,
            card.interval_days,
            card.next_review_date,
            card.last_review_date,
            card.extra_data,
        ],
    )
    .map_err(|err| err.to_string())?;

    Ok(())
}

fn normalize_new_card(mut card: Card) -> Result<Card, String> {
    if card.source_type.trim().is_empty() {
        return Err("Source type is required.".to_string());
    }
    if card.original_text.trim().is_empty() {
        return Err("Original text is required.".to_string());
    }

    if card.id.trim().is_empty() {
        card.id = Uuid::new_v4().to_string();
    }
    if card.tags.is_none() {
        card.tags = Some("[]".to_string());
    }
    if card.easiness_factor <= 0.0 {
        card.easiness_factor = 2.5;
    }
    if card.next_review_date.is_none() {
        card.next_review_date = Some(today_string());
    }

    card.source_type = card.source_type.trim().to_string();
    card.original_text = card.original_text.trim().to_string();

    Ok(card)
}

fn query_cards<P>(conn: &Connection, sql: &str, params: P) -> Result<Vec<Card>, String>
where
    P: rusqlite::Params,
{
    let mut stmt = conn.prepare(sql).map_err(|err| err.to_string())?;
    let rows = stmt
        .query_map(params, map_card)
        .map_err(|err| err.to_string())?;
    collect_rows(rows)
}

fn collect_rows<T>(
    rows: rusqlite::MappedRows<'_, impl FnMut(&Row<'_>) -> rusqlite::Result<T>>,
) -> Result<Vec<T>, String> {
    let mut values = Vec::new();
    for row in rows {
        values.push(row.map_err(|err| err.to_string())?);
    }
    Ok(values)
}

fn map_card(row: &Row<'_>) -> rusqlite::Result<Card> {
    Ok(Card {
        id: row.get("id")?,
        source_type: row.get("source_type")?,
        source_title: row.get("source_title")?,
        original_text: row.get("original_text")?,
        translated_text: row.get("translated_text")?,
        word_to_learn: row.get("word_to_learn")?,
        pronunciation: row.get("pronunciation")?,
        image_path: row.get("image_path")?,
        audio_path: row.get("audio_path")?,
        tags: row.get("tags")?,
        easiness_factor: row.get("easiness_factor")?,
        repetition_number: row.get("repetition_number")?,
        interval_days: row.get("interval_days")?,
        next_review_date: row.get("next_review_date")?,
        last_review_date: row.get("last_review_date")?,
        created_at: row.get("created_at")?,
        extra_data: row.get("extra_data")?,
    })
}

pub fn today_string() -> String {
    Local::now().date_naive().to_string()
}
