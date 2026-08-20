use serde::{Deserialize, Serialize};
use std::io::{BufRead, BufReader, Read};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::mpsc;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

const DEFAULT_MODEL: &str = "opencode/deepseek-v4-flash-free";
const CHAT_TIMEOUT: Duration = Duration::from_secs(120);
const CONNECTION_TIMEOUT: Duration = Duration::from_secs(20);

#[derive(Debug, Serialize, Deserialize)]
pub struct WelcomeMessage {
    pub title: String,
    pub message: String,
    pub version: String,
    pub features: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChatResponse {
    pub text: String,
    pub code_snippet: Option<String>,
    pub model_used: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConnectionStatus {
    pub connected: bool,
    pub message: String,
    pub latency_ms: u128,
    pub model: String,
    pub executable: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ChatDelta {
    request_id: String,
    delta: String,
}

#[tauri::command]
fn get_welcome_message() -> WelcomeMessage {
    WelcomeMessage {
        title: "Welcome to CodeIt".to_string(),
        message: "A local coding chat powered by the configured OpenCode engine.".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        features: vec![
            "Streamed OpenCode replies".to_string(),
            "Explicit connection checks".to_string(),
            "Type-safe Tauri IPC".to_string(),
        ],
    }
}

#[tauri::command]
async fn chat_query(
    app: AppHandle,
    request_id: String,
    prompt: String,
    model: String,
    file_context: String,
    last_topic: Option<String>,
) -> Result<ChatResponse, String> {
    tauri::async_runtime::spawn_blocking(move || {
        run_chat_query(
            &app,
            &request_id,
            &prompt,
            &model,
            &file_context,
            last_topic.as_deref(),
        )
    })
    .await
    .map_err(|error| format!("OpenCode worker error: {error}"))?
}

#[tauri::command]
async fn verify_connection(model: Option<String>) -> Result<ConnectionStatus, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let model = normalize_model(model.as_deref().unwrap_or(DEFAULT_MODEL));
        let executable = match resolve_opencode() {
            Ok(path) => path,
            Err(error) => {
                return ConnectionStatus {
                    connected: false,
                    message: error,
                    latency_ms: 0,
                    model,
                    executable: "Unavailable".to_string(),
                };
            }
        };
        let started_at = Instant::now();
        match run_opencode(
            &model,
            &resolve_workspace_root(),
            "Reply with exactly: CONNECTED",
            CONNECTION_TIMEOUT,
            |_| {},
        ) {
            Ok((reply, _)) if reply.trim() == "CONNECTED" => ConnectionStatus {
                connected: true,
                message: format!("OpenCode is ready for {model}."),
                latency_ms: started_at.elapsed().as_millis(),
                model,
                executable: executable.display().to_string(),
            },
            Ok((reply, _)) => ConnectionStatus {
                connected: false,
                message: format!("Unexpected OpenCode probe response: {}", reply.trim()),
                latency_ms: started_at.elapsed().as_millis(),
                model,
                executable: executable.display().to_string(),
            },
            Err(error) => ConnectionStatus {
                connected: false,
                message: error,
                latency_ms: started_at.elapsed().as_millis(),
                model,
                executable: executable.display().to_string(),
            },
        }
    })
    .await
    .map_err(|error| format!("OpenCode worker error: {error}"))
}

fn run_chat_query(
    app: &AppHandle,
    request_id: &str,
    prompt: &str,
    model: &str,
    file_context: &str,
    last_topic: Option<&str>,
) -> Result<ChatResponse, String> {
    let model = normalize_model(model);
    let prompt = build_prompt(prompt, file_context, last_topic);
    let (text, _) = run_opencode(
        &model,
        &resolve_workspace_root(),
        &prompt,
        CHAT_TIMEOUT,
        |delta| {
            let _ = app.emit(
                "codeit://chat-delta",
                ChatDelta {
                    request_id: request_id.to_string(),
                    delta: delta.to_string(),
                },
            );
        },
    )?;

    Ok(ChatResponse {
        code_snippet: extract_code_block(&text),
        text,
        model_used: model,
    })
}

fn build_prompt(prompt: &str, file_context: &str, last_topic: Option<&str>) -> String {
    let mut parts = vec![
        "You are CodeIt, a precise coding assistant.".to_string(),
        format!("The active workspace file is: {file_context}."),
        "Do not claim to edit or inspect files unless the supplied context proves it.".to_string(),
    ];
    if let Some(topic) = last_topic.filter(|topic| !topic.trim().is_empty()) {
        parts.push(format!(
            "Previous assistant reply excerpt: {}",
            topic.chars().take(400).collect::<String>()
        ));
    }
    parts.push(format!("User request: {prompt}"));
    parts.join("\n")
}

fn run_opencode(
    model: &str,
    workspace: &Path,
    prompt: &str,
    timeout: Duration,
    on_delta: impl Fn(&str),
) -> Result<(String, String), String> {
    let executable = resolve_opencode()?;
    let mut command = Command::new(&executable);
    command
        .args(["run", "--model", model])
        .arg("--dir")
        .arg(workspace)
        .args(["--format", "json"])
        .arg(prompt)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .stdin(Stdio::null());
    hide_child_window(&mut command);
    let mut child = command.spawn().map_err(|error| {
        format!(
            "Failed to start OpenCode ({}): {error}",
            executable.display()
        )
    })?;

    let (sender, receiver) = mpsc::channel::<String>();
    let stdout = child
        .stdout
        .take()
        .ok_or("OpenCode stdout is unavailable.")?;
    let reader_thread = std::thread::spawn(move || {
        for line in BufReader::new(stdout).lines().map_while(Result::ok) {
            if sender.send(line).is_err() {
                break;
            }
        }
    });
    let stderr = child
        .stderr
        .take()
        .ok_or("OpenCode stderr is unavailable.")?;
    let stderr_thread = std::thread::spawn(move || {
        let mut buffer = String::new();
        let _ = BufReader::new(stderr).read_to_string(&mut buffer);
        buffer
    });

    let deadline = Instant::now() + timeout;
    let mut text = String::new();
    loop {
        let remaining = deadline.saturating_duration_since(Instant::now());
        if remaining.is_zero() {
            let _ = child.kill();
            let _ = child.wait();
            let _ = reader_thread.join();
            return Err(format!(
                "OpenCode did not reply within {} seconds.",
                timeout.as_secs()
            ));
        }
        match receiver.recv_timeout(remaining) {
            Ok(line) => {
                if let Some(delta) = text_delta(&line) {
                    on_delta(&delta);
                    text.push_str(&delta);
                }
            }
            Err(mpsc::RecvTimeoutError::Disconnected) => break,
            Err(mpsc::RecvTimeoutError::Timeout) => continue,
        }
    }

    let status = child
        .wait()
        .map_err(|error| format!("OpenCode process error: {error}"))?;
    let _ = reader_thread.join();
    let stderr = stderr_thread.join().unwrap_or_default();
    if !status.success() {
        return Err(format!(
            "OpenCode exited with {status}: {}",
            stderr_message(&stderr, model)
        ));
    }
    let text = text.trim().to_string();
    if text.is_empty() {
        return Err(stderr_message(&stderr, model));
    }
    Ok((text, stderr))
}

fn text_delta(line: &str) -> Option<String> {
    let value: serde_json::Value = serde_json::from_str(line).ok()?;
    if value.get("type")?.as_str()? != "text" {
        return None;
    }
    let text = value.pointer("/part/text")?.as_str()?;
    (!text.is_empty()).then(|| text.to_string())
}

fn extract_code_block(text: &str) -> Option<String> {
    let start = text.find("```")? + 3;
    let body = &text[start..];
    let body = &body[body.find('\n')? + 1..];
    let end = body.find("```")?;
    (!body[..end].trim().is_empty()).then(|| body[..end].trim_end().to_string())
}

fn stderr_message(stderr: &str, model: &str) -> String {
    let cleaned = stderr.trim();
    if cleaned.is_empty() {
        format!("OpenCode returned no response for {model}. Check OpenCode authentication and model access.")
    } else {
        format!("{model}: {}", cleaned.chars().take(500).collect::<String>())
    }
}

fn normalize_model(model: &str) -> String {
    match model.trim() {
        "" | "deepseek-v4-flash-free" => DEFAULT_MODEL.to_string(),
        "deepseek-v4-flash" => "opencode/deepseek-v4-flash".to_string(),
        "deepseek-v4-pro" => "opencode/deepseek-v4-pro".to_string(),
        "gemini-3.6-flash" => "opencode/gemini-3.6-flash".to_string(),
        "gemini-3.6-flash-lite" => "opencode/gemini-3.6-flash-lite".to_string(),
        "claude-3.5-sonnet" => "opencode/claude-sonnet-4-5".to_string(),
        "claude-3-haiku" => "opencode/claude-haiku-4-5".to_string(),
        "gpt-4o" => "opencode/gpt-5.2".to_string(),
        "gpt-4o-mini" => "opencode/gpt-5.1-codex-mini".to_string(),
        other if other.contains('/') => other.to_string(),
        other => format!("opencode/{other}"),
    }
}

fn resolve_opencode() -> Result<PathBuf, String> {
    if let Some(value) = std::env::var_os("OPENCODE_EXECUTABLE") {
        let path = PathBuf::from(value);
        if path.is_file() {
            return Ok(path);
        }
        return Err(format!(
            "OPENCODE_EXECUTABLE was not found: {}",
            path.display()
        ));
    }
    let mut directory = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    for _ in 0..8 {
        let name = if cfg!(windows) {
            "opencode.exe"
        } else {
            "opencode"
        };
        let candidate = directory
            .join("node_modules")
            .join("opencode-ai")
            .join("bin")
            .join(name);
        if candidate.is_file() {
            return Ok(candidate);
        }
        if !directory.pop() {
            break;
        }
    }
    let names = if cfg!(windows) {
        ["opencode.exe", "opencode.cmd"]
    } else {
        ["opencode", "opencode"]
    };
    for directory in std::env::var_os("PATH")
        .iter()
        .flat_map(|paths| std::env::split_paths(paths))
    {
        for name in names {
            let candidate = directory.join(name);
            if candidate.is_file() {
                return Ok(candidate);
            }
        }
    }
    Err("OpenCode executable not found. Install opencode-ai, add OpenCode to PATH, or set OPENCODE_EXECUTABLE.".to_string())
}

fn resolve_workspace_root() -> PathBuf {
    let mut directory = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    for _ in 0..8 {
        if directory.join("AGENTS.md").is_file() && directory.join("package.json").is_file() {
            return directory;
        }
        if !directory.pop() {
            break;
        }
    }
    std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."))
}

#[cfg(windows)]
fn hide_child_window(command: &mut Command) {
    use std::os::windows::process::CommandExt;
    command.creation_flags(0x08000000);
}

#[cfg(not(windows))]
fn hide_child_window(_command: &mut Command) {}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_welcome_message,
            chat_query,
            verify_connection
        ])
        .run(tauri::generate_context!())
        .expect("error while running CodeIt");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_known_models() {
        assert_eq!(normalize_model("deepseek-v4-flash-free"), DEFAULT_MODEL);
        assert_eq!(normalize_model("gpt-4o"), "opencode/gpt-5.2");
    }

    #[test]
    fn builds_bounded_prompt_context() {
        let prompt = build_prompt("Explain this", "src/App.tsx", Some("Earlier reply"));
        assert!(prompt.contains("src/App.tsx"));
        assert!(prompt.contains("Earlier reply"));
    }

    #[test]
    fn extracts_fenced_code() {
        assert_eq!(
            extract_code_block("```ts\nconst ok = true;\n```"),
            Some("const ok = true;".to_string())
        );
    }
}
