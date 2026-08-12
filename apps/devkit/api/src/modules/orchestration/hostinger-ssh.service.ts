import { execFile } from "node:child_process";
import { chmod, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { AppError } from "@codexsun/framework/errors";
import { z } from "zod";
import { hostingerMcpClient } from "./hostinger-mcp.client.js";

const execFileAsync = promisify(execFile);
const publicKeyListSchema = z.object({ data: z.array(z.object({ id: z.number(), name: z.string() }).passthrough()) });
const publicKeySchema = z.object({ id: z.number(), name: z.string() }).passthrough();

export type HostingerSshTarget = { host: string; name: string; port: number; user: string; virtualMachineId: number };

export class HostingerSshService {
  async status(target: HostingerSshTarget) {
    const paths = keyPaths(target.virtualMachineId);
    const generated = await fileExists(paths.privateKey) && await fileExists(paths.publicKey);
    return {
      attached: await fileExists(paths.attachment), connected: false,
      fingerprint: generated ? await fingerprint(paths.publicKey) : null,
      generated, host: target.host, keyName: target.name, lastError: null,
      port: target.port, user: target.user, virtualMachineId: target.virtualMachineId
    };
  }

  async generateAndAttach(target: HostingerSshTarget) {
    const paths = keyPaths(target.virtualMachineId);
    await mkdir(paths.directory, { recursive: true });
    if (!await fileExists(paths.privateKey)) {
      await execFileAsync("ssh-keygen", ["-q", "-t", "ed25519", "-N", "", "-C", target.name, "-f", paths.privateKey], executionOptions());
      await chmod(paths.privateKey, 0o600);
      await chmod(paths.publicKey, 0o644);
    }
    const key = (await readFile(paths.publicKey, "utf8")).trim();
    const existing = publicKeyListSchema.parse(await hostingerMcpClient.callTool("VPS_getPublicKeysV1", {}))
      .data.find((candidate) => candidate.name === target.name);
    const registered = existing ?? publicKeySchema.parse(
      await hostingerMcpClient.callTool("VPS_createPublicKeyV1", { key, name: target.name })
    );
    await hostingerMcpClient.callTool("VPS_attachPublicKeyV1", { ids: [registered.id], virtualMachineId: target.virtualMachineId });
    await writeFile(paths.attachment, JSON.stringify({ attachedAt: new Date().toISOString(), keyId: registered.id, keyName: target.name }), { mode: 0o600 });
    return this.status(target);
  }

  async test(target: HostingerSshTarget) {
    const paths = keyPaths(target.virtualMachineId);
    if (!await fileExists(paths.privateKey)) throw AppError.validation("Generate and attach the SSH key first.");
    try {
      const { stdout } = await execFileAsync("ssh", [
        "-i", paths.privateKey, "-p", String(target.port),
        "-o", "BatchMode=yes", "-o", "ConnectTimeout=12",
        "-o", `UserKnownHostsFile=${paths.knownHosts}`, "-o", "StrictHostKeyChecking=accept-new",
        `${target.user}@${target.host}`,
        "printf 'connected=true\\nhost='; hostname; printf 'user='; id -un; test -d /home/devkit && printf 'devkitPath=present\\n' || printf 'devkitPath=missing\\n'"
      ], executionOptions(20_000));
      return { ...await this.status(target), attached: true, connected: true, evidence: parseEvidence(stdout) };
    } catch (error) {
      return { ...await this.status(target), attached: true, connected: false, evidence: null, lastError: commandError(error) };
    }
  }
}

function keyPaths(virtualMachineId: number) {
  const directory = resolve(process.env.DEVKIT_STORAGE_PATH?.trim() || join(process.cwd(), "storage", "devkit"), "hostinger-ssh");
  const privateKey = join(directory, `vps-${virtualMachineId}-ed25519`);
  return {
    attachment: join(directory, `vps-${virtualMachineId}-attachment.json`),
    directory,
    knownHosts: join(directory, "known_hosts"),
    privateKey,
    publicKey: `${privateKey}.pub`
  };
}

async function fingerprint(publicKeyPath: string) {
  const { stdout } = await execFileAsync("ssh-keygen", ["-lf", publicKeyPath, "-E", "sha256"], executionOptions());
  return stdout.trim().split(/\s+/u)[1] ?? null;
}

async function fileExists(path: string) {
  return stat(path).then(() => true).catch(() => false);
}

function parseEvidence(output: string) {
  return Object.fromEntries(output.trim().split(/\r?\n/u).map((line) => {
    const separator = line.indexOf("=");
    return separator < 0 ? [line, ""] : [line.slice(0, separator), line.slice(separator + 1)];
  }));
}

function commandError(error: unknown) {
  if (!error || typeof error !== "object") return "SSH connection failed.";
  const candidate = error as { message?: string; stderr?: string };
  return (candidate.stderr || candidate.message || "SSH connection failed.").trim().slice(0, 500);
}

function executionOptions(timeout = 30_000) {
  return { timeout, windowsHide: true } as const;
}

export const hostingerSshService = new HostingerSshService();
