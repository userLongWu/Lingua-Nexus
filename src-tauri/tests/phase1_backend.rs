use chrono::NaiveDate;
use lingua_nexus_lib::db::{
    create_card, create_cards, due_today, find_card, reviews_for_card, run_migration,
    update_review_schedule,
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

#[test]
fn plain_text_preserves_punctuation_numbers_and_non_timing_arrows() {
    assert_eq!(
        parse_card_texts("Dr. Smith paid 3.14... Really? Yes!\r\n\r\n42\rA --> B"),
        vec!["Dr. Smith paid 3.14... Really? Yes!", "42", "A --> B"]
    );
}

#[test]
fn srt_preserves_numeric_dialogue_and_multiline_cues() {
    assert_eq!(
        parse_card_texts("1\r\n00:00:01,000 --> 00:00:03,000\r\n42\r\nDr. Smith... 3.14\r\n \r\n2\r\n00:00:04,000 --> 00:00:06,000\r\n2026\r\n"),
        vec!["42 Dr. Smith... 3.14", "2026"]
    );
}

#[test]
fn batch_import_rolls_back_on_later_insert_failure() {
    let conn = Connection::open_in_memory().unwrap();
    run_migration(&conn).unwrap();
    let existing = create_card(&conn, Card::new("text", "Keep existing data")).unwrap();
    conn.execute_batch("CREATE TRIGGER reject_import BEFORE INSERT ON cards WHEN NEW.original_text = 'Fail' BEGIN SELECT RAISE(ABORT, 'injected insert failure'); END;").unwrap();
    let result = create_cards(
        &conn,
        vec![
            Card::new("subtitle", "First"),
            Card::new("subtitle", "Fail"),
        ],
    );
    assert!(result.is_err());
    assert_eq!(due_today(&conn).unwrap().len(), 1);
    assert_eq!(
        find_card(&conn, &existing.id).unwrap().original_text,
        "Keep existing data"
    );
}

#[test]
fn batch_import_rolls_back_on_later_validation_failure() {
    let conn = Connection::open_in_memory().unwrap();
    run_migration(&conn).unwrap();
    assert!(create_cards(
        &conn,
        vec![Card::new("subtitle", "First"), Card::new("subtitle", " ")]
    )
    .is_err());
    assert!(due_today(&conn).unwrap().is_empty());
}

#[test]
fn review_rolls_back_history_if_schedule_update_fails() {
    let conn = Connection::open_in_memory().unwrap();
    run_migration(&conn).unwrap();
    let card = create_card(&conn, Card::new("text", "Hello")).unwrap();
    conn.execute_batch("CREATE TRIGGER reject_schedule BEFORE UPDATE ON cards BEGIN SELECT RAISE(ABORT, 'injected update failure'); END;").unwrap();
    assert!(update_review_schedule(&conn, &card.id, 4, 2.6, 1, 1, "2099-05-03").is_err());
    assert!(reviews_for_card(&conn, &card.id).unwrap().is_empty());
    let unchanged = find_card(&conn, &card.id).unwrap();
    assert_eq!(unchanged.next_review_date, card.next_review_date);
    assert_eq!(unchanged.repetition_number, 0);
}

#[test]
fn review_history_insert_failure_keeps_schedule_unchanged() {
    let conn = Connection::open_in_memory().unwrap();
    run_migration(&conn).unwrap();
    let card = create_card(&conn, Card::new("text", "Hello")).unwrap();
    conn.execute_batch("CREATE TRIGGER reject_review BEFORE INSERT ON reviews BEGIN SELECT RAISE(ABORT, 'injected review failure'); END;").unwrap();
    assert!(update_review_schedule(&conn, &card.id, 4, 2.6, 1, 1, "2099-05-03").is_err());
    assert!(reviews_for_card(&conn, &card.id).unwrap().is_empty());
    assert_eq!(
        find_card(&conn, &card.id).unwrap().next_review_date,
        card.next_review_date
    );
}

#[test]
fn dashboard_counts_review_events_for_seven_local_days_including_zeroes() {
    let conn = Connection::open_in_memory().unwrap();
    run_migration(&conn).unwrap();
    let card = create_card(&conn, Card::new("text", "stats fixture")).unwrap();
    conn.execute("INSERT INTO reviews(id,card_id,score,review_date) VALUES ('today',?1,4,datetime('now')), ('six',?1,3,datetime('now','-6 days')), ('old',?1,2,datetime('now','-8 days'))", [&card.id]).unwrap();
    let stats = lingua_nexus_lib::db::card_stats(&conn).unwrap();
    assert_eq!(stats.reviewed_today, 1);
    assert_eq!(stats.review_days.len(), 7);
    assert_eq!(stats.review_days.first().unwrap().count, 1);
    assert_eq!(
        stats.review_days.last().unwrap().date,
        chrono::Local::now().date_naive().to_string()
    );
    assert_eq!(
        stats.review_days.iter().map(|day| day.count).sum::<i64>(),
        2
    );
    assert_eq!(stats.review_days[1].count, 0);
}

#[test]
fn hostile_schedule_returns_an_error_without_poisoning_database_mutex() {
    let conn = Connection::open_in_memory().unwrap();
    run_migration(&conn).unwrap();
    let state = std::sync::Mutex::new(conn);
    let result = std::panic::catch_unwind(|| {
        let _guard = state.lock().unwrap();
        calculate_next_review(2.5, i64::MAX, 1, 4, chrono::Local::now().date_naive())
    });
    assert!(
        result.is_ok(),
        "review calculation must not panic while the database is locked"
    );
    assert!(result.unwrap().is_err());
    let conn = state.lock().expect("database mutex remains usable");
    assert!(create_card(&conn, Card::new("text", "still works")).is_ok());
}

#[test]
fn invalid_numeric_schedules_and_date_overflow_return_errors() {
    let today = chrono::Local::now().date_naive();
    for (ease, repetitions, interval) in [
        (f64::NAN, 0, 0),
        (f64::INFINITY, 0, 0),
        (f64::MAX, 0, 0),
        (2.5, -1, 0),
        (2.5, 1, -1),
        (2.5, 1, i64::MAX),
    ] {
        assert!(calculate_next_review(ease, repetitions, interval, 4, today).is_err());
    }
    assert!(calculate_next_review(2.5, 0, 0, 4, chrono::NaiveDate::MAX).is_err());
}
