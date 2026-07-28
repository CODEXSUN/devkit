import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  WorkspaceStatusBadge,
} from "@codexsun/ui";
import {
  CloudDownloadIcon,
  CloudUploadIcon,
  CopyIcon,
  KeyRoundIcon,
  LinkIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSyncActions, useSyncStatus } from "./sync.hooks";

export function SyncOverview() {
  const status = useSyncStatus();
  const actions = useSyncActions();
  const [instanceId, setInstanceId] = useState("");
  const [token, setToken] = useState("");
  const [label, setLabel] = useState("");
  const [generatedToken, setGeneratedToken] = useState("");
  const sync = status.data;

  if (sync?.role === "disabled") return null;

  const failure = (error: unknown, fallback: string) =>
    toast.error(error instanceof Error ? error.message : fallback);

  const bind = async () => {
    try {
      await actions.bind.mutateAsync({ instanceId, token });
      setToken("");
      toast.success("This DevKit installation is bound to the cloud.");
    } catch (error) {
      failure(error, "Cloud binding failed.");
    }
  };

  const publish = async () => {
    try {
      const result = await actions.publish.mutateAsync();
      toast.success(`Published revision ${result.revision} to DevKit Cloud.`);
    } catch (error) {
      failure(error, "DevKit publish failed.");
    }
  };

  const pull = async () => {
    try {
      const result = await actions.pull.mutateAsync();
      toast.success(
        `Pulled revision ${result.revision} with ${result.records} records.`,
      );
      window.location.reload();
    } catch (error) {
      failure(error, "DevKit pull failed.");
    }
  };

  const generate = async () => {
    try {
      const result = await actions.generate.mutateAsync(label);
      setGeneratedToken(result.token);
      toast.success("A new one-time-visible binding token was generated.");
    } catch (error) {
      failure(error, "Token generation failed.");
    }
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold">DevKit Cloud</h2>
              <WorkspaceStatusBadge
                label={sync?.status ?? "Loading"}
                tone={
                  sync?.status === "bound"
                    ? "success"
                    : sync?.status === "conflict"
                      ? "danger"
                      : "warning"
                }
              />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {sync?.cloudUrl ?? "https://devkit.codexsun.com"} · Revision{" "}
              {sync?.remoteRevision ?? 0} · {sync?.pendingRecords ?? 0} pending
            </p>
          </div>
          {sync?.role === "local" && sync.bound ? (
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={actions.pull.isPending}
                icon={<CloudDownloadIcon />}
                onClick={() => void pull()}
                variant="outline"
              >
                Pull Latest
              </Button>
              <Button
                disabled={actions.publish.isPending}
                icon={<CloudUploadIcon />}
                onClick={() => void publish()}
              >
                Publish Live
              </Button>
            </div>
          ) : null}
        </div>

        {sync?.lastError ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {sync.lastError}
          </p>
        ) : null}

        {sync?.role === "local" && !sync.bound ? (
          <div className="grid gap-3 border-t pt-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div className="space-y-2">
              <Label htmlFor="sync-instance">Installation ID</Label>
              <Input
                id="sync-instance"
                onChange={(event) => setInstanceId(event.target.value)}
                placeholder="home-office"
                value={instanceId}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sync-token">Cloud token</Label>
              <Input
                id="sync-token"
                maxLength={16}
                onChange={(event) => setToken(event.target.value)}
                placeholder="Paste 16-character token"
                type="password"
                value={token}
              />
            </div>
            <Button
              disabled={
                actions.bind.isPending ||
                instanceId.trim().length < 2 ||
                token.trim().length !== 16
              }
              icon={<LinkIcon />}
              onClick={() => void bind()}
            >
              Bind Cloud
            </Button>
          </div>
        ) : null}

        {sync?.role === "cloud" ? (
          <div className="space-y-3 border-t pt-4">
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-64 flex-1 space-y-2">
                <Label htmlFor="sync-label">Installation label</Label>
                <Input
                  id="sync-label"
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="Office workstation"
                  value={label}
                />
              </div>
              <Button
                disabled={actions.generate.isPending || !label.trim()}
                icon={<KeyRoundIcon />}
                onClick={() => void generate()}
              >
                Generate 16-character token
              </Button>
            </div>
            {generatedToken ? (
              <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-3">
                <code className="text-base font-semibold tracking-widest">
                  {generatedToken}
                </code>
                <Button
                  icon={<CopyIcon />}
                  onClick={() => {
                    void navigator.clipboard.writeText(generatedToken);
                    toast.success("Token copied. It will not be shown again.");
                  }}
                  size="sm"
                  variant="outline"
                >
                  Copy
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
