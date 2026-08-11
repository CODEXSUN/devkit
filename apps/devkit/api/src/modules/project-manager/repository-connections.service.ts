import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { promisify } from "node:util";
import { AppError } from "@codexsun/framework/errors";
import { getDevkitDatabase } from "../../database/index.js";

const executeFile = promisify(execFile);

export type RepositoryConnectionInput = {
  baseUrl: string;
  name: string;
  provider: "github" | "private-git";
  repositorySlug: string;
  status?: "active" | "inactive" | undefined;
};

export class RepositoryConnectionsService {
  async listForSettings() {
    const rows = await getDevkitDatabase()
      .selectFrom("devkit_repository_connections")
      .selectAll()
      .orderBy("name", "asc")
      .execute();
    return rows.map(mapSettingsRow);
  }

  async listForDevelopers() {
    const rows = await getDevkitDatabase()
      .selectFrom("devkit_repository_connections")
      .select(["uuid", "name", "provider", "status"])
      .where("status", "=", "active")
      .orderBy("name", "asc")
      .execute();
    return rows.map((row) => ({
      id: row.uuid,
      name: row.name,
      provider: row.provider,
      status: row.status
    }));
  }

  async create(input: RepositoryConnectionInput) {
    await getDevkitDatabase()
      .insertInto("devkit_repository_connections")
      .values({
        base_url: normalizeBaseUrl(input.baseUrl),
        name: input.name.trim(),
        provider: input.provider,
        repository_slug: input.repositorySlug.trim().replace(/^\/+|\/+$/gu, ""),
        status: input.status ?? "active",
        uuid: randomBytes(4).toString("hex")
      })
      .execute();
    return this.listForSettings();
  }

  async update(id: string, input: RepositoryConnectionInput) {
    const result = await getDevkitDatabase()
      .updateTable("devkit_repository_connections")
      .set({
        base_url: normalizeBaseUrl(input.baseUrl),
        name: input.name.trim(),
        provider: input.provider,
        repository_slug: input.repositorySlug.trim().replace(/^\/+|\/+$/gu, ""),
        status: input.status ?? "active"
      })
      .where("uuid", "=", id)
      .executeTakeFirst();
    if (Number(result.numUpdatedRows) === 0)
      throw new AppError({
        code: "REPOSITORY_CONNECTION_NOT_FOUND",
        message: "Repository connection not found.",
        statusCode: 404
      });
    return this.listForSettings();
  }

  async selectLocalFolder() {
    if (process.platform !== "win32") {
      throw new AppError({
        code: "FOLDER_PICKER_UNAVAILABLE",
        message: "Native folder selection is currently available on Windows only.",
        statusCode: 400
      });
    }
    const script = [
      "Add-Type -AssemblyName System.Windows.Forms",
      "$dialog = New-Object System.Windows.Forms.FolderBrowserDialog",
      "$dialog.Description = 'Select the local Git repository'",
      "$dialog.ShowNewFolderButton = $true",
      "if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { $dialog.SelectedPath }"
    ].join("; ");
    const { stdout } = await executeFile(
      "powershell.exe",
      ["-NoProfile", "-STA", "-Command", script],
      { timeout: 120_000, windowsHide: false }
    );
    const path = stdout.trim();
    if (!path)
      throw new AppError({
        code: "FOLDER_SELECTION_CANCELED",
        message: "Folder selection was canceled.",
        statusCode: 400
      });
    return { path };
  }
}

function mapSettingsRow(row: {
  base_url: string;
  name: string;
  provider: string;
  repository_slug: string;
  status: string;
  uuid: string;
}) {
  return {
    baseUrl: row.base_url,
    id: row.uuid,
    name: row.name,
    provider: row.provider,
    repositorySlug: row.repository_slug,
    status: row.status
  };
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/u, "");
}
