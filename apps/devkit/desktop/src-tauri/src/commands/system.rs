use std::process::Command;

use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemStatus {
    docker: bool,
    git: bool,
    platform: String,
    rust_version: String,
}

#[tauri::command]
pub fn system_status() -> SystemStatus {
    SystemStatus {
        docker: available("docker"),
        git: available("git"),
        platform: std::env::consts::OS.to_owned(),
        rust_version: option_env!("RUSTC_VERSION")
            .unwrap_or("compiled")
            .to_owned(),
    }
}

fn available(command: &str) -> bool {
    Command::new(command)
        .arg("--version")
        .output()
        .is_ok_and(|value| value.status.success())
}
