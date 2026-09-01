export const standardDeskPath = "/app/devkit/dashboard";

export function canAccessAdministratorSettings(role: string | undefined) {
  return role === "admin" || role === "super-admin";
}

export function canSelectApplicationTheme(role: string | undefined) {
  return canAccessAdministratorSettings(role);
}

export function applicationEntryPath() {
  return standardDeskPath;
}
