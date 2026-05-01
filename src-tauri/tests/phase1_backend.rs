use chrono::NaiveDate;
use lingua_nexus_lib::db::{
    create_card, due_today, find_card, reviews_for_card, run_migration, update_review_schedule,
};
use lingua_nexus_lib::models::Card;
use lingua_nexus_lib::review::calculate_next_review;
use lingua_nexus_lib::srt::parse_card_texts;
use rusqlite::Connection;

#[test]
fn parses_numbered_srt_blocks_into_plain_sentences() {
    let input = "1\r\n00:00:01,000 --> 00:00:03,000\r\nHello there.\r\n\r\n2\r\n00:00:04,000 --> 00:00:06,000\r\nGeneral Kenobi!\r\n";

    let cards = parse_card_texts(input);

    assert_eq!(cards, vec!["Hello there.", "General Kenobi!"]);
}

#[test]
fn parses_plain_text_sentences_when_no_srt_timing_exists() {
    let input = "First line.\n\nSecond line with meaning.\nThird line remains separate.";

    let cards = parse_card_texts(input);

    assert_eq!(
        cards,
        vec![
            "First line.",
            "Second line with meaning.",
            "Third line remains separate."
        ]
    );
}

#[test]
fn score_four_advances_sm2_schedule_from_new_card() {
    let today = NaiveDate::from_ymd_opt(2026, 5, 2).expect("valid date");

    let schedule = calculate_next_review(2.5, 0, 0, 4, today).expect("score is valid");

    assert_eq!(schedule.easiness_factor, 2.6);
    assert_eq!(schedule.repetition_number, 1);
    assert_eq!(schedule.interval_days, 1);
    assert_eq!(
        schedule.next_review_date,
        today.succ_opt().expect("next day")
    );
}

#[test]
fn low_score_resets_repetition_and_keeps_card_due_tomorrow() {
    let today = NaiveDate::from_ymd_opt(2026, 5, 2).expect("valid date");

    let schedule = calculate_next_review(2.4, 3, 10, 1, today).expect("score is valid");

    assert_eq!(schedule.easiness_factor, 1.9);
    assert_eq!(schedule.repetition_number, 0);
    assert_eq!(schedule.interval_days, 1);
    assert_eq!(
        schedule.next_review_date,
        today.succ_opt().expect("next day")
    );
}

#[test]
fn invalid_review_score_is_rejected() {
    let today = NaiveDate::from_ymd_opt(2026, 5, 2).expect("valid date");

    let result = calculate_next_review(2.5, 0, 0, 5, today);

    assert!(result.is_err());
}

#[test]
fn creates_due_card_and_records_review_schedule() {
    let conn = Connection::open_in_memory().expect("in-memory database");
    run_migration(&conn).expect("migration");

    let created = create_card(&conn, Card::new("text", "Bonjour tout le monde."))
        .expect("card should be created");
    let due = due_today(&conn).expect("due cards should load");

    assert_eq!(due.len(), 1);
    assert_eq!(due[0].id, created.id);

    update_review_schedule(&conn, &created.id, 4, 2.6, 1, 1, "2026-05-03")
        .expect("review should be recorded");
    let reviewed = find_card(&conn, &created.id).expect("reviewed card should exist");
    let reviews = reviews_for_card(&conn, &created.id).expect("reviews should load");

    assert_eq!(reviewed.next_review_date.as_deref(), Some("2026-05-03"));
    assert_eq!(reviewed.repetition_number, 1);
    assert_eq!(reviews.len(), 1);
    assert_eq!(reviews[0].score, 4);
}
