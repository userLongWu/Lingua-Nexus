use lingua_nexus_lib::{
    backup::{parse_backup, restore, snapshot},
    db::{all_cards, create_card, reviews_for_card, run_migration, update_review_schedule},
    models::Card,
};
use rusqlite::Connection;
fn database() -> Connection {
    let conn = Connection::open_in_memory().unwrap();
    run_migration(&conn).unwrap();
    conn
}
fn populated() -> Connection {
    let conn = database();
    let card = create_card(&conn, Card::new("text", "hello")).unwrap();
    update_review_schedule(&conn, &card.id, 4, 2.6, 1, 1, "2099-01-01").unwrap();
    conn
}
#[test]
fn backup_roundtrip_is_complete_and_repeat_restore_is_idempotent() {
    let source = populated();
    let backup = snapshot(&source).unwrap();
    let json = serde_json::to_string(&backup).unwrap();
    let target = database();
    let report = restore(&target, parse_backup(&json).unwrap()).unwrap();
    assert_eq!((report.cards_added, report.reviews_added), (1, 1));
    assert_eq!(all_cards(&target).unwrap(), backup.cards);
    assert_eq!(
        reviews_for_card(&target, &backup.cards[0].id).unwrap(),
        backup.reviews
    );
    let report = restore(&target, parse_backup(&json).unwrap()).unwrap();
    assert_eq!((report.cards_added, report.reviews_added), (0, 0));
    assert_eq!((report.cards_skipped, report.reviews_skipped), (1, 1));
}
#[test]
fn conflicting_card_keeps_local_and_skips_its_backup_history() {
    let source = populated();
    let backup = snapshot(&source).unwrap();
    let target = database();
    let mut local = backup.cards[0].clone();
    local.original_text = "local edit".into();
    create_card(&target, local).unwrap();
    let report = restore(&target, backup).unwrap();
    assert_eq!(report.card_conflicts, 1);
    assert_eq!(report.reviews_skipped, 1);
    assert_eq!(all_cards(&target).unwrap()[0].original_text, "local edit");
    assert!(
        reviews_for_card(&target, &all_cards(&target).unwrap()[0].id)
            .unwrap()
            .is_empty()
    );
}
#[test]
fn full_validation_happens_before_writes_and_failures_roll_back() {
    let source = populated();
    let backup = snapshot(&source).unwrap();
    let target = database();
    let mut invalid = serde_json::to_value(&backup).unwrap();
    invalid["reviews"][0]["score"] = serde_json::json!(7);
    assert!(parse_backup(&invalid.to_string()).is_err());
    assert!(all_cards(&target).unwrap().is_empty());
    invalid = serde_json::to_value(&backup).unwrap();
    invalid["reviews"][0]["cardId"] = serde_json::json!("missing");
    assert!(parse_backup(&invalid.to_string()).is_err());
    invalid = serde_json::to_value(&backup).unwrap();
    invalid["version"] = serde_json::json!(2);
    assert!(parse_backup(&invalid.to_string()).is_err());
    target.execute_batch("CREATE TRIGGER reject_restore BEFORE INSERT ON reviews BEGIN SELECT RAISE(ABORT, 'injected'); END;").unwrap();
    assert!(restore(&target, backup).is_err());
    assert!(all_cards(&target).unwrap().is_empty());
}

#[test]
fn invalid_record_variants_are_rejected_without_partial_restore() {
    let source = populated();
    let backup = snapshot(&source).unwrap();
    for (path, value) in [
        ("/cards/0/easinessFactor", serde_json::json!(-1)),
        ("/cards/0/sourceType", serde_json::json!("unknown")),
        ("/cards/0/nextReviewDate", serde_json::json!("not a date")),
        ("/cards/0/tags", serde_json::json!("{}")),
        ("/reviews/0/reviewDate", serde_json::json!("yesterday")),
    ] {
        let mut json = serde_json::to_value(&backup).unwrap();
        *json.pointer_mut(path).unwrap() = value;
        assert!(parse_backup(&json.to_string()).is_err(), "{path}");
    }
    let mut json = serde_json::to_value(&backup).unwrap();
    json["apiKey"] = serde_json::json!("not part of backup schema");
    assert!(parse_backup(&json.to_string()).is_err());
    let mut json = serde_json::to_value(&backup).unwrap();
    json["cards"]
        .as_array_mut()
        .unwrap()
        .push(serde_json::to_value(&backup.cards[0]).unwrap());
    assert!(parse_backup(&json.to_string()).is_err());
}
#[test]
fn review_id_conflict_keeps_local_review() {
    let source = populated();
    let mut backup = snapshot(&source).unwrap();
    backup.reviews[0].score = 1;
    let report = restore(&source, backup).unwrap();
    assert_eq!(report.review_conflicts, 1);
    assert_eq!(
        reviews_for_card(&source, &all_cards(&source).unwrap()[0].id).unwrap()[0].score,
        4
    );
}
#[test]
fn export_uses_unique_files_and_preserves_existing_backups() {
    use lingua_nexus_lib::backup::export_file;
    let source = populated();
    let backup = snapshot(&source).unwrap();
    let directory =
        std::env::temp_dir().join(format!("lingua-backup-test-{}", uuid::Uuid::new_v4()));
    std::fs::create_dir(&directory).unwrap();
    let first = export_file(&directory, &backup).unwrap();
    let second = export_file(&directory, &backup).unwrap();
    assert_ne!(first, second);
    for path in [&first, &second] {
        let json = std::fs::read_to_string(path).unwrap();
        assert!(parse_backup(&json).is_ok());
        std::fs::remove_file(path).unwrap();
    }
    std::fs::remove_dir(directory).unwrap();
}

#[test]
fn malicious_schedule_numbers_reject_the_entire_backup_before_writes() {
    let source = populated();
    let base = serde_json::to_value(snapshot(&source).unwrap()).unwrap();
    for (field, value) in [
        ("repetitionNumber", serde_json::json!(i64::MAX)),
        ("repetitionNumber", serde_json::json!(10_001)),
        ("intervalDays", serde_json::json!(i64::MAX)),
        ("intervalDays", serde_json::json!(36_501)),
        ("easinessFactor", serde_json::json!(1e300)),
        ("easinessFactor", serde_json::json!(10.1)),
        ("easinessFactor", serde_json::json!(1.2)),
    ] {
        let target = database();
        let existing = create_card(&target, Card::new("text", "preserve local")).unwrap();
        let mut json = base.clone();
        let mut malicious = json["cards"][0].clone();
        malicious["id"] = serde_json::json!("malicious-second-card");
        malicious[field] = value;
        json["cards"].as_array_mut().unwrap().push(malicious);
        assert!(parse_backup(&json.to_string()).is_err(), "{field}");
        // The restore boundary validates too, even if a caller already deserialized JSON.
        let typed = serde_json::from_value(json).unwrap();
        assert!(restore(&target, typed).is_err(), "{field}");
        assert_eq!(all_cards(&target).unwrap(), vec![existing]);
    }
}

#[test]
fn maximum_accepted_schedule_remains_reviewable_and_roundtrips_after_every_score() {
    use lingua_nexus_lib::{db::find_card, review::calculate_next_review};
    let source = populated();
    let mut json = serde_json::to_value(snapshot(&source).unwrap()).unwrap();
    json["cards"][0]["repetitionNumber"] = serde_json::json!(10_000);
    json["cards"][0]["intervalDays"] = serde_json::json!(36_500);
    json["cards"][0]["easinessFactor"] = serde_json::json!(10.0);
    for score in 1..=4 {
        let target = database();
        let backup = parse_backup(&json.to_string()).unwrap();
        let id = backup.cards[0].id.clone();
        restore(&target, backup).unwrap();
        let card = find_card(&target, &id).unwrap();
        let schedule = calculate_next_review(
            card.easiness_factor,
            card.repetition_number,
            card.interval_days,
            score,
            chrono::Local::now().date_naive(),
        )
        .unwrap();
        update_review_schedule(
            &target,
            &id,
            score,
            schedule.easiness_factor,
            schedule.repetition_number,
            schedule.interval_days,
            &schedule.next_review_date.to_string(),
        )
        .unwrap();
        let exported = snapshot(&target).unwrap();
        let restored = database();
        restore(
            &restored,
            parse_backup(&serde_json::to_string(&exported).unwrap()).unwrap(),
        )
        .unwrap();
        assert_eq!(
            find_card(&target, &id).unwrap(),
            find_card(&restored, &id).unwrap()
        );
        assert_eq!(
            reviews_for_card(&target, &id).unwrap().len(),
            reviews_for_card(&restored, &id).unwrap().len()
        );
    }
}
