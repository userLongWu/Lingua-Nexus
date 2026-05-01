use chrono::{Days, NaiveDate};
use serde::Serialize;

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

    let quality = match score {
        1 => 1.0,
        2 => 3.0,
        3 => 4.0,
        4 => 5.0,
        _ => unreachable!(),
    };

    let mut next_easiness =
        easiness_factor + (0.1 - (5.0 - quality) * (0.08 + (5.0 - quality) * 0.02));
    if next_easiness < 1.3 {
        next_easiness = 1.3;
    }
    next_easiness = (next_easiness * 10.0).round() / 10.0;

    let (next_repetition, next_interval) = if score < 3 {
        (0, 1)
    } else {
        let repetition = repetition_number + 1;
        let interval = match repetition {
            1 => 1,
            2 => 6,
            _ => ((interval_days as f64) * next_easiness).round().max(1.0) as i64,
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
