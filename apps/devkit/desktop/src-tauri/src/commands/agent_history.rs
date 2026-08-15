use tauri::State;

use crate::database::{AgentMessage, AgentTask};
use crate::error::{DesktopError, DesktopResult};
use crate::state::DesktopState;

use super::workspace_root;

#[tauri::command]
pub fn list_agent_tasks(state: State<'_, DesktopState>) -> DesktopResult<Vec<AgentTask>> {
    let workspace = workspace_root(&state)?.to_string_lossy().into_owned();
    state
        .database
        .lock()
        .map_err(|_| unavailable())?
        .list_agent_tasks(&workspace)
}

#[tauri::command]
pub fn save_agent_task(
    thread_id: String,
    title: String,
    access: String,
    state: State<'_, DesktopState>,
) -> DesktopResult<AgentTask> {
    let thread_id = required(&thread_id, "Codex thread")?;
    let title = required(&title, "Task title")?;
    if title.len() > 180 {
        return Err(DesktopError::Policy(
            "Task titles cannot exceed 180 characters.".into(),
        ));
    }
    if !["readOnly", "workspaceWrite"].contains(&access.as_str()) {
        return Err(DesktopError::Policy("Unknown agent access mode.".into()));
    }
    let workspace = workspace_root(&state)?.to_string_lossy().into_owned();
    state
        .database
        .lock()
        .map_err(|_| unavailable())?
        .save_agent_task(&workspace, thread_id, title, &access)
}

#[tauri::command]
pub fn list_agent_messages(
    task_id: i64,
    state: State<'_, DesktopState>,
) -> DesktopResult<Vec<AgentMessage>> {
    state
        .database
        .lock()
        .map_err(|_| unavailable())?
        .list_agent_messages(task_id)
}

#[tauri::command]
pub fn save_agent_message(
    task_id: i64,
    id: String,
    role: String,
    content: String,
    state: State<'_, DesktopState>,
) -> DesktopResult<AgentMessage> {
    let id = required(&id, "Message identifier")?;
    let content = required(&content, "Message")?;
    if !["agent", "user"].contains(&role.as_str()) {
        return Err(DesktopError::Policy("Unknown message role.".into()));
    }
    if content.len() > 1_000_000 {
        return Err(DesktopError::Policy(
            "Agent messages are too large to save.".into(),
        ));
    }
    state
        .database
        .lock()
        .map_err(|_| unavailable())?
        .save_agent_message(task_id, id, &role, content)
}

fn required<'a>(value: &'a str, label: &str) -> DesktopResult<&'a str> {
    let value = value.trim();
    if value.is_empty() {
        return Err(DesktopError::Policy(format!("{label} is required.")));
    }
    Ok(value)
}

fn unavailable() -> DesktopError {
    DesktopError::Policy("Desktop agent history is unavailable.".into())
}
