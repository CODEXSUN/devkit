pub mod agent;
pub mod agent_history;
pub mod files;
pub mod git;
pub mod integrations;
pub mod learning;
pub mod process;
pub mod python;
pub mod search;
pub mod skills;
pub mod sync;
pub mod system;
pub mod tasks;
pub mod terminal;
mod workspace_policy;

use std::ffi::OsStr;
use std::path::{Path, PathBuf};
use std::process::Command;

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

pub(crate) fn background_command(program: impl AsRef<OsStr>) -> Command {
    let mut command = Command::new(program);
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }
    command
}
