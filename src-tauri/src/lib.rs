pub mod commands;
pub mod db;
pub mod models;
pub mod review;
pub mod srt;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let conn = db::init_database(app.handle())?;
            app.manage(db::AppState {
                conn: std::sync::Mutex::new(conn),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::create_card,
            commands::get_cards_due_today,
            commands::get_all_cards,
            commands::get_card_stats,
            commands::get_card_reviews,
            commands::review_card,
            commands::import_from_srt,
            commands::lookup_word
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
