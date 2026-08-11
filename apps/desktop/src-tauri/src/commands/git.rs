use std::path::Path;
use std::process::Command;

use serde::Serialize;
use tauri::State;

use crate::commands::workspace_root;
use crate::error::{DesktopError, DesktopResult};
use crate::state::DesktopState;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitChange {
    path: String,
    status: String,
}

#[tauri::command]
pub fn git_status(state: State<'_, DesktopState>) -> DesktopResult<Vec<GitChange>> {
    let root = workspace_root(&state)?;
    let output = Command::new("git")
        .args(["status", "--short", "--untracked-files=all"])
        .current_dir(root)
        .output()?;
    if !output.status.success() {
        return Err(DesktopError::Policy(
            String::from_utf8_lossy(&output.stderr).trim().into(),
        ));
    }
    Ok(String::from_utf8_lossy(&output.stdout)
        .lines()
        .filter(|line| line.len() >= 3)
        .map(|line| GitChange {
            status: line[..2].trim().to_owned(),
            path: line[3..].to_owned(),
        })
        .collect())
}

pub fn current_branch(root: &Path) -> DesktopResult<String> {
    let output = Command::new("git")
        .args(["branch", "--show-current"])
        .current_dir(root)
        .output()?;
    if !output.status.success() {
        return Err(DesktopError::Policy("Git branch lookup failed.".into()));
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_owned())
}
