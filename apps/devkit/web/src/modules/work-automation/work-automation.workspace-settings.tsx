import { ArrowLeftIcon, FolderGit2Icon, FolderOpenIcon, GitForkIcon } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@codexsun/ui/components/button";
import { Input } from "@codexsun/ui/components/input";
import { WorkspaceSelect } from "@codexsun/ui/workspace/select";
import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import { useGithubProject } from "../github-dashboard";
import { useProjectManagerMutations } from "../project-manager/project-manager.hooks";
import { formFromRecord, payloadFromForm } from "../project-manager/project-manager.schema";
import type { ProjectManagerRecord } from "../project-manager/project-manager.types";
import { useDeveloperRepositories } from "../repository-settings";
import { selectLocalRepositoryFolder } from "../repository-settings/repository-settings.services";

type WorkspaceMode = "github" | "repository";

export function ProjectWorkspaceSettings({
  project,
  onBack
}: {
  project: ProjectManagerRecord;
  onBack(): void;
}) {
  const mutations = useProjectManagerMutations("project");
  const repositories = useDeveloperRepositories();
  const [mode, setMode] = useState<WorkspaceMode>(
    project.referenceType === "github" ? "github" : "repository"
  );
  const initialRepository = repositories.data?.find((item) => item.id === project.repositoryUrl);
  const [repositoryId, setRepositoryId] = useState(project.repositoryUrl);
  const [repositoryName, setRepositoryName] = useState(
    project.repositoryName || initialRepository?.name || ""
  );
  const [workspaceTarget, setWorkspaceTarget] = useState(project.referenceId);
  const [picking, setPicking] = useState(false);
  const source = useGithubProject(repositoryName || null);
  const saving = mutations.update.isPending;
  const selectedRepository = useMemo(
    () => repositories.data?.find((item) => item.id === repositoryId),
    [repositories.data, repositoryId]
  );

  const chooseFolder = async () => {
    setPicking(true);
    try {
      const result = await selectLocalRepositoryFolder();
      setWorkspaceTarget(result.path);
      if (mode === "repository" && !repositoryName) setRepositoryName(inferredName(result.path));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Folder could not be selected.");
    } finally {
      setPicking(false);
    }
  };
  const save = async () => {
    if (!workspaceTarget.trim() || (mode === "github" && !repositoryId)) {
      toast.error(
        mode === "github"
          ? "Select a repository and destination folder."
          : "Select a local repository folder."
      );
      return;
    }
    const resolvedName =
      mode === "github"
        ? (selectedRepository?.name ?? repositoryName)
        : repositoryName || inferredName(workspaceTarget);
    try {
      await mutations.update.mutateAsync({
        id: project.id,
        payload: payloadFromForm({
          ...formFromRecord(project),
          referenceId: workspaceTarget,
          referenceType: mode,
          repositoryName: resolvedName,
          repositoryUrl: mode === "github" ? repositoryId : ""
        })
      });
      toast.success("Workspace mapping saved.");
      onBack();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Workspace could not be saved.");
    }
  };

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      <div className="flex items-start gap-3">
        <Button size="sm" variant="ghost" onClick={onBack}>
          <ArrowLeftIcon className="size-4" /> Back
        </Button>
        <div>
          <h2 className="text-xl font-semibold">Workspace settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Map this project to a local folder or an approved repository.
          </p>
        </div>
      </div>
      <section className="rounded-xl border bg-card p-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="grid gap-5">
            <Field label="Workspace source">
              <div className="grid grid-cols-2 gap-2">
                <Choice
                  active={mode === "repository"}
                  icon={FolderGit2Icon}
                  label="Local folder"
                  onClick={() => setMode("repository")}
                />
                <Choice
                  active={mode === "github"}
                  icon={GitForkIcon}
                  label="Repository catalog"
                  onClick={() => setMode("github")}
                />
              </div>
            </Field>
            {mode === "github" ? (
              <Field label="Repository">
                <WorkspaceSelect
                  value={repositoryId}
                  options={(repositories.data ?? []).map((item) => ({
                    label: item.name,
                    value: item.id
                  }))}
                  placeholder="Select an approved repository"
                  onValueChange={(id) => {
                    setRepositoryId(id);
                    setRepositoryName(
                      repositories.data?.find((item) => item.id === id)?.name ?? ""
                    );
                  }}
                />
                <span className="text-xs font-normal text-muted-foreground">
                  Git server addresses are managed in Repository Connections and are not shown here.
                </span>
              </Field>
            ) : null}
            <Field label={mode === "github" ? "Clone destination" : "Local repository folder"}>
              <div className="flex gap-2">
                <Input
                  readOnly
                  className="flex-1"
                  placeholder="Choose a folder from this computer"
                  value={workspaceTarget}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={picking}
                  onClick={() => void chooseFolder()}
                >
                  <FolderOpenIcon className="size-4" /> {picking ? "Opening..." : "Browse"}
                </Button>
              </div>
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onBack}>
                Cancel
              </Button>
              <Button disabled={saving} onClick={() => void save()}>
                {saving ? "Saving..." : "Save workspace"}
              </Button>
            </div>
          </div>
          <aside className="rounded-lg bg-muted/40 p-5">
            <div className="flex items-center gap-2">
              <FolderGit2Icon className="size-4 text-muted-foreground" />
              <span className="font-medium">Repository status</span>
            </div>
            <div className="mt-5 grid gap-4 text-sm">
              <StatusLine
                label="Mapping"
                value={project.referenceId ? "Connected" : "Not connected"}
                good={Boolean(project.referenceId)}
              />
              <StatusLine
                label="Repository"
                value={repositoryName || inferredName(workspaceTarget) || "Not selected"}
              />
              <StatusLine
                label="Git status"
                value={
                  source.data ? source.data.status : source.isLoading ? "Checking" : "Not detected"
                }
                good={source.data?.status === "healthy"}
              />
              <StatusLine label="Branch" value={source.data?.branch || "Not detected"} />
              <StatusLine
                label="Changed files"
                value={source.data ? String(source.data.changedFiles) : "-"}
              />
            </div>
          </aside>
        </div>
      </section>
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
function Choice({
  active,
  icon: Icon,
  label,
  onClick
}: {
  active: boolean;
  icon: typeof FolderGit2Icon;
  label: string;
  onClick(): void;
}) {
  return (
    <button
      className={`flex items-center gap-2 rounded-md border px-4 py-3 text-left text-sm font-medium transition-colors ${active ? "border-primary bg-primary/5 text-primary" : "hover:bg-muted"}`}
      type="button"
      onClick={onClick}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}
function StatusLine({ good, label, value }: { good?: boolean; label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-center justify-between gap-2 font-medium">
        <span className="truncate">{value}</span>
        {good === undefined ? null : (
          <WorkspaceStatusBadge
            label={good ? "Ready" : "Pending"}
            tone={good ? "success" : "warning"}
          />
        )}
      </div>
    </div>
  );
}
function inferredName(value: string) {
  return (
    value
      .trim()
      .replace(/\.git$/u, "")
      .split(/[\\/]/u)
      .filter(Boolean)
      .at(-1) ?? ""
  );
}
