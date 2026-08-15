use std::io::{Read, Write};
use std::thread;

use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use serde::Serialize;
use tauri::{AppHandle, Emitter, State};
use uuid::Uuid;

use crate::commands::workspace_root;
use crate::error::{DesktopError, DesktopResult};
use crate::state::DesktopState;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct TerminalOutput {
    session_id: String,
    data: String,
}

#[tauri::command]
pub fn start_terminal(app: AppHandle, state: State<'_, DesktopState>) -> DesktopResult<String> {
    let root = workspace_root(&state)?;
    let pair = native_pty_system()
        .openpty(PtySize {
            rows: 24,
            cols: 100,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|error| DesktopError::Policy(format!("Terminal creation failed: {error}")))?;
    let shell = if cfg!(windows) {
        "powershell.exe"
    } else {
        "sh"
    };
    let mut command = CommandBuilder::new(shell);
    command.cwd(root);
    pair.slave
        .spawn_command(command)
        .map_err(|error| DesktopError::Policy(format!("Terminal start failed: {error}")))?;
    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|error| DesktopError::Policy(format!("Terminal reader failed: {error}")))?;
    let writer = pair
        .master
        .take_writer()
        .map_err(|error| DesktopError::Policy(format!("Terminal writer failed: {error}")))?;
    let session_id = Uuid::new_v4().to_string();
    state
        .terminals
        .lock()
        .map_err(|_| DesktopError::Policy("Terminal state is unavailable.".into()))?
        .insert(session_id.clone(), writer);
    let output_session = session_id.clone();
    thread::spawn(move || {
        let mut buffer = [0_u8; 4096];
        while let Ok(count) = reader.read(&mut buffer) {
            if count == 0 {
                break;
            }
            let _ = app.emit(
                "terminal-output",
                TerminalOutput {
                    session_id: output_session.clone(),
                    data: String::from_utf8_lossy(&buffer[..count]).into_owned(),
                },
            );
        }
    });
    Ok(session_id)
}

#[tauri::command]
pub fn write_terminal(
    session_id: String,
    data: String,
    state: State<'_, DesktopState>,
) -> DesktopResult<()> {
    let mut terminals = state
        .terminals
        .lock()
        .map_err(|_| DesktopError::Policy("Terminal state is unavailable.".into()))?;
    let writer = terminals
        .get_mut(&session_id)
        .ok_or_else(|| DesktopError::Policy("Terminal session was not found.".into()))?;
    writer.write_all(data.as_bytes())?;
    writer.flush()?;
    Ok(())
}

#[tauri::command]
pub fn close_terminal(session_id: String, state: State<'_, DesktopState>) -> DesktopResult<()> {
    state
        .terminals
        .lock()
        .map_err(|_| DesktopError::Policy("Terminal state is unavailable.".into()))?
        .remove(&session_id);
    Ok(())
}
