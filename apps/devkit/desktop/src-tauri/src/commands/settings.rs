use crate::database::{AgentConfig, DesktopProfile, DesktopSetup, DesktopWorkspace};
use crate::error::{DesktopError, DesktopResult};
use crate::state::DesktopState;
use serde::Serialize;
use tauri::State;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentConfigResponse {
    config: AgentConfig,
}

#[tauri::command]
pub fn get_agent_config(state: State<'_, DesktopState>) -> DesktopResult<AgentConfigResponse> {
    state.with_database(|database| {
        let config = database.get_agent_config()?;
        Ok(AgentConfigResponse { config })
    })
}

#[tauri::command]
pub fn get_desktop_setup(state: State<'_, DesktopState>) -> DesktopResult<DesktopSetup> {
    state.with_database(|database| database.desktop_setup())
}

#[tauri::command]
pub fn save_desktop_profile(
    profile: DesktopProfile,
    state: State<'_, DesktopState>,
) -> DesktopResult<DesktopProfile> {
    let display_name = profile.display_name.trim();
    if display_name.is_empty() || display_name.len() > 80 {
        return Err(DesktopError::Policy(
            "Enter a display name of up to 80 characters.".into(),
        ));
    }
    let email = profile
        .email
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());
    if email.is_some_and(|value| value.len() > 254 || !value.contains('@')) {
        return Err(DesktopError::Policy(
            "Enter a valid email address or leave it blank.".into(),
        ));
    }
    state.with_database(|database| {
        database.save_desktop_profile(&DesktopProfile {
            display_name: display_name.into(),
            email: email.map(str::to_owned),
            ..profile
        })
    })
}

#[tauri::command]
pub fn save_desktop_workspace(
    workspace: DesktopWorkspace,
    state: State<'_, DesktopState>,
) -> DesktopResult<DesktopWorkspace> {
    let valid_kinds = ["application", "plugin", "document", "other"];
    let valid_relationships = ["project", "addOn", "standalone"];
    if !valid_kinds.contains(&workspace.kind.as_str())
        || !valid_relationships.contains(&workspace.relationship.as_str())
    {
        return Err(DesktopError::Policy("Invalid workspace mapping.".into()));
    }
    state.with_database(|database| database.save_desktop_workspace(&workspace))
}

#[tauri::command]
pub fn set_desktop_workspace_pinned(
    path: String,
    pinned: bool,
    state: State<'_, DesktopState>,
) -> DesktopResult<DesktopWorkspace> {
    if path.trim().is_empty() {
        return Err(DesktopError::Policy("Workspace path is required.".into()));
    }
    state.with_database(|database| database.set_desktop_workspace_pinned(&path, pinned))
}

#[tauri::command]
pub fn remove_desktop_workspace(
    path: String,
    state: State<'_, DesktopState>,
) -> DesktopResult<bool> {
    if path.trim().is_empty() {
        return Err(DesktopError::Policy("Workspace path is required.".into()));
    }
    state.with_database(|database| database.remove_desktop_workspace(&path))
}

#[tauri::command]
pub fn reset_desktop_work_group(state: State<'_, DesktopState>) -> DesktopResult<DesktopProfile> {
    state.with_database(|database| database.reset_default_work_group())
}

#[tauri::command]
pub fn save_agent_config(
    config: AgentConfig,
    state: State<'_, DesktopState>,
) -> DesktopResult<AgentConfigResponse> {
    if config.max_turns < 1 || config.max_turns > 200 {
        return Err(DesktopError::Policy(
            "Max turns must be between 1 and 200.".into(),
        ));
    }
    if config.idle_timeout < 30 || config.idle_timeout > 600 {
        return Err(DesktopError::Policy(
            "Idle timeout must be between 30 and 600 seconds.".into(),
        ));
    }
    let allowed_access = ["readOnly", "workspaceWrite"];
    if !allowed_access.contains(&config.default_access.as_str()) {
        return Err(DesktopError::Policy("Invalid default access value.".into()));
    }
    let allowed_approval = ["on-request", "never", "always"];
    if !allowed_approval.contains(&config.approval_policy.as_str()) {
        return Err(DesktopError::Policy("Invalid approval policy.".into()));
    }
    let allowed_sandbox = ["workspace-write", "read-only", "danger-full-access"];
    if !allowed_sandbox.contains(&config.sandbox_type.as_str()) {
        return Err(DesktopError::Policy("Invalid sandbox type.".into()));
    }
    let allowed_providers = [
        "codex",
        "openrouter",
        "opencode",
        "claude",
        "ollama",
        "gemini",
    ];
    if !allowed_providers.contains(&config.default_provider.as_str()) {
        return Err(DesktopError::Policy("Invalid default provider.".into()));
    }
    if !config.providers.contains_key(&config.default_provider) {
        return Err(DesktopError::Policy(
            "Default provider must be configured.".into(),
        ));
    }
    let default_provider_config = config.providers.get(&config.default_provider).unwrap();
    if !default_provider_config.enabled {
        return Err(DesktopError::Policy(
            "Default provider must be enabled.".into(),
        ));
    }
    for (provider, provider_config) in &config.providers {
        if provider_config.enabled {
            if provider_config.api_key.is_none() && provider != "ollama" && provider != "codex" {
                return Err(DesktopError::Policy(format!(
                    "Provider '{provider}' requires an API key."
                )));
            }
            if provider == "ollama" && provider_config.base_url.is_none() {
                return Err(DesktopError::Policy("Ollama requires a base URL.".into()));
            }
        }
    }
    let mut default_count = 0;
    for (_, provider_config) in &config.providers {
        if provider_config.is_default {
            default_count += 1;
        }
    }
    if default_count != 1 {
        return Err(DesktopError::Policy(
            "Exactly one provider must be set as default.".into(),
        ));
    }

    state.with_database(|database| {
        let saved = database.save_agent_config(&config)?;
        Ok(AgentConfigResponse { config: saved })
    })
}
