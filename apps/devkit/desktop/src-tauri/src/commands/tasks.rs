use tauri::State;

use crate::database::LocalTask;
use crate::error::{DesktopError, DesktopResult};
use crate::state::DesktopState;

#[tauri::command]
pub fn list_local_tasks(state: State<'_, DesktopState>) -> DesktopResult<Vec<LocalTask>> {
    state
        .database
        .lock()
        .map_err(|_| DesktopError::Policy("Desktop database is unavailable.".into()))?
        .list_tasks()
}

#[tauri::command]
pub fn save_local_task(title: String, state: State<'_, DesktopState>) -> DesktopResult<LocalTask> {
    let title = title.trim();
    if title.is_empty() || title.len() > 180 {
        return Err(DesktopError::Policy(
            "Task titles must contain 1 to 180 characters.".into(),
        ));
    }
    state
        .database
        .lock()
        .map_err(|_| DesktopError::Policy("Desktop database is unavailable.".into()))?
        .save_task(title)
}
