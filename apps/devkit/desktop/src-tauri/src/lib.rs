mod commands;
mod database;
mod error;
mod state;

use state::DesktopState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            let database = database::DesktopDatabase::open(data_dir.join("desktop.db"))?;
            app.manage(DesktopState::new(database));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::files::open_workspace,
            commands::files::list_files,
            commands::files::read_text_file,
            commands::files::write_text_file,
            commands::git::git_status,
            commands::process::run_workspace_command,
            commands::sync::sync_devkit,
            commands::system::system_status,
            commands::tasks::list_local_tasks,
            commands::tasks::save_local_task
        ])
        .run(tauri::generate_context!())
        .expect("CodeLogicX desktop runtime failed");
}
