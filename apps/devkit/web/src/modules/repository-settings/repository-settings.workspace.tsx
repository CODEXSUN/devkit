import { GitBranchIcon, PlusIcon, ServerIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@codexsun/ui/components/button";
import { Input } from "@codexsun/ui/components/input";
import { WorkspaceSelect } from "@codexsun/ui/workspace/select";
import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import {
  useRepositoryConnectionMutations,
  useRepositoryConnections
} from "./repository-settings.hooks";
import type { RepositoryConnection, RepositoryConnectionInput } from "./repository-settings.types";

const emptyForm: RepositoryConnectionInput = {
  baseUrl: "https://github.com",
  name: "",
  provider: "github",
  repositorySlug: "",
  status: "active"
};

export function RepositorySettingsWorkspace() {
  const connections = useRepositoryConnections();
  const mutations = useRepositoryConnectionMutations();
  const [editingId, setEditingId] = useState<string>();
  const [form, setForm] = useState(emptyForm);
  const saving = mutations.create.isPending || mutations.update.isPending;

  const edit = (connection?: RepositoryConnection) => {
    setEditingId(connection?.id);
    setForm(connection ? { ...connection } : emptyForm);
  };
  const save = async () => {
    if (!form.name.trim() || !form.baseUrl.trim() || !form.repositorySlug.trim()) {
      toast.error("Name, base URL, and repository path are required.");
      return;
    }
    try {
      if (editingId) await mutations.update.mutateAsync({ id: editingId, input: form });
      else await mutations.create.mutateAsync(form);
      toast.success(editingId ? "Repository updated." : "Repository added.");
      edit();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Repository could not be saved.");
    }
  };

  return (
    <div className="grid h-full min-h-0 grid-rows-[auto_1fr]">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="font-semibold">Repository connections</h1>
          <p className="text-xs text-muted-foreground">
            Define repository names once. Developers never need the Git server address.
          </p>
        </div>
        <Button size="sm" onClick={() => edit()}>
          <PlusIcon className="size-4" /> Add repository
        </Button>
      </header>
      <div className="grid min-h-0 gap-8 overflow-auto p-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section>
          <div className="grid gap-2">
            {(connections.data ?? []).map((connection) => (
              <button
                key={connection.id}
                className="flex w-full items-center gap-4 rounded-lg px-4 py-3 text-left transition-colors hover:bg-muted/60"
                type="button"
                onClick={() => edit(connection)}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted">
                  <GitBranchIcon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{connection.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {connection.provider === "github" ? "GitHub" : "Private Git"} ·{" "}
                    {connection.repositorySlug}
                  </span>
                </span>
                <WorkspaceStatusBadge
                  label={connection.status === "active" ? "Available" : "Disabled"}
                  tone={connection.status === "active" ? "success" : "neutral"}
                />
              </button>
            ))}
            {!connections.isLoading && !connections.data?.length ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                No repository connections are defined.
              </div>
            ) : null}
          </div>
        </section>
        <aside className="self-start rounded-xl border bg-card p-5">
          <div className="flex items-center gap-2">
            <ServerIcon className="size-4" />
            <h2 className="font-medium">{editingId ? "Edit repository" : "New repository"}</h2>
          </div>
          <div className="mt-5 grid gap-4">
            <Field label="Developer-facing name">
              <Input
                value={form.name}
                placeholder="DevKit"
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </Field>
            <Field label="Git provider">
              <WorkspaceSelect
                value={form.provider}
                options={[
                  { label: "GitHub", value: "github" },
                  { label: "Private Git", value: "private-git" }
                ]}
                onValueChange={(provider) =>
                  setForm({ ...form, provider: provider as RepositoryConnectionInput["provider"] })
                }
              />
            </Field>
            <Field label="Private base URL">
              <Input
                value={form.baseUrl}
                placeholder="https://git.company.internal"
                onChange={(event) => setForm({ ...form, baseUrl: event.target.value })}
              />
            </Field>
            <Field label="Repository path">
              <Input
                value={form.repositorySlug}
                placeholder="codexsun/devkit"
                onChange={(event) => setForm({ ...form, repositorySlug: event.target.value })}
              />
            </Field>
            <Field label="Availability">
              <WorkspaceSelect
                value={form.status}
                options={[
                  { label: "Available", value: "active" },
                  { label: "Disabled", value: "inactive" }
                ]}
                onValueChange={(status) =>
                  setForm({ ...form, status: status as RepositoryConnectionInput["status"] })
                }
              />
            </Field>
            <Button disabled={saving} onClick={() => void save()}>
              {saving ? "Saving..." : "Save repository"}
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
  );
}
