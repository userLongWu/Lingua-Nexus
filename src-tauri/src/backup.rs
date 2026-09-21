use crate::{
    db,
    models::{Card, Review},
    review::valid_schedule,
};
use chrono::{DateTime, NaiveDate, NaiveDateTime, Utc};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::{
    collections::{HashMap, HashSet},
    fs::OpenOptions,
    io::Write,
    path::Path,
};
use uuid::Uuid;

pub const MAX_BACKUP_BYTES: usize = 20 * 1024 * 1024;
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Backup {
    pub format: String,
    pub version: u32,
    pub exported_at: String,
    pub cards: Vec<Card>,
    pub reviews: Vec<Review>,
}
#[derive(Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RestoreReport {
    pub cards_added: usize,
    pub cards_skipped: usize,
    pub card_conflicts: usize,
    pub reviews_added: usize,
    pub reviews_skipped: usize,
    pub review_conflicts: usize,
}

fn all_reviews(conn: &Connection) -> Result<Vec<Review>, String> {
    let mut statement = conn
        .prepare("SELECT id, card_id, score, review_date FROM reviews ORDER BY id")
        .map_err(|_| "Could not read review history.".to_string())?;
    let rows = statement
        .query_map([], |row| {
            Ok(Review {
                id: row.get(0)?,
                card_id: row.get(1)?,
                score: row.get(2)?,
                review_date: row.get(3)?,
            })
        })
        .map_err(|_| "Could not read review history.".to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Could not read review history.".to_string())
}
pub fn snapshot(conn: &Connection) -> Result<Backup, String> {
    let backup = Backup {
        format: "lingua-nexus-backup".into(),
        version: 1,
        exported_at: Utc::now().to_rfc3339(),
        cards: db::all_cards(conn)?,
        reviews: all_reviews(conn)?,
    };
    validate(&backup)?;
    Ok(backup)
}
pub fn export_file(directory: &Path, backup: &Backup) -> Result<String, String> {
    let bytes = serde_json::to_vec_pretty(backup)
        .map_err(|_| "Could not serialize the backup.".to_string())?;
    if bytes.len() > MAX_BACKUP_BYTES {
        return Err("Backup exceeds the 20 MiB limit.".into());
    }
    let path = directory.join(format!(
        "lingua-nexus-{}-{}.json",
        Utc::now().format("%Y%m%d-%H%M%S"),
        Uuid::new_v4()
    ));
    let mut file = OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&path)
        .map_err(|_| {
            "Cannot create the backup in Downloads. Check folder permissions.".to_string()
        })?;
    if file
        .write_all(&bytes)
        .and_then(|_| file.sync_all())
        .is_err()
    {
        let _ = std::fs::remove_file(&path);
        return Err("Could not finish writing the backup. Check available disk space.".into());
    }
    Ok(path.to_string_lossy().into_owned())
}
pub fn parse_backup(json: &str) -> Result<Backup, String> {
    if json.len() > MAX_BACKUP_BYTES {
        return Err("Backup exceeds the 20 MiB limit.".into());
    }
    let backup: Backup = serde_json::from_str(json).map_err(|_| {
        "Invalid backup JSON or schema. Select a Lingua Nexus version 1 backup.".to_string()
    })?;
    validate(&backup)?;
    Ok(backup)
}
fn valid_timestamp(value: &str) -> bool {
    DateTime::parse_from_rfc3339(value).is_ok()
        || NaiveDateTime::parse_from_str(value, "%Y-%m-%d %H:%M:%S").is_ok()
}
fn valid_id(value: &str) -> bool {
    !value.trim().is_empty() && value.len() <= 200
}
fn validate(backup: &Backup) -> Result<(), String> {
    let invalid =
        || "Backup contains invalid records, dates or references. No data was changed.".to_string();
    if backup.format != "lingua-nexus-backup" || backup.version != 1 {
        return Err("Unsupported backup format or version.".into());
    }
    if !valid_timestamp(&backup.exported_at)
        || backup.cards.len() > 50_000
        || backup.reviews.len() > 200_000
    {
        return Err(invalid());
    }
    let mut cards = HashSet::new();
    for card in &backup.cards {
        if !valid_id(&card.id)
            || !cards.insert(card.id.as_str())
            || !matches!(
                card.source_type.as_str(),
                "text" | "subtitle" | "dictionary"
            )
            || card.original_text.trim().is_empty()
            || card.original_text.len() > 1_000_000
            || !valid_schedule(
                card.easiness_factor,
                card.repetition_number,
                card.interval_days,
            )
        {
            return Err(invalid());
        }
        for field in [
            &card.source_title,
            &card.translated_text,
            &card.word_to_learn,
            &card.pronunciation,
            &card.image_path,
            &card.audio_path,
            &card.tags,
            &card.extra_data,
        ] {
            if field.as_ref().is_some_and(|v| v.len() > 1_000_000) {
                return Err(invalid());
            }
        }
        for date in [&card.next_review_date, &card.last_review_date]
            .into_iter()
            .flatten()
        {
            if NaiveDate::parse_from_str(date, "%Y-%m-%d").is_err() {
                return Err(invalid());
            }
        }
        if card
            .created_at
            .as_ref()
            .is_some_and(|value| !valid_timestamp(value))
        {
            return Err(invalid());
        }
        if let Some(tags) = &card.tags {
            let tags: Vec<String> = serde_json::from_str(tags).map_err(|_| invalid())?;
            if tags.len() > 1000 {
                return Err(invalid());
            }
        }
        if let Some(extra) = &card.extra_data {
            serde_json::from_str::<serde_json::Value>(extra).map_err(|_| invalid())?;
        }
    }
    let mut reviews = HashSet::new();
    for review in &backup.reviews {
        if !valid_id(&review.id)
            || !reviews.insert(review.id.as_str())
            || !cards.contains(review.card_id.as_str())
            || !(1..=4).contains(&review.score)
            || !valid_timestamp(&review.review_date)
        {
            return Err(invalid());
        }
    }
    Ok(())
}
pub fn restore(conn: &Connection, backup: Backup) -> Result<RestoreReport, String> {
    validate(&backup)?;
    let transaction = conn
        .unchecked_transaction()
        .map_err(|_| "Could not start restore.".to_string())?;
    let local_cards: HashMap<_, _> = db::all_cards(&transaction)?
        .into_iter()
        .map(|card| (card.id.clone(), card))
        .collect();
    let local_reviews: HashMap<_, _> = all_reviews(&transaction)?
        .into_iter()
        .map(|review| (review.id.clone(), review))
        .collect();
    let mut report = RestoreReport::default();
    let mut conflicting_cards = HashSet::new();
    let failed = |_| "Restore failed and was rolled back. Existing data is unchanged.".to_string();
    for card in backup.cards {
        if let Some(local) = local_cards.get(&card.id) {
            report.cards_skipped += 1;
            if local != &card {
                report.card_conflicts += 1;
                conflicting_cards.insert(card.id);
            }
        } else {
            db::insert_card(&transaction, &card).map_err(|_| {
                "Restore failed and was rolled back. Existing data is unchanged.".to_string()
            })?;
            transaction
                .execute(
                    "UPDATE cards SET created_at = ?1 WHERE id = ?2",
                    params![card.created_at, card.id],
                )
                .map_err(failed)?;
            report.cards_added += 1;
        }
    }
    for review in backup.reviews {
        if conflicting_cards.contains(&review.card_id) {
            report.reviews_skipped += 1;
            continue;
        }
        if let Some(local) = local_reviews.get(&review.id) {
            report.reviews_skipped += 1;
            if local != &review {
                report.review_conflicts += 1;
            }
        } else {
            transaction
                .execute(
                    "INSERT INTO reviews (id, card_id, score, review_date) VALUES (?1, ?2, ?3, ?4)",
                    params![review.id, review.card_id, review.score, review.review_date],
                )
                .map_err(failed)?;
            report.reviews_added += 1;
        }
    }
    transaction.commit().map_err(failed)?;
    Ok(report)
}
