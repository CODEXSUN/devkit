import { Ionicons } from "@expo/vector-icons";
import type { CoworkerProject } from "@codexsun/coworker-chat";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  type MobileProject,
  type MobileRepository,
  ProjectClient,
  providerLabel
} from "./project-client";

type ProjectListItem =
  | { id: string; kind: "project"; project: MobileProject }
  | { id: string; kind: "repository"; repository: MobileRepository };

export function ProjectsPage({
  apiUrl,
  token,
  onConnect,
  onOpen
}: {
  apiUrl: string;
  token: string;
  onConnect: (project: CoworkerProject) => void;
  onOpen: (project: CoworkerProject) => void;
}) {
  const client = useMemo(() => new ProjectClient(apiUrl, token), [apiUrl, token]);
  const [projects, setProjects] = useState<MobileProject[]>([]);
  const [repositories, setRepositories] = useState<MobileRepository[]>([]);
  const [connectingId, setConnectingId] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [projectName, setProjectName] = useState("");

  useEffect(() => {
    void client
      .overview()
      .then((overview) => {
        setProjects(overview.projects.filter((project) => project.active));
        setRepositories(overview.repositories);
      })
      .catch((reason: unknown) => setError(messageOf(reason)))
      .finally(() => setLoading(false));
  }, [client]);

  const cards = useMemo(() => buildCards(projects, repositories), [projects, repositories]);

  async function connect(repository: MobileRepository) {
    setConnectingId(repository.id);
    setError("");
    try {
      const project = await client.connect(repository);
      setProjects((current) => [project, ...current]);
      onConnect(project);
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setConnectingId(undefined);
    }
  }

  async function createProject() {
    if (!projectName.trim()) return;
    setConnectingId("new-project");
    setError("");
    try {
      const project = await client.create(projectName.trim());
      setProjects((current) => [project, ...current]);
      onConnect(project);
      setProjectName("");
      setAdding(false);
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setConnectingId(undefined);
    }
  }

  return (
    <View style={styles.page}>
      <View style={styles.heading}>
        <View>
          <Text style={styles.title}>Projects</Text>
          <Text style={styles.subtitle}>Connected work and available repositories</Text>
        </View>
        <View style={styles.headingActions}><View style={styles.summary}>
          <Text style={styles.summaryValue}>{projects.length}</Text>
          <Text style={styles.summaryLabel}>connected</Text>
        </View><Pressable accessibilityLabel="Add project or repository" onPress={() => setAdding((open) => !open)} style={styles.addButton}><Ionicons color="#fff" name={adding ? "close" : "add"} size={20} /></Pressable></View>
      </View>
      {adding ? <View style={styles.createPanel}><TextInput onChangeText={setProjectName} placeholder="New project name" placeholderTextColor="#85857e" style={styles.createInput} value={projectName} /><Pressable disabled={!projectName.trim() || connectingId === "new-project"} onPress={() => void createProject()} style={styles.createButton}><Text style={styles.createButtonText}>Create</Text></Pressable><Text style={styles.repositoryHint}>Or choose an available repository below.</Text></View> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#242421" />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={cards.length ? styles.list : styles.emptyList}
          data={cards}
          keyExtractor={(card) => card.id}
          ListEmptyComponent={<Text style={styles.empty}>No projects or repositories found.</Text>}
          renderItem={({ item }) =>
            item.kind === "project" ? (
              <ProjectCard onOpen={() => onOpen(item.project)} project={item.project} />
            ) : (
              <RepositoryCard
                busy={connectingId === item.repository.id}
                onConnect={() => void connect(item.repository)}
                repository={item.repository}
              />
            )
          }
        />
      )}
    </View>
  );
}

function ProjectCard({ project, onOpen }: { project: MobileProject; onOpen: () => void }) {
  return (
    <Pressable onPress={onOpen} style={styles.card}>
      <View style={styles.cardIcon}>
        <Ionicons color="#242421" name="folder-open-outline" size={22} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text numberOfLines={1} style={styles.cardTitle}>
            {project.title}
          </Text>
          <StatusBadge label="Connected" />
        </View>
        <Text numberOfLines={2} style={styles.description}>
          {project.description || "Project workspace ready for chat, todos, and planning."}
        </Text>
        <View style={styles.details}>
          <Detail icon="git-branch-outline" label={project.repositoryName || "No repository"} />
          <Detail icon="pulse-outline" label={project.status || "active"} />
        </View>
      </View>
      <Ionicons color="#8a8a83" name="chevron-forward" size={19} />
    </Pressable>
  );
}

function RepositoryCard({
  repository,
  busy,
  onConnect
}: {
  repository: MobileRepository;
  busy: boolean;
  onConnect: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={[styles.cardIcon, styles.repositoryIcon]}>
        <Ionicons color="#55554f" name="git-network-outline" size={22} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTitleRow}>
          <Text numberOfLines={1} style={styles.cardTitle}>
            {repository.name}
          </Text>
          <StatusBadge label="Repository" muted />
        </View>
        <Text style={styles.description}>
          {providerLabel(repository.provider)} · available to connect
        </Text>
        <Pressable disabled={busy} onPress={onConnect} style={styles.connectButton}>
          {busy ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons color="#fff" name="link-outline" size={17} />
              <Text style={styles.connectText}>Connect project</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function Detail({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.detail}>
      <Ionicons color="#85857e" name={icon} size={14} />
      <Text numberOfLines={1} style={styles.detailText}>
        {label}
      </Text>
    </View>
  );
}

function StatusBadge({ label, muted = false }: { label: string; muted?: boolean }) {
  return (
    <View style={[styles.badge, muted && styles.badgeMuted]}>
      <Text style={[styles.badgeText, muted && styles.badgeTextMuted]}>{label}</Text>
    </View>
  );
}

function buildCards(projects: MobileProject[], repositories: MobileRepository[]): ProjectListItem[] {
  const connectedNames = new Set(
    projects.flatMap((project) => [project.repositoryName, project.title]).map(normalizeName)
  );
  return [
    ...projects.map((project) => ({ id: `project:${project.id}`, kind: "project" as const, project })),
    ...repositories
      .filter((repository) => !connectedNames.has(normalizeName(repository.name)))
      .map((repository) => ({
        id: `repository:${repository.id}`,
        kind: "repository" as const,
        repository
      }))
  ];
}

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

function messageOf(reason: unknown) {
  return reason instanceof Error ? reason.message : "Projects could not be loaded.";
}

const styles = StyleSheet.create({
  addButton: { alignItems: "center", backgroundColor: "#242421", borderRadius: 9, height: 34, justifyContent: "center", width: 34 },
  badge: { backgroundColor: "#e4f3e8", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  badgeMuted: { backgroundColor: "#efefe9" },
  badgeText: { color: "#267144", fontSize: 11, fontWeight: "700" },
  badgeTextMuted: { color: "#696963" },
  card: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#e2e2dc",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 126,
    padding: 14,
    width: "100%"
  },
  cardBody: { flex: 1, minWidth: 0 },
  cardIcon: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#efefe9",
    borderRadius: 11,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  cardTitle: { color: "#242421", flex: 1, fontSize: 16, fontWeight: "700" },
  cardTitleRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  connectButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#242421",
    borderRadius: 9,
    flexDirection: "row",
    gap: 7,
    height: 34,
    justifyContent: "center",
    marginTop: 10,
    minWidth: 138,
    paddingHorizontal: 11
  },
  connectText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  createButton: { alignItems: "center", backgroundColor: "#242421", borderRadius: 8, height: 36, justifyContent: "center", width: 78 },
  createButtonText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  createInput: { borderColor: "#deded8", borderRadius: 8, borderWidth: 1, color: "#242421", flex: 1, fontSize: 14, height: 36, paddingHorizontal: 10 },
  createPanel: { alignItems: "center", backgroundColor: "#fff", borderColor: "#e2e2dc", borderRadius: 12, borderWidth: 1, flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 11 },
  description: { color: "#6f6f68", fontSize: 13, lineHeight: 19, paddingTop: 6 },
  detail: { alignItems: "center", flexDirection: "row", gap: 5, maxWidth: "48%" },
  details: { flexDirection: "row", gap: 14, paddingTop: 10 },
  detailText: { color: "#85857e", flexShrink: 1, fontSize: 12 },
  empty: { color: "#777770", fontSize: 15, textAlign: "center" },
  emptyList: { flexGrow: 1, justifyContent: "center" },
  error: { color: "#b53b35", fontSize: 14 },
  heading: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between" },
  headingActions: { alignItems: "center", flexDirection: "row", gap: 10 },
  list: { gap: 10, paddingBottom: 26, paddingTop: 4 },
  loading: { alignItems: "center", flex: 1, justifyContent: "center" },
  page: { flex: 1, gap: 16, paddingHorizontal: 16, paddingTop: 22 },
  repositoryIcon: { backgroundColor: "#f4f4f0" },
  repositoryHint: { color: "#85857e", fontSize: 11, width: "100%" },
  subtitle: { color: "#777770", fontSize: 13, paddingTop: 4 },
  summary: { alignItems: "flex-end" },
  summaryLabel: { color: "#85857e", fontSize: 11 },
  summaryValue: { color: "#242421", fontSize: 20, fontWeight: "700" },
  title: { color: "#242421", fontSize: 27, fontWeight: "700", letterSpacing: -0.8 }
});
