pub mod files;
pub mod git;
pub mod process;
pub mod sync;
pub mod system;
pub mod tasks;

use std::path::{Path, PathBuf};

use tauri::State;

use crate::error::{DesktopError, DesktopResult};
use crate::state::DesktopState;

fn workspace_root(state: &State<'_, DesktopState>) -> DesktopResult<PathBuf> {
    state
        .workspace
        .lock()
        .map_err(|_| DesktopError::Policy("Workspace state is unavailable.".into()))?
        .clone()
        .ok_or_else(|| DesktopError::Policy("Open a workspace first.".into()))
}

fn workspace_path(state: &State<'_, DesktopState>, input: &str) -> DesktopResult<PathBuf> {
    let root = workspace_root(state)?;
    let candidate = root.join(input);
    let resolved = candidate.canonicalize()?;
    if !resolved.starts_with(&root) {
        return Err(DesktopError::Policy(
            "The path is outside the open workspace.".into(),
        ));
    }
    Ok(resolved)
}

fn display_name(path: &Path) -> String {
    path.file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("Workspace")
        .to_owned()
}
