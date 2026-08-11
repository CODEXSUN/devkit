use std::path::PathBuf;

use rusqlite::{params, Connection};
use serde::Serialize;

use crate::error::DesktopResult;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalTask {
    pub id: i64,
    pub title: String,
    pub status: String,
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

    pub fn pending_sync_count(&self) -> DesktopResult<usize> {
        let count = self.connection.query_row(
            "SELECT COUNT(*) FROM desktop_sync_outbox WHERE status='pending'",
            [],
            |row| row.get::<_, i64>(0),
        )?;
        Ok(count as usize)
    }

    fn migrate(&self) -> DesktopResult<()> {
        self.connection
            .execute_batch(include_str!("../migrations/0001_desktop.sql"))?;
        Ok(())
    }
}
