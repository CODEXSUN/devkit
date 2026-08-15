use std::fs;
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

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitWorktree {
    path: String,
    branch: String,
    head: String,
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

#[tauri::command]
pub fn git_diff(path: Option<String>, state: State<'_, DesktopState>) -> DesktopResult<String> {
    let root = workspace_root(&state)?;
    let mut command = Command::new("git");
    command.args(["diff", "--"]);
    if let Some(path) = path {
        command.arg(path);
    }
    checked_output(command.current_dir(root), "Git diff failed.")
}

#[tauri::command]
pub fn git_stage(paths: Vec<String>, state: State<'_, DesktopState>) -> DesktopResult<()> {
    if paths.is_empty() {
        return Err(DesktopError::Policy("Select at least one file.".into()));
    }
    let root = workspace_root(&state)?;
    let mut command = Command::new("git");
    command.args(["add", "--"]).args(paths);
    checked_output(command.current_dir(root), "Git stage failed.").map(|_| ())
}

#[tauri::command]
pub fn git_unstage(paths: Vec<String>, state: State<'_, DesktopState>) -> DesktopResult<()> {
    if paths.is_empty() {
        return Err(DesktopError::Policy("Select at least one file.".into()));
    }
    let root = workspace_root(&state)?;
    let mut command = Command::new("git");
    command.args(["restore", "--staged", "--"]).args(paths);
    checked_output(command.current_dir(root), "Git unstage failed.").map(|_| ())
}

#[tauri::command]
pub fn git_commit(message: String, state: State<'_, DesktopState>) -> DesktopResult<String> {
    if message.trim().is_empty() {
        return Err(DesktopError::Policy("Commit message is required.".into()));
    }
    let root = workspace_root(&state)?;
    let mut command = Command::new("git");
    command.args(["commit", "-m", message.trim()]);
    checked_output(command.current_dir(root), "Git commit failed.")
}

#[tauri::command]
pub fn git_worktrees(state: State<'_, DesktopState>) -> DesktopResult<Vec<GitWorktree>> {
    let root = workspace_root(&state)?;
    let mut command = Command::new("git");
    command.args(["worktree", "list", "--porcelain"]);
    let output = checked_output(command.current_dir(root), "Git worktree lookup failed.")?;
    let mut worktrees = Vec::new();
    for block in output.split("\n\n") {
        let value = |prefix: &str| {
            block
                .lines()
                .find_map(|line| line.strip_prefix(prefix))
                .unwrap_or("")
        };
        let path = value("worktree ");
        if !path.is_empty() {
            worktrees.push(GitWorktree {
                path: path.to_owned(),
                head: value("HEAD ").chars().take(8).collect(),
                branch: value("branch refs/heads/").to_owned(),
            });
        }
    }
    Ok(worktrees)
}

#[tauri::command]
pub fn git_create_worktree(
    name: String,
    state: State<'_, DesktopState>,
) -> DesktopResult<GitWorktree> {
    let slug = worktree_slug(&name)?;
    let root = workspace_root(&state)?;
    let parent = root
        .parent()
        .ok_or_else(|| DesktopError::Policy("The workspace has no parent directory.".into()))?;
    let managed_root = parent.join(".devkit-worktrees");
    fs::create_dir_all(&managed_root)?;
    let target = managed_root.join(&slug);
    if target.exists() {
        return Err(DesktopError::Policy(
            "A worktree with this name already exists.".into(),
        ));
    }
    let branch = format!("devkit/{slug}");
    let mut command = Command::new("git");
    command
        .args(["worktree", "add", "-b", &branch])
        .arg(&target);
    checked_output(command.current_dir(&root), "Git worktree creation failed.")?;
    let head = git_head(&target)?;
    Ok(GitWorktree {
        path: target.display().to_string(),
        branch,
        head,
    })
}

#[tauri::command]
pub fn git_remove_worktree(path: String, state: State<'_, DesktopState>) -> DesktopResult<()> {
    let root = workspace_root(&state)?;
    let target = Path::new(&path).canonicalize()?;
    if target == root {
        return Err(DesktopError::Policy(
            "The open workspace cannot be removed.".into(),
        ));
    }
    let registered = registered_worktree_paths(&root)?
        .iter()
        .any(|entry| entry == &target);
    if !registered {
        return Err(DesktopError::Policy(
            "The directory is not a registered worktree.".into(),
        ));
    }
    let mut status = Command::new("git");
    status.args(["status", "--porcelain", "--untracked-files=all"]);
    if !checked_output(status.current_dir(&target), "Git status failed.")?.is_empty() {
        return Err(DesktopError::Policy(
            "The worktree has uncommitted changes and was not removed.".into(),
        ));
    }
    let mut command = Command::new("git");
    command.args(["worktree", "remove"]).arg(&target);
    checked_output(command.current_dir(root), "Git worktree removal failed.").map(|_| ())
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

fn checked_output(command: &mut Command, fallback: &str) -> DesktopResult<String> {
    let output = command.output()?;
    if !output.status.success() {
        let error = String::from_utf8_lossy(&output.stderr).trim().to_owned();
        return Err(DesktopError::Policy(if error.is_empty() {
            fallback.to_owned()
        } else {
            error
        }));
    }
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_owned())
}

fn worktree_slug(name: &str) -> DesktopResult<String> {
    let slug = name.trim().to_lowercase();
    if slug.is_empty()
        || slug.len() > 48
        || !slug
            .chars()
            .all(|value| value.is_ascii_alphanumeric() || value == '-')
    {
        return Err(DesktopError::Policy(
            "Use 1 to 48 lowercase letters, numbers, or hyphens for the worktree name.".into(),
        ));
    }
    Ok(slug)
}

fn git_head(root: &Path) -> DesktopResult<String> {
    let mut command = Command::new("git");
    command.args(["rev-parse", "--short=8", "HEAD"]);
    checked_output(command.current_dir(root), "Git revision lookup failed.")
}

fn registered_worktree_paths(root: &Path) -> DesktopResult<Vec<std::path::PathBuf>> {
    let mut command = Command::new("git");
    command.args(["worktree", "list", "--porcelain"]);
    Ok(
        checked_output(command.current_dir(root), "Git worktree lookup failed.")?
            .lines()
            .filter_map(|line| line.strip_prefix("worktree "))
            .filter_map(|path| Path::new(path).canonicalize().ok())
            .collect(),
    )
}

#[cfg(test)]
mod tests {
    use super::worktree_slug;

    #[test]
    fn accepts_a_bounded_worktree_name() {
        assert_eq!(
            worktree_slug("Feature-123").expect("valid slug"),
            "feature-123"
        );
    }

    #[test]
    fn rejects_paths_and_spaces() {
        assert!(worktree_slug("../outside").is_err());
        assert!(worktree_slug("two words").is_err());
    }
}
