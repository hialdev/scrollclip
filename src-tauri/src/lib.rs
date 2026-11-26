// ScrollClip Rust backend — command modules are registered in run().
mod storage;
mod project;
mod media;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let handle = app.handle();
            let db = storage::init_db(handle.path().app_data_dir()?)?;
            app.manage(storage::Db(std::sync::Mutex::new(db)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            project::create_project,
            project::list_projects,
            project::get_project,
            project::update_project,
            project::delete_project,
            media::probe_video,
            media::yt_dlp_info,
            media::yt_dlp_download,
        ])
        .run(tauri::generate_context!())
        .expect("error while running ScrollClip");
}
