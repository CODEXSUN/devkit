export function devkitSocketPath(apiUrl: string, socketPath: string) {
  const prefix = apiUrl.replace(/\/+$/u, "");
  return prefix.startsWith("/") ? `${prefix}${socketPath}` : socketPath;
}
