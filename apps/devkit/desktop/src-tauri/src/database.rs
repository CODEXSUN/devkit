use std::path::PathBuf;

use rusqlite::{params, Connection};
use serde::Serialize;

use crate::error::DesktopResult;

mod learning;
#[cfg(test)]
mod learning_tests;

pub use learning::{
    DetectedLearning, ProjectLearning, ProjectLearningSettings, ProjectLearningSummary,
};

#[derive(Clone, Debug, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AgentConfig {
    pub codex_path: Option<String>,
    pub model: Option<String>,
    pub default_access: String,
    pub auto_start: bool,
    pub approval_policy: String,
    pub sandbox_type: String,
    pub network_access: bool,
    pub max_turns: i64,
    pub idle_timeout: i64,
}

impl Default for AgentConfig {
    fn default() -> Self {
        Self {
            codex_path: None,
            model: None,
            default_access: "workspaceWrite".into(),
            auto_start: false,
            approval_policy: "on-request".into(),
            sandbox_type: "workspace-write".into(),
            network_access: false,
            max_turns: 50,
            idle_timeout: 180,
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
                "agent.model" => config.model = if value.is_empty() { None } else { Some(value) },
                "agent.default_access" => config.default_access = value,
                "agent.auto_start" => config.auto_start = value == "true",
                "agent.approval_policy" => config.approval_policy = value,
                "agent.sandbox_type" => config.sandbox_type = value,
                "agent.network_access" => config.network_access = value == "true",
                "agent.max_turns" => config.max_turns = value.parse().unwrap_or(50),
                "agent.idle_timeout" => config.idle_timeout = value.parse().unwrap_or(180),
                _ => {}
            }
        }
        Ok(config)
    }

    pub fn save_agent_config(&mut self, config: &AgentConfig) -> DesktopResult<AgentConfig> {
        let transaction = self.connection.transaction()?;
        let settings = [
            ("agent.codex_path", config.codex_path.clone().unwrap_or_default()),
            ("agent.model", config.model.clone().unwrap_or_default()),
            ("agent.default_access", config.default_access.clone()),
            ("agent.auto_start", config.auto_start.to_string()),
            ("agent.approval_policy", config.approval_policy.clone()),
            ("agent.sandbox_type", config.sandbox_type.clone()),
            ("agent.network_access", config.network_access.to_string()),
            ("agent.max_turns", config.max_turns.to_string()),
            ("agent.idle_timeout", config.idle_timeout.to_string()),
        ];
        for (key, value) in settings {
            transaction.execute(
                "INSERT INTO desktop_settings (key, value) VALUES (?1, ?2)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP",
                params![key, value],
            )?;
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
        Ok(())
    }
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
    use super::DesktopDatabase;

    #[test]
    fn persists_agent_tasks_and_messages_per_workspace() {
        let path = std::env::temp_dir().join(format!(
            "codelogix-agent-history-{}.db",
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
}
