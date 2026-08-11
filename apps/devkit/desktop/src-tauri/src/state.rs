use std::path::PathBuf;
use std::sync::Mutex;

use crate::database::DesktopDatabase;

pub struct DesktopState {
    pub database: Mutex<DesktopDatabase>,
    pub workspace: Mutex<Option<PathBuf>>,
}

impl DesktopState {
    pub fn new(database: DesktopDatabase) -> Self {
        Self {
            database: Mutex::new(database),
            workspace: Mutex::new(None),
        }
    }
}
