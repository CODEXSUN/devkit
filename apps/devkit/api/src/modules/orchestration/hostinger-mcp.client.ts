import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { AppError } from "@codexsun/framework/errors";
import { z } from "zod";
import {
  hostingerApiToken,
  hostingerMcpCommand,
  hostingerMcpPackage
} from "./hostinger-mcp.config.js";

export class HostingerMcpClient {
  private client: Client | null = null;
  private startup: Promise<Client> | null = null;

  async callTool<T>(name: string, input: Record<string, unknown>): Promise<T> {
    const client = await this.ensureClient();
    try {
      const result = z
        .object({ content: z.array(z.unknown()) })
        .parse(await client.callTool({ name, arguments: input }));
      const text = result.content.find(isTextContent)?.text;
      if (!text) throw new Error(`Hostinger MCP returned no data for ${name}.`);
      return JSON.parse(text) as T;
    } catch (error) {
      await this.reset();
      throw new AppError({
        code: "HOSTINGER_MCP_REQUEST_FAILED",
        message: error instanceof Error ? error.message : "Hostinger MCP request failed.",
        statusCode: 502
      });
    }
  }

  private async ensureClient() {
    if (this.client) return this.client;
    if (!this.startup) this.startup = this.connect();
    try {
      return await this.startup;
    } finally {
      this.startup = null;
    }
  }

  private async connect() {
    const token = hostingerApiToken();
    if (!token) {
      throw AppError.validation("Set HOSTINGER_API_TOKEN in the server .env.");
    }
    const client = new Client({ name: "codelogicx-devkit", version: "1.0.25" });
    const transport = new StdioClientTransport({
      command: hostingerMcpCommand(),
      args: ["--yes", `--package=${hostingerMcpPackage()}`, "hostinger-vps-mcp"],
      env: processEnvironment(token),
      stderr: "pipe"
    });
    await client.connect(transport);
    this.client = client;
    return client;
  }

  private async reset() {
    const client = this.client;
    this.client = null;
    if (client) await client.close().catch(() => undefined);
  }
}

function isTextContent(value: unknown): value is { text: string; type: "text" } {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "text" &&
    "text" in value &&
    typeof value.text === "string"
  );
}

function processEnvironment(token: string) {
  const environment = Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => Boolean(entry[1]))
  );
  return { ...environment, HOSTINGER_API_TOKEN: token };
}

export const hostingerMcpClient = new HostingerMcpClient();
