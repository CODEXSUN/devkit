use std::collections::HashMap;
use std::path::PathBuf;

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

use crate::error::{DesktopError, DesktopResult};

mod learning;
#[cfg(test)]
mod learning_tests;

pub use learning::{
    DetectedLearning, ProjectLearning, ProjectLearningSettings, ProjectLearningSummary,
};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderConfig {
    pub enabled: bool,
    pub is_default: bool,
    pub api_key: Option<String>,
    pub base_url: Option<String>,
    pub model: Option<String>,
    pub temperature: Option<f64>,
    pub system_prompt: Option<String>,
}

impl Default for ProviderConfig {
    fn default() -> Self {
        Self {
            enabled: false,
            is_default: false,
            api_key: None,
            base_url: None,
            model: None,
            temperature: None,
            system_prompt: None,
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentConfig {
    pub codex_path: Option<String>,
    pub default_access: String,
    pub auto_start: bool,
    pub approval_policy: String,
    pub sandbox_type: String,
    pub network_access: bool,
    pub max_turns: i64,
    pub idle_timeout: i64,
    pub default_provider: String,
    pub providers: HashMap<String, ProviderConfig>,
}

impl Default for AgentConfig {
    fn default() -> Self {
        let mut providers = HashMap::new();
        providers.insert("codex".into(), ProviderConfig { enabled: true, is_default: true, ..Default::default() });
        providers.insert("openrouter".into(), ProviderConfig::default());
        providers.insert("opencode".into(), ProviderConfig::default());
        providers.insert("claude".into(), ProviderConfig::default());
        providers.insert("gemini".into(), ProviderConfig { enabled: false, base_url: Some("https://generativelanguage.googleapis.com/v1beta".into()), model: Some("gemini-2.0-flash".into()), ..Default::default() });
        providers.insert("ollama".into(), ProviderConfig { enabled: true, base_url: Some("http://localhost:11434".into()), ..Default::default() });
        Self {
            codex_path: None,
            default_access: "workspaceWrite".into(),
            auto_start: false,
            approval_policy: "on-request".into(),
            sandbox_type: "workspace-write".into(),
            network_access: false,
            max_turns: 50,
            idle_timeout: 180,
            default_provider: "codex".into(),
            providers,
        }
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalTask {
    pub id: i64,
    pub title: String,
    pub status: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentTask {
    pub id: i64,
    pub thread_id: String,
    pub title: String,
    pub access: String,
    pub updated_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentMessage {
    pub id: String,
    pub task_id: i64,
    pub role: String,
    pub content: String,
    pub created_at: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopProfile {
    pub display_name: String,
    pub email: Option<String>,
    pub remember_identity: bool,
    pub confirm_on_startup: bool,
    pub last_workspace_path: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopWorkspace {
    pub path: String,
    pub name: String,
    pub kind: String,
    pub relationship: String,
    pub project_name: Option<String>,
    pub last_opened_at: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopSetup {
    pub profile: Option<DesktopProfile>,
    pub workspaces: Vec<DesktopWorkspace>,
}

pub struct DesktopDatabase {
    connection: Connection,
}

impl DesktopDatabase {
    pub fn open(path: PathBuf) -> DesktopResult<Self> {
        let database = Self {
            connection: Connection::open(path)?,
        };
        database.migrate()?;
        Ok(database)
    }

    pub fn list_tasks(&self) -> DesktopResult<Vec<LocalTask>> {
        let mut statement = self.connection.prepare(
            "SELECT id, title, status FROM desktop_tasks ORDER BY updated_at DESC, id DESC",
        )?;
        let rows = statement.query_map([], |row| {
            Ok(LocalTask {
                id: row.get(0)?,
                title: row.get(1)?,
                status: row.get(2)?,
            })
        })?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    pub fn save_task(&self, title: &str) -> DesktopResult<LocalTask> {
        self.connection.execute(
            "INSERT INTO desktop_tasks (title, status) VALUES (?1, 'todo')",
            params![title],
        )?;
        Ok(LocalTask {
            id: self.connection.last_insert_rowid(),
            title: title.to_owned(),
            status: "todo".to_owned(),
        })
    }

    pub fn list_agent_tasks(&self, workspace_path: &str) -> DesktopResult<Vec<AgentTask>> {
        let mut statement = self.connection.prepare(
            "SELECT id, thread_id, title, access, updated_at
             FROM desktop_agent_tasks
             WHERE workspace_path = ?1
             ORDER BY updated_at DESC, id DESC",
        )?;
        let rows = statement.query_map(params![workspace_path], agent_task_from_row)?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    pub fn save_agent_task(
        &self,
        workspace_path: &str,
        thread_id: &str,
        title: &str,
        access: &str,
    ) -> DesktopResult<AgentTask> {
        self.connection.execute(
            "INSERT INTO desktop_agent_tasks (workspace_path, thread_id, title, access)
             VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(thread_id) DO UPDATE SET
               title = excluded.title,
               access = excluded.access,
               updated_at = CURRENT_TIMESTAMP",
            params![workspace_path, thread_id, title, access],
        )?;
        Ok(self.connection.query_row(
            "SELECT id, thread_id, title, access, updated_at
             FROM desktop_agent_tasks WHERE thread_id = ?1",
            params![thread_id],
            agent_task_from_row,
        )?)
    }

    pub fn list_agent_messages(&self, task_id: i64) -> DesktopResult<Vec<AgentMessage>> {
        let mut statement = self.connection.prepare(
            "SELECT id, task_id, role, content, created_at
             FROM desktop_agent_messages
             WHERE task_id = ?1
             ORDER BY created_at, rowid",
        )?;
        let rows = statement.query_map(params![task_id], |row| {
            Ok(AgentMessage {
                id: row.get(0)?,
                task_id: row.get(1)?,
                role: row.get(2)?,
                content: row.get(3)?,
                created_at: row.get(4)?,
            })
        })?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    pub fn save_agent_message(
        &mut self,
        task_id: i64,
        id: &str,
        role: &str,
        content: &str,
    ) -> DesktopResult<AgentMessage> {
        let transaction = self.connection.transaction()?;
        transaction.execute(
            "INSERT INTO desktop_agent_messages (id, task_id, role, content)
             VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(id) DO UPDATE SET content = excluded.content",
            params![id, task_id, role, content],
        )?;
        transaction.execute(
            "UPDATE desktop_agent_tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = ?1",
            params![task_id],
        )?;
        let message = transaction.query_row(
            "SELECT id, task_id, role, content, created_at
             FROM desktop_agent_messages WHERE id = ?1",
            params![id],
            |row| {
                Ok(AgentMessage {
                    id: row.get(0)?,
                    task_id: row.get(1)?,
                    role: row.get(2)?,
                    content: row.get(3)?,
                    created_at: row.get(4)?,
                })
            },
        )?;
        transaction.commit()?;
        Ok(message)
    }

    pub fn delete_agent_message(&self, task_id: i64, id: &str) -> DesktopResult<bool> {
        let deleted = self.connection.execute(
            "DELETE FROM desktop_agent_messages WHERE task_id = ?1 AND id = ?2",
            params![task_id, id],
        )?;
        Ok(deleted > 0)
    }

    pub fn pending_sync_count(&self) -> DesktopResult<usize> {
        let count = self.connection.query_row(
            "SELECT COUNT(*) FROM desktop_sync_outbox WHERE status='pending'",
            [],
            |row| row.get::<_, i64>(0),
        )?;
        Ok(count as usize)
    }

    pub fn desktop_setup(&self) -> DesktopResult<DesktopSetup> {
        Ok(DesktopSetup {
            profile: self.desktop_profile()?,
            workspaces: self.list_desktop_workspaces()?,
        })
    }

    pub fn save_desktop_profile(&self, profile: &DesktopProfile) -> DesktopResult<DesktopProfile> {
        self.connection.execute(
            "INSERT INTO desktop_local_profile (id, display_name, email, remember_identity, confirm_on_startup, last_workspace_path)
             VALUES (1, ?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(id) DO UPDATE SET display_name = excluded.display_name, email = excluded.email,
             remember_identity = excluded.remember_identity, confirm_on_startup = excluded.confirm_on_startup,
             last_workspace_path = excluded.last_workspace_path, updated_at = CURRENT_TIMESTAMP",
            params![profile.display_name, profile.email, profile.remember_identity, profile.confirm_on_startup, profile.last_workspace_path],
        )?;
        self.desktop_profile()?.ok_or_else(|| DesktopError::Policy("Local profile was not saved.".into()))
    }

    pub fn save_desktop_workspace(&self, workspace: &DesktopWorkspace) -> DesktopResult<DesktopWorkspace> {
        self.connection.execute(
            "INSERT INTO desktop_workspaces (path, name, kind, relationship, project_name)
             VALUES (?1, ?2, ?3, ?4, ?5)
             ON CONFLICT(path) DO UPDATE SET name = excluded.name, kind = excluded.kind,
             relationship = excluded.relationship, project_name = excluded.project_name, updated_at = CURRENT_TIMESTAMP",
            params![workspace.path, workspace.name, workspace.kind, workspace.relationship, workspace.project_name],
        )?;
        self.workspace_by_path(&workspace.path)
    }

    pub fn mark_workspace_opened(&self, path: &str, name: &str) -> DesktopResult<()> {
        self.connection.execute(
            "INSERT INTO desktop_workspaces (path, name) VALUES (?1, ?2)
             ON CONFLICT(path) DO UPDATE SET name = excluded.name, last_opened_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP",
            params![path, name],
        )?;
        self.connection.execute(
            "UPDATE desktop_local_profile SET last_workspace_path = ?1, updated_at = CURRENT_TIMESTAMP WHERE id = 1",
            params![path],
        )?;
        Ok(())
    }

    pub fn get_agent_config(&self) -> DesktopResult<AgentConfig> {
        let mut statement = self.connection.prepare(
            "SELECT key, value FROM desktop_settings WHERE key LIKE 'agent.%'",
        )?;
        let rows = statement.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        })?;
        let mut config = AgentConfig::default();
        for row in rows {
            let (key, value) = row?;
            match key.as_str() {
                "agent.codex_path" => config.codex_path = if value.is_empty() { None } else { Some(value) },
                "agent.default_access" => config.default_access = value,
                "agent.auto_start" => config.auto_start = value == "true",
                "agent.approval_policy" => config.approval_policy = value,
                "agent.sandbox_type" => config.sandbox_type = value,
                "agent.network_access" => config.network_access = value == "true",
                "agent.max_turns" => config.max_turns = value.parse().unwrap_or(50),
                "agent.idle_timeout" => config.idle_timeout = value.parse().unwrap_or(180),
                "agent.default_provider" => config.default_provider = value,
                _ if key.starts_with("agent.providers.") => {
                    let parts: Vec<&str> = key.split('.').collect();
                    if parts.len() == 4 {
                        let provider = parts[2];
                        let field = parts[3];
                        let provider_config = config.providers.entry(provider.into()).or_default();
                        match field {
                            "enabled" => provider_config.enabled = value == "true",
                            "is_default" => provider_config.is_default = value == "true",
                            "api_key" => provider_config.api_key = if value.is_empty() { None } else { Some(value) },
                            "base_url" => provider_config.base_url = if value.is_empty() { None } else { Some(value) },
                            "model" => provider_config.model = if value.is_empty() { None } else { Some(value) },
                            "temperature" => provider_config.temperature = value.parse().ok(),
                            "system_prompt" => provider_config.system_prompt = if value.is_empty() { None } else { Some(value) },
                            _ => {}
                        }
                    }
                }
                _ => {}
            }
        }
        Ok(config)
    }

    pub fn save_agent_config(&mut self, config: &AgentConfig) -> DesktopResult<AgentConfig> {
        let transaction = self.connection.transaction()?;
        let settings = [
            ("agent.codex_path", config.codex_path.clone().unwrap_or_default()),
            ("agent.default_access", config.default_access.clone()),
            ("agent.auto_start", config.auto_start.to_string()),
            ("agent.approval_policy", config.approval_policy.clone()),
            ("agent.sandbox_type", config.sandbox_type.clone()),
            ("agent.network_access", config.network_access.to_string()),
            ("agent.max_turns", config.max_turns.to_string()),
            ("agent.idle_timeout", config.idle_timeout.to_string()),
            ("agent.default_provider", config.default_provider.clone()),
        ];
        for (key, value) in settings {
            transaction.execute(
                "INSERT INTO desktop_settings (key, value) VALUES (?1, ?2)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
                params![key, value],
            )?;
        }
        for (provider, provider_config) in &config.providers {
            let prefix = format!("agent.providers.{provider}.");
            let provider_settings = [
                (format!("{prefix}enabled"), provider_config.enabled.to_string()),
                (format!("{prefix}is_default"), provider_config.is_default.to_string()),
                (format!("{prefix}api_key"), provider_config.api_key.clone().unwrap_or_default()),
                (format!("{prefix}base_url"), provider_config.base_url.clone().unwrap_or_default()),
                (format!("{prefix}model"), provider_config.model.clone().unwrap_or_default()),
                (format!("{prefix}temperature"), provider_config.temperature.map(|t| t.to_string()).unwrap_or_default()),
                (format!("{prefix}system_prompt"), provider_config.system_prompt.clone().unwrap_or_default()),
            ];
            for (key, value) in provider_settings {
                transaction.execute(
                    "INSERT INTO desktop_settings (key, value) VALUES (?1, ?2)
                     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
                    params![key, value],
                )?;
            }
        }
        transaction.commit()?;
        Ok(config.clone())
    }

    fn migrate(&self) -> DesktopResult<()> {
        self.connection
            .execute_batch(include_str!("../migrations/0001_desktop.sql"))?;
        self.connection
            .execute_batch(include_str!("../migrations/0002_agent_history.sql"))?;
        self.connection
            .execute_batch(include_str!("../migrations/0003_project_learning.sql"))?;
        self.connection
            .execute_batch(include_str!("../migrations/0004_settings.sql"))?;
        self.connection
            .execute_batch(include_str!("../migrations/0005_desktop_setup.sql"))?;
        self.ensure_workspace_column("kind", "TEXT NOT NULL DEFAULT 'application'")?;
        self.ensure_workspace_column("relationship", "TEXT NOT NULL DEFAULT 'standalone'")?;
        self.ensure_workspace_column("project_name", "TEXT")?;
        self.ensure_workspace_column("updated_at", "TEXT NOT NULL DEFAULT ''")?;
        Ok(())
    }

    fn ensure_workspace_column(&self, column: &str, definition: &str) -> DesktopResult<()> {
        let mut statement = self.connection.prepare("PRAGMA table_info(desktop_workspaces)")?;
        let columns = statement.query_map([], |row| row.get::<_, String>(1))?;
        if columns.filter_map(Result::ok).any(|name| name == column) {
            return Ok(());
        }
        self.connection.execute_batch(&format!("ALTER TABLE desktop_workspaces ADD COLUMN {column} {definition}"))?;
        Ok(())
    }

    fn desktop_profile(&self) -> DesktopResult<Option<DesktopProfile>> {
        let mut statement = self.connection.prepare(
            "SELECT display_name, email, remember_identity, confirm_on_startup, last_workspace_path FROM desktop_local_profile WHERE id = 1",
        )?;
        let mut rows = statement.query([])?;
        let Some(row) = rows.next()? else { return Ok(None) };
        Ok(Some(DesktopProfile {
            display_name: row.get(0)?, email: row.get(1)?, remember_identity: row.get::<_, i64>(2)? != 0,
            confirm_on_startup: row.get::<_, i64>(3)? != 0, last_workspace_path: row.get(4)?,
        }))
    }

    fn list_desktop_workspaces(&self) -> DesktopResult<Vec<DesktopWorkspace>> {
        let mut statement = self.connection.prepare(
            "SELECT path, name, kind, relationship, project_name, last_opened_at FROM desktop_workspaces ORDER BY last_opened_at DESC, name COLLATE NOCASE",
        )?;
        let rows = statement.query_map([], desktop_workspace_from_row)?;
        Ok(rows.collect::<Result<Vec<_>, _>>()?)
    }

    fn workspace_by_path(&self, path: &str) -> DesktopResult<DesktopWorkspace> {
        Ok(self.connection.query_row(
            "SELECT path, name, kind, relationship, project_name, last_opened_at FROM desktop_workspaces WHERE path = ?1",
            params![path], desktop_workspace_from_row,
        )?)
    }
}

fn desktop_workspace_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<DesktopWorkspace> {
    Ok(DesktopWorkspace { path: row.get(0)?, name: row.get(1)?, kind: row.get(2)?, relationship: row.get(3)?, project_name: row.get(4)?, last_opened_at: row.get(5)? })
}

fn agent_task_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<AgentTask> {
    Ok(AgentTask {
        id: row.get(0)?,
        thread_id: row.get(1)?,
        title: row.get(2)?,
        access: row.get(3)?,
        updated_at: row.get(4)?,
    })
}

#[cfg(test)]
mod tests {
    use super::{DesktopDatabase, DesktopProfile, DesktopWorkspace};

    #[test]
    fn persists_agent_tasks_and_messages_per_workspace() {
        let path = std::env::temp_dir().join(format!(
            "devkit-agent-history-{}.db",
            uuid::Uuid::new_v4()
        ));
        let mut database = DesktopDatabase::open(path.clone()).expect("open test database");

        let task = database
            .save_agent_task(
                "C:/work/devkit",
                "thread-1",
                "Fix startup",
                "workspaceWrite",
            )
            .expect("save agent task");
        database
            .save_agent_message(task.id, "message-1", "user", "Make startup faster")
            .expect("save user message");
        database
            .save_agent_message(task.id, "message-2", "agent", "Startup is now deferred.")
            .expect("save agent message");

        assert_eq!(
            database.list_agent_tasks("C:/work/devkit").unwrap().len(),
            1
        );
        assert!(database
            .list_agent_tasks("C:/work/other")
            .unwrap()
            .is_empty());
        let messages = database.list_agent_messages(task.id).unwrap();
        assert_eq!(messages.len(), 2);
        assert_eq!(messages[1].content, "Startup is now deferred.");
        assert!(database
            .delete_agent_message(task.id, "message-1")
            .expect("delete unaccepted message"));
        let messages = database.list_agent_messages(task.id).unwrap();
        assert_eq!(messages.len(), 1);
        assert_eq!(messages[0].id, "message-2");

        drop(database);
        std::fs::remove_file(path).expect("remove test database");
    }

    #[test]
    fn persists_local_identity_and_workspace_mapping() {
        let path = std::env::temp_dir().join(format!("devkit-desktop-setup-{}.db", uuid::Uuid::new_v4()));
        let database = DesktopDatabase::open(path.clone()).expect("open test database");
        database.save_desktop_profile(&DesktopProfile {
            display_name: "Aaran".into(), email: Some("aaran@example.com".into()), remember_identity: true,
            confirm_on_startup: false, last_workspace_path: None,
        }).expect("save profile");
        database.save_desktop_workspace(&DesktopWorkspace {
            path: "C:/work/sample".into(), name: "sample".into(), kind: "plugin".into(),
            relationship: "addOn".into(), project_name: Some("DevKit".into()), last_opened_at: String::new(),
        }).expect("save workspace");
        database.mark_workspace_opened("C:/work/sample", "sample").expect("mark opened");
        drop(database);
        let database = DesktopDatabase::open(path.clone()).expect("reopen migrated database");
        let setup = database.desktop_setup().expect("load setup");
        assert_eq!(setup.profile.expect("profile").display_name, "Aaran");
        assert_eq!(setup.workspaces[0].relationship, "addOn");
        drop(database);
        std::fs::remove_file(path).expect("remove test database");
    }
}
