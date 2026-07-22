export async function migrateProjectManagerModule() {
  return {
    migrated: false,
    reason: "Project Manager records use the module-owned file store; no SQL schema is required.",
    source: "platform-project-manager",
    tables: []
  };
}
