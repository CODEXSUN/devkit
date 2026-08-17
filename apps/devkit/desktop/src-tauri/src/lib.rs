mod commands;
mod database;
mod error;
mod state;

use state::DesktopState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            app.manage(DesktopState::new(data_dir.join("desktop.db")));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::agent::start_agent_runtime,
            commands::agent::start_agent_thread,
            commands::agent::resume_agent_thread,
            commands::agent::send_agent_turn,
            commands::agent::interrupt_agent_turn,
            commands::agent::answer_agent_approval,
            commands::agent_history::list_agent_tasks,
            commands::agent_history::save_agent_task,
            commands::agent_history::list_agent_messages,
            commands::agent_history::save_agent_message,
            commands::agent_history::delete_agent_message,
            commands::files::open_workspace,
            commands::files::list_files,
            commands::files::read_text_file,
            commands::files::write_text_file,
            commands::git::git_status,
            commands::git::git_change_fingerprint,
            commands::git::git_diff,
            commands::git::git_file_diff,
            commands::git::git_stage,
            commands::git::git_unstage,
            commands::git::git_commit,
            commands::git::git_worktrees,
            commands::git::git_create_worktree,
            commands::git::git_remove_worktree,
            commands::integrations::list_external_editors,
            commands::integrations::open_in_external_editor,
            commands::learning::project_learning_summary,
            commands::learning::scan_project_learning,
            commands::learning::save_project_learning_settings,
            commands::learning::review_project_learning,
            commands::learning::project_learning_context,
            commands::process::run_workspace_command,
            commands::python::python_environment_status,
            commands::python::create_python_environment,
            commands::search::search_workspace,
            commands::skills::list_project_skills,
            commands::sync::sync_devkit,
            commands::system::system_status,
            commands::tasks::list_local_tasks,
            commands::tasks::save_local_task,
            commands::terminal::start_terminal,
            commands::terminal::write_terminal,
            commands::terminal::close_terminal
        ])
        .run(tauri::generate_context!())
        .expect("CodeLogix runtime failed");
}
