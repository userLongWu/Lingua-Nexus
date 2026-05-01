use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Card {
    pub id: String,
    pub source_type: String,
    pub source_title: Option<String>,
    pub original_text: String,
    pub translated_text: Option<String>,
    pub word_to_learn: Option<String>,
    pub pronunciation: Option<String>,
    pub image_path: Option<String>,
    pub audio_path: Option<String>,
    pub tags: Option<String>,
    pub easiness_factor: f64,
    pub repetition_number: i64,
    pub interval_days: i64,
    pub next_review_date: Option<String>,
    pub last_review_date: Option<String>,
    pub created_at: Option<String>,
    pub extra_data: Option<String>,
}

impl Card {
    pub fn new(source_type: impl Into<String>, original_text: impl Into<String>) -> Self {
        Self {
            id: String::new(),
            source_type: source_type.into(),
            source_title: None,
            original_text: original_text.into(),
            translated_text: None,
            word_to_learn: None,
            pronunciation: None,
            image_path: None,
            audio_path: None,
            tags: Some("[]".to_string()),
            easiness_factor: 2.5,
            repetition_number: 0,
            interval_days: 0,
            next_review_date: None,
            last_review_date: None,
            created_at: None,
            extra_data: None,
        }
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CardStats {
    pub due_today: i64,
    pub total: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Review {
    pub id: String,
    pub card_id: String,
    pub score: i64,
    pub review_date: String,
}
