use crate::db;
use crate::models::{Card, CardStats, Review};
use crate::review::calculate_next_review;
use crate::srt::parse_card_texts;
use chrono::Local;
use serde::Deserialize;
use tauri::State;

#[tauri::command]
pub fn create_card(state: State<'_, db::AppState>, card: Card) -> Result<Card, String> {
    let conn = state.conn.lock().map_err(|err| err.to_string())?;
    db::create_card(&conn, card)
}

#[tauri::command]
pub fn get_cards_due_today(state: State<'_, db::AppState>) -> Result<Vec<Card>, String> {
    let conn = state.conn.lock().map_err(|err| err.to_string())?;
    db::due_today(&conn)
}

#[tauri::command]
pub fn get_all_cards(state: State<'_, db::AppState>) -> Result<Vec<Card>, String> {
    let conn = state.conn.lock().map_err(|err| err.to_string())?;
    db::all_cards(&conn)
}

#[tauri::command]
pub fn get_card_stats(state: State<'_, db::AppState>) -> Result<CardStats, String> {
    let conn = state.conn.lock().map_err(|err| err.to_string())?;
    db::card_stats(&conn)
}

#[tauri::command]
pub fn get_card_reviews(
    state: State<'_, db::AppState>,
    card_id: String,
) -> Result<Vec<Review>, String> {
    let conn = state.conn.lock().map_err(|err| err.to_string())?;
    db::reviews_for_card(&conn, &card_id)
}

#[tauri::command]
pub fn review_card(
    state: State<'_, db::AppState>,
    card_id: String,
    score: u8,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|err| err.to_string())?;
    let card = db::find_card(&conn, &card_id)?;
    let today = Local::now().date_naive();
    let schedule = calculate_next_review(
        card.easiness_factor,
        card.repetition_number,
        card.interval_days,
        score,
        today,
    )?;

    db::update_review_schedule(
        &conn,
        &card_id,
        score,
        schedule.easiness_factor,
        schedule.repetition_number,
        schedule.interval_days,
        &schedule.next_review_date.to_string(),
    )
}

#[tauri::command]
pub fn import_from_srt(
    state: State<'_, db::AppState>,
    srt_content: String,
    source_title: String,
) -> Result<Vec<Card>, String> {
    let conn = state.conn.lock().map_err(|err| err.to_string())?;
    let cards = parse_card_texts(&srt_content)
        .into_iter()
        .map(|text| {
            let mut card = Card::new("subtitle", text);
            card.source_title =
                (!source_title.trim().is_empty()).then(|| source_title.trim().to_string());
            card
        })
        .collect();

    db::create_cards(&conn, cards)
}

#[tauri::command]
pub fn lookup_word(word: String) -> Result<Card, String> {
    let word = word.trim().to_lowercase();
    if word.is_empty() {
        return Err("Word is required.".to_string());
    }
    if word.split_whitespace().count() > 1 {
        return Err("Please search for one word at a time.".to_string());
    }

    let url = format!("https://api.dictionaryapi.dev/api/v2/entries/en/{word}");
    let entries: Vec<DictionaryEntry> = reqwest::blocking::get(url)
        .map_err(|err| format!("Dictionary lookup failed: {err}"))?
        .error_for_status()
        .map_err(|err| format!("Dictionary lookup failed: {err}"))?
        .json()
        .map_err(|err| format!("Dictionary response could not be read: {err}"))?;

    let entry = entries
        .first()
        .ok_or_else(|| "No dictionary result found.".to_string())?;
    let meaning = entry.meanings.first();
    let definition = meaning
        .and_then(|value| value.definitions.first())
        .ok_or_else(|| "No definition found for this word.".to_string())?;

    let mut card = Card::new("dictionary", definition.definition.clone());
    card.word_to_learn = Some(entry.word.clone());
    card.pronunciation = entry
        .phonetic
        .clone()
        .or_else(|| entry.phonetics.iter().find_map(|item| item.text.clone()));
    card.audio_path = entry.phonetics.iter().find_map(|item| {
        item.audio
            .as_ref()
            .filter(|audio| !audio.is_empty())
            .cloned()
    });
    card.extra_data = Some(
        serde_json::json!({
            "partOfSpeech": meaning.map(|value| value.part_of_speech.clone()),
            "example": definition.example,
            "synonyms": definition.synonyms,
        })
        .to_string(),
    );

    Ok(card)
}

#[derive(Debug, Deserialize)]
struct DictionaryEntry {
    word: String,
    phonetic: Option<String>,
    #[serde(default)]
    phonetics: Vec<DictionaryPhonetic>,
    #[serde(default)]
    meanings: Vec<DictionaryMeaning>,
}

#[derive(Debug, Deserialize)]
struct DictionaryPhonetic {
    text: Option<String>,
    audio: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DictionaryMeaning {
    part_of_speech: String,
    #[serde(default)]
    definitions: Vec<DictionaryDefinition>,
}

#[derive(Debug, Deserialize)]
struct DictionaryDefinition {
    definition: String,
    example: Option<String>,
    #[serde(default)]
    synonyms: Vec<String>,
}
