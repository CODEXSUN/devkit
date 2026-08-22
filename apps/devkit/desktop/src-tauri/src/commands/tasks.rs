use tauri::State;

use crate::database::LocalTask;
use crate::error::{DesktopError, DesktopResult};
use crate::state::DesktopState;

#[tauri::command]
pub fn list_local_tasks(state: State<'_, DesktopState>) -> DesktopResult<Vec<LocalTask>> {
    state.with_database(|database| database.list_local_tasks())
}

#[tauri::command]
pub fn save_local_task(title: String, execution: String, state: State<'_, DesktopState>) -> DesktopResult<LocalTask> {
    let title = title.trim();
    let execution = execution.trim();
    if title.is_empty() || title.len() > 180 {
        return Err(DesktopError::Policy("Task titles must be between 1 and 180 characters.".into()));
    }
    if execution.is_empty() {
        return Err(DesktopError::Policy("Task execution instructions are required.".into()));
    }
    state.with_database(|database| database.save_local_task(title, execution))
}

#[tauri::command]
pub fn set_local_task_status(task_id: i64, status: String, state: State<'_, DesktopState>) -> DesktopResult<LocalTask> {
    if !["todo", "active", "done"].contains(&status.as_str()) {
        return Err(DesktopError::Policy("Unknown local task status.".into()));
    }
    state.with_database(|database| database.set_local_task_status(task_id, &status))
}
