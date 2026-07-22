export const taskManagerMigration = {
  key: "devkit.task-manager.json",
  description: "Super Admin Todo JSON store; no SQL migration required."
};
export async function migrateTaskManagerModule() {
  return taskManagerMigration;
}
