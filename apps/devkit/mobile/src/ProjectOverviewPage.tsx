import { CoworkerClient, type CoworkerProject, type CoworkerProjectRecord } from "@codexsun/coworker-chat";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

const tabs = ["Overview", "Ideas", "Modules", "Tasks", "Actions", "Reviews", "Architect", "Chang log"] as const;
type ProjectTab = (typeof tabs)[number];

export function ProjectOverviewPage({ apiUrl, project, token }: { apiUrl: string; project: CoworkerProject; token: string }) {
  const [activeTab, setActiveTab] = useState<ProjectTab>("Overview");
  const [records, setRecords] = useState<CoworkerProjectRecord[]>([]);
  const client = useMemo(() => new CoworkerClient(apiUrl, () => token), [apiUrl, token]);
  useEffect(() => { void Promise.all(["discussion", "task", "activity", "review", "release"].map((kind) => client.projectRecords(kind))).then((groups) => setRecords(groups.flat())).catch(() => setRecords([])); }, [client]);
  const scoped = records.filter((record) => record.referenceId === project.id || record.referenceId === project.key);
  return <View style={styles.shell}><ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={styles.tabContent}>{tabs.map((tab) => <Text accessibilityRole="button" key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && styles.activeTab]}>{tab}</Text>)}</ScrollView><ScrollView contentContainerStyle={styles.content}><TabContent activeTab={activeTab} project={project} records={scoped} /></ScrollView></View>;
}

function TabContent({ activeTab, project, records }: { activeTab: ProjectTab; project: CoworkerProject; records: CoworkerProjectRecord[] }) {
  if (activeTab === "Overview") return <Overview project={project} />;
  if (activeTab === "Modules") return <List rows={[[project.moduleKey || "DevKit", project.description || "Project-owned module"]]} />;
  if (activeTab === "Architect") return <List rows={[["Application boundary", project.moduleKey || "Project module"], ["Source", project.repositoryName || "Repository not connected"], ["Workspace", project.referenceId || "Connected"]]} />;
  const kind = { Ideas: "discussion", Tasks: "task", Actions: "activity", Reviews: "review", "Chang log": "release" }[activeTab];
  const matching = records.filter((record) => record.kind === kind);
  return matching.length ? <List rows={matching.map((record) => [record.title, record.description || record.status])} /> : <Empty tab={activeTab} />;
}

function Overview({ project }: { project: CoworkerProject }) { return <List rows={[["Project", project.title], ["Repository", project.repositoryName || project.key], ["Status", project.status || "Active"], ["Module", project.moduleKey || "DevKit"], ["Workspace", project.referenceId || "Connected"]]} />; }
function List({ rows }: { rows: string[][] }) { return <View>{rows.map(([label, value]) => <View key={label} style={styles.row}><Text style={styles.label}>{label}</Text><Text numberOfLines={2} style={styles.value}>{value}</Text></View>)}</View>; }
function Empty({ tab }: { tab: ProjectTab }) { const copy = tab === "Ideas" ? "No project ideas yet. Project ideas can connect to global ideas." : `No ${tab.toLowerCase()} details yet.`; return <Text style={styles.empty}>{copy}</Text>; }

const styles = StyleSheet.create({
  activeTab: { borderBottomColor: "#242421", color: "#242421" },
  content: { paddingBottom: 28, paddingTop: 10 },
  empty: { color: "#777770", fontSize: 14, paddingVertical: 42, textAlign: "center" },
  label: { color: "#777770", fontSize: 12 },
  row: { borderBottomColor: "#e2e2dc", borderBottomWidth: 1, gap: 5, paddingVertical: 14 },
  shell: { alignSelf: "center", flex: 1, width: "80%" },
  tab: { borderBottomColor: "transparent", borderBottomWidth: 2, color: "#777770", fontSize: 13, fontWeight: "600", paddingBottom: 7, paddingTop: 7 },
  tabContent: { gap: 20 },
  tabs: { borderBottomColor: "#e2e2dc", borderBottomWidth: 1, flexGrow: 0 },
  value: { color: "#242421", fontSize: 14, fontWeight: "700" }
});
