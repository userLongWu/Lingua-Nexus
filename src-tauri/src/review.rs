use chrono::{Days, NaiveDate};
use serde::Serialize;

// Keep imported and computed schedules inside a useful, round-trippable domain.
// These ceilings affect only extreme schedules, not ordinary SM-2 progression.
pub const MIN_EASINESS: f64 = 1.3;
pub const MAX_EASINESS: f64 = 10.0;
pub const MAX_REPETITIONS: i64 = 10_000;
pub const MAX_INTERVAL_DAYS: i64 = 36_500;

pub fn valid_schedule(easiness: f64, repetitions: i64, interval: i64) -> bool {
    easiness.is_finite()
        && (MIN_EASINESS..=MAX_EASINESS).contains(&easiness)
        && (0..=MAX_REPETITIONS).contains(&repetitions)
        && (0..=MAX_INTERVAL_DAYS).contains(&interval)
}

#[derive(Debug, Clone, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReviewSchedule {
    pub easiness_factor: f64,
    pub repetition_number: i64,
    pub interval_days: i64,
    pub next_review_date: NaiveDate,
}

pub fn calculate_next_review(
    easiness_factor: f64,
    repetition_number: i64,
    interval_days: i64,
    score: u8,
    today: NaiveDate,
) -> Result<ReviewSchedule, String> {
    if !(1..=4).contains(&score) {
        return Err("Review score must be between 1 and 4.".to_string());
    }

    let incremented_repetition = repetition_number
        .checked_add(1)
        .ok_or_else(|| "Review repetition count is out of range.".to_string())?;
    if !valid_schedule(easiness_factor, repetition_number, interval_days) {
        return Err("Review schedule is outside the supported numeric range.".to_string());
    }

    let quality = match score {
        1 => 1.0,
        2 => 3.0,
        3 => 4.0,
        4 => 5.0,
        _ => unreachable!(),
    };

    let mut next_easiness =
        easiness_factor + (0.1 - (5.0 - quality) * (0.08 + (5.0 - quality) * 0.02));
    next_easiness = next_easiness.clamp(MIN_EASINESS, MAX_EASINESS);
    next_easiness = (next_easiness * 10.0).round() / 10.0;

    let (next_repetition, next_interval) = if score < 3 {
        (0, 1)
    } else {
        let repetition = incremented_repetition.min(MAX_REPETITIONS);
        let interval = match repetition {
            1 => 1,
            2 => 6,
            _ => ((interval_days as f64) * next_easiness)
                .round()
                .clamp(1.0, MAX_INTERVAL_DAYS as f64) as i64,
        };
        (repetition, interval)
    };

    let next_review_date = today
        .checked_add_days(Days::new(next_interval as u64))
        .ok_or_else(|| "Could not calculate next review date.".to_string())?;

    Ok(ReviewSchedule {
        easiness_factor: next_easiness,
        repetition_number: next_repetition,
        interval_days: next_interval,
        next_review_date,
    })
}
