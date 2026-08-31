import { Ionicons } from "@expo/vector-icons";
import {
  CoworkerClient,
  type CoworkerChatRecord,
  type CoworkerMessage,
  type CoworkerProject
} from "@codexsun/coworker-chat";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View
} from "react-native";
import { sessionStorage } from "./session-storage";
import logoImage from "../assets/logo.png";
import { resolveApiUrl } from "./api-url";
import { MobileDrawer, type MobileScreen } from "./MobileDrawer";
import { ProjectOverviewPage } from "./ProjectOverviewPage";
import { ConnectionServicePage } from "./ConnectionServicePage";
import { DocsPage } from "./DocsPage";
import { ArchivedChatsPage } from "./ArchivedChatsPage";
import { TodoPage } from "./TodoPage";
import { ProjectsPage } from "./ProjectsPage";
import { MessengerMobile } from "./MessengerMobile";

const API_URL = resolveApiUrl();

export function CoworkerMobileApp() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void sessionStorage
      .get()
      .then(setToken)
      .finally(() => setLoading(false));
  }, []);
  if (loading) return <CenteredSpinner />;
  return token ? (
    <MobileHome onSessionExpired={() => setToken(null)} token={token} />
  ) : (
    <Login onLogin={setToken} />
  );
}

function MobileHome({ onSessionExpired, token }: { onSessionExpired: () => void; token: string }) {
  const [aiOpen, setAiOpen] = useState(false);
  useEffect(() => {
    let disposed = false;
    void fetch(`${API_URL}/auth/session`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (disposed || response.ok || response.status !== 401) return;
        await sessionStorage.clear();
        if (!disposed) onSessionExpired();
      })
      .catch(() => undefined);
    return () => {
      disposed = true;
    };
  }, [onSessionExpired, token]);
  return aiOpen ? (
    <NativeChat onOpenMessenger={() => setAiOpen(false)} token={token} />
  ) : (
    <MessengerMobile apiUrl={API_URL} onOpenAi={() => setAiOpen(true)} token={token} />
  );
}

function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const client = useMemo(() => new CoworkerClient(API_URL, () => null), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const session = await client.login(email.trim(), password);
      await sessionStorage.set(session.accessToken);
      onLogin(session.accessToken);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={[styles.screen, styles.loginScreen]}>
      <View style={styles.login}>
        <Image
          accessibilityLabel="CodeLogicX"
          resizeMode="contain"
          source={logoImage}
          style={styles.loginLogo}
        />
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor="#898981"
          style={styles.field}
          value={email}
        />
        <TextInput
          autoComplete="current-password"
          onChangeText={setPassword}
          onSubmitEditing={() => void submit()}
          placeholder="Password"
          placeholderTextColor="#898981"
          secureTextEntry
          style={styles.field}
          value={password}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          disabled={busy || !email.trim() || !password}
          onPress={() => void submit()}
          style={({ pressed }) => [styles.loginButton, pressed && styles.pressed]}
        >
          <Text style={styles.loginButtonText}>{busy ? "Connecting…" : "Continue"}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function NativeChat({ onOpenMessenger, token }: { onOpenMessenger: () => void; token: string }) {
  const scheme = useColorScheme();
  const dark = scheme === "dark";
  const client = useMemo(() => new CoworkerClient(API_URL, () => token), [token]);
  const [projects, setProjects] = useState<CoworkerProject[]>([]);
  const [chats, setChats] = useState<CoworkerChatRecord[]>([]);
  const [archivedChats, setArchivedChats] = useState<CoworkerChatRecord[]>([]);
  const [project, setProject] = useState<CoworkerProject>();
  const [messages, setMessages] = useState<CoworkerMessage[]>([]);
  const [composer, setComposer] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activityLabel, setActivityLabel] = useState("Understanding your request");
  const [menuOpen, setMenuOpen] = useState(false);
  const [screen, setScreen] = useState<MobileScreen>("chat");
  const list = useRef<FlatList<CoworkerMessage>>(null);

  useEffect(() => {
    void client.projects().then(async (items) => {
      setProjects(items);
      const firstProject = items[0];
      setProject(firstProject);
      if (!firstProject) return;
      const chatItems = await client.chats();
      setChats(chatItems);
      const latest = chatItems.find((chat) => chat.projectUuid === firstProject.id);
      if (!latest) return;
      const detail = await client.chat(latest.uuid);
      setConversationId(detail.uuid);
      setThreadId(detail.codexThreadId);
      setMessages(
        detail.messages.map((message) => ({
          id: message.uuid,
          role: message.role,
          text: message.body
        }))
      );
    });
  }, [client]);

  useEffect(() => {
    if (busy) return;
    const refresh = async () => {
      const chatItems = await client.chats();
      setChats(chatItems);
      if (!conversationId) return;
      const detail = await client.chat(conversationId);
      setThreadId(detail.codexThreadId);
      setMessages(
        detail.messages.map((message) => ({
          id: message.uuid,
          role: message.role,
          text: message.body
        }))
      );
    };
    const timer = setInterval(() => void refresh().catch(() => undefined), 1_500);
    return () => clearInterval(timer);
  }, [busy, client, conversationId]);

  useEffect(() => {
    if (screen !== "archives") return;
    void client
      .archivedChats()
      .then(setArchivedChats)
      .catch(() => undefined);
  }, [client, screen]);

  async function send() {
    const text = composer.trim();
    if (!text || !project || busy) return;
    const assistantId = `${Date.now()}-assistant`;
    setComposer("");
    setBusy(true);
    setActivityLabel("Understanding your request");
    setMessages((current) => [
      ...current,
      { id: `${Date.now()}-user`, role: "user", text },
      { id: assistantId, role: "assistant", text: "" }
    ]);
    try {
      let streamError: string | null = null;
      await client.stream({ conversationId, message: text, project, threadId }, (event) => {
        if (event.type === "chat.started") {
          setConversationId(event.conversationId);
          setThreadId(event.threadId);
        }
        if (event.type === "chat.delta")
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? { ...message, text: message.text + event.delta }
                : message
            )
          );
        if (event.type === "chat.action" && event.action.status === "running") {
          setActivityLabel(event.action.label);
        }
        if (event.type === "chat.failed") streamError = event.message;
      });
      if (streamError) throw new Error(streamError);
      setChats(await client.chats());
    } catch (reason) {
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                text: reason instanceof Error ? reason.message : "The coworker could not respond."
              }
            : message
        )
      );
    } finally {
      setBusy(false);
      setActivityLabel("Understanding your request");
    }
  }

  function newChat() {
    setMessages([]);
    setConversationId(null);
    setThreadId(null);
    setScreen("chat");
    setMenuOpen(false);
  }

  function openProject(nextProject: CoworkerProject) {
    setProject(nextProject);
    setScreen("project-overview");
    setMenuOpen(false);
  }

  async function openChat(chat: CoworkerChatRecord) {
    const detail = await client.chat(chat.uuid);
    setProject(projects.find((item) => item.id === detail.projectUuid));
    setConversationId(detail.uuid);
    setThreadId(detail.codexThreadId);
    setMessages(
      detail.messages.map((message) => ({
        id: message.uuid,
        role: message.role,
        text: message.body
      }))
    );
    setScreen("chat");
    setMenuOpen(false);
  }

  async function setChatPinned(chat: CoworkerChatRecord) {
    await client.setChatPinned(chat.uuid, !chat.pinnedAt);
    setChats(await client.chats());
  }

  async function archiveChat(chat: CoworkerChatRecord) {
    await client.archiveChat(chat.uuid);
    if (conversationId === chat.uuid) newChat();
    setChats(await client.chats());
  }

  async function restoreArchivedChat(chat: CoworkerChatRecord) {
    await client.restoreChat(chat.uuid);
    const [active, archived] = await Promise.all([client.chats(), client.archivedChats()]);
    setChats(active);
    setArchivedChats(archived);
  }

  async function deleteArchivedChat(chat: CoworkerChatRecord) {
    await client.forceDeleteChat(chat.uuid);
    setArchivedChats(await client.archivedChats());
  }

  async function deleteAllArchivedChats() {
    await client.forceDeleteArchivedChats();
    setArchivedChats([]);
  }

  function openScreen(nextScreen: MobileScreen) {
    setScreen(nextScreen);
    setMenuOpen(false);
  }

  function addConnectedProject(connectedProject: CoworkerProject) {
    setProjects((current) => [
      connectedProject,
      ...current.filter((item) => item.id !== connectedProject.id)
    ]);
  }

  return (
    <SafeAreaView style={[styles.screen, dark && styles.screenDark]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={[styles.header, dark && styles.borderDark]}>
          <View style={styles.headerIdentity}>
            <Image source={logoImage} style={styles.headerLogo} />
            <View>
              <Text style={[styles.headerTitle, dark && styles.textDark]}>DevKit</Text>
              <Text numberOfLines={1} style={styles.project}>
                {screen === "todos"
                  ? "Task Manager"
                  : screen === "project-overview"
                    ? (project?.title ?? "Project overview")
                    : screen === "projects"
                      ? "Connected workspaces"
                      : screen === "connection"
                        ? "Connect Service"
                        : screen === "docs"
                          ? "Documentation"
                          : screen === "archives"
                            ? "Archived chats"
                            : (project?.title ??
                              (projects.length ? "Choose project" : "No projects"))}
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityLabel="Open Messenger"
            onPress={onOpenMessenger}
            style={styles.iconButton}
          >
            <Ionicons color={dark ? "#efefeb" : "#242421"} name="chatbubbles-outline" size={23} />
          </Pressable>
          <Pressable
            accessibilityLabel="Open menu"
            accessibilityState={{ expanded: menuOpen }}
            onPress={() => setMenuOpen((open) => !open)}
            style={styles.iconButton}
          >
            <Ionicons color={dark ? "#efefeb" : "#242421"} name="menu-outline" size={25} />
          </Pressable>
        </View>
        {screen === "todos" ? (
          <TodoPage apiUrl={API_URL} token={token} />
        ) : screen === "project-overview" && project ? (
          <ProjectOverviewPage apiUrl={API_URL} project={project} token={token} />
        ) : screen === "projects" ? (
          <ProjectsPage
            apiUrl={API_URL}
            onConnect={addConnectedProject}
            onOpen={openProject}
            token={token}
          />
        ) : screen === "connection" ? (
          <ConnectionServicePage apiUrl={API_URL} token={token} />
        ) : screen === "docs" ? (
          <DocsPage apiUrl={API_URL} token={token} />
        ) : screen === "archives" ? (
          <ArchivedChatsPage
            chats={archivedChats}
            onDelete={deleteArchivedChat}
            onDeleteAll={deleteAllArchivedChats}
            onRestore={restoreArchivedChat}
            projects={projects}
          />
        ) : (
          <>
            <FlatList
              contentContainerStyle={messages.length ? styles.messages : styles.emptyList}
              data={messages}
              keyExtractor={(item) => item.id}
              onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
              ref={list}
              style={styles.threadList}
              renderItem={({ item }) => (
                <View style={[styles.messageRow, item.role === "user" && styles.userRow]}>
                  {item.role === "assistant" ? (
                    <View style={styles.assistantIcon}>
                      <Ionicons color="#fff" name="sparkles" size={13} />
                    </View>
                  ) : null}
                  <View
                    style={[
                      styles.message,
                      item.role === "user" && styles.userMessage,
                      dark && item.role === "user" && styles.userMessageDark
                    ]}
                  >
                    {item.role === "assistant" && !item.text && busy ? (
                      <View accessibilityLiveRegion="polite" style={styles.agentActivity}>
                        <ActivityIndicator color={dark ? "#d8d8d2" : "#555550"} size="small" />
                        <Text style={[styles.agentActivityText, dark && styles.textDark]}>
                          {activityLabel}
                        </Text>
                      </View>
                    ) : (
                      <Text selectable style={[styles.messageText, dark && styles.textDark]}>
                        {item.text || "No response returned."}
                      </Text>
                    )}
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.welcome}>
                  <View style={styles.logo}>
                    <Ionicons color="#fff" name="sparkles" size={22} />
                  </View>
                  <Text style={[styles.welcomeTitle, dark && styles.textDark]}>
                    What are we working on?
                  </Text>
                  <Text style={styles.welcomeCopy}>
                    Ask about your selected project. Your conversation stays connected with web and
                    desktop.
                  </Text>
                </View>
              }
            />
            <View style={[styles.composerWrap, dark && styles.composerDark]}>
              <TextInput
                multiline
                numberOfLines={3}
                onChangeText={setComposer}
                placeholder={project ? `Ask about ${project.title}` : "Add a project to begin"}
                placeholderTextColor="#898981"
                scrollEnabled
                style={[styles.composer, dark && styles.textDark]}
                textAlignVertical="top"
                value={composer}
              />
              <Pressable
                disabled={!composer.trim() || busy || !project}
                onPress={() => void send()}
                style={({ pressed }) => [
                  styles.send,
                  (!composer.trim() || busy || !project) && styles.sendDisabled,
                  pressed && styles.pressed
                ]}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons color="#fff" name="arrow-up" size={20} />
                )}
              </Pressable>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
      <MobileDrawer
        activeChatId={conversationId}
        chats={chats}
        onClose={() => setMenuOpen(false)}
        onNewChat={newChat}
        onArchiveChat={(chat) => void archiveChat(chat)}
        onOpenChat={(chat) => void openChat(chat)}
        onOpenProject={openProject}
        onOpenScreen={openScreen}
        onSetChatPinned={(chat) => void setChatPinned(chat)}
        open={menuOpen}
        projects={projects}
        screen={screen}
        selectedProject={project}
      />
    </SafeAreaView>
  );
}

function CenteredSpinner() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color="#222" />
    </View>
  );
}

const styles = StyleSheet.create({
  agentActivity: { alignItems: "center", flexDirection: "row", gap: 9, minHeight: 28 },
  agentActivityText: { color: "#595953", fontSize: 15 },
  assistantIcon: {
    alignItems: "center",
    backgroundColor: "#222220",
    borderRadius: 9,
    height: 29,
    justifyContent: "center",
    marginTop: 2,
    width: 29
  },
  borderDark: { borderBottomColor: "#30302e" },
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  composer: {
    borderWidth: 0,
    color: "#20201e",
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    maxHeight: 184,
    minHeight: 74,
    outlineColor: "transparent",
    outlineWidth: 0,
    paddingHorizontal: 3,
    paddingVertical: 8
  },
  composerDark: { backgroundColor: "#222220", borderColor: "#3b3b38" },
  composerWrap: {
    alignItems: "flex-end",
    backgroundColor: "#fff",
    borderColor: "#deded8",
    borderRadius: 20,
    borderWidth: 1,
    flexShrink: 0,
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
    marginHorizontal: 14,
    padding: 8
  },
  emptyList: { flexGrow: 1, justifyContent: "center" },
  error: { color: "#b53b35", fontSize: 14 },
  field: {
    backgroundColor: "#fff",
    borderColor: "#deded8",
    borderRadius: 13,
    borderWidth: 1,
    color: "#20201e",
    fontSize: 16,
    height: 52,
    paddingHorizontal: 15
  },
  flex: { flex: 1 },
  header: {
    alignItems: "center",
    borderBottomColor: "#e8e8e2",
    borderBottomWidth: 1,
    flexDirection: "row",
    height: 58,
    justifyContent: "space-between",
    paddingHorizontal: 15
  },
  headerIdentity: { alignItems: "center", flexDirection: "row", gap: 10 },
  headerLogo: { height: 30, resizeMode: "contain", width: 37 },
  headerTitle: { color: "#20201e", fontSize: 15, fontWeight: "700" },
  iconButton: { alignItems: "center", height: 40, justifyContent: "center", width: 40 },
  login: {
    alignSelf: "center",
    gap: 12,
    maxWidth: 400,
    paddingHorizontal: 24,
    width: "100%"
  },
  loginButton: {
    alignItems: "center",
    backgroundColor: "#222220",
    borderRadius: 13,
    height: 52,
    justifyContent: "center",
    marginTop: 4
  },
  loginButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  loginLogo: { alignSelf: "center", height: 72, marginBottom: 16, width: 88 },
  loginScreen: { justifyContent: "center" },
  logo: {
    alignItems: "center",
    backgroundColor: "#222220",
    borderRadius: 12,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  message: { flexShrink: 1, maxWidth: "84%", paddingVertical: 4 },
  messageRow: { alignItems: "flex-start", flexDirection: "row", gap: 11 },
  messages: { gap: 20, paddingBottom: 26, paddingHorizontal: 17, paddingTop: 24 },
  messageText: { color: "#282825", fontSize: 16, lineHeight: 24 },
  menu: {
    backgroundColor: "#fff",
    borderColor: "#deded8",
    borderRadius: 13,
    borderWidth: 1,
    elevation: 8,
    maxHeight: 320,
    padding: 6,
    position: "absolute",
    right: 12,
    shadowColor: "#000",
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    top: 52,
    width: 230,
    zIndex: 20
  },
  menuDark: { backgroundColor: "#222220", borderColor: "#3b3b38" },
  menuItem: {
    alignItems: "center",
    borderRadius: 9,
    flexDirection: "row",
    gap: 10,
    minHeight: 42,
    paddingHorizontal: 11
  },
  menuItemActive: { backgroundColor: "#efefe9" },
  menuItemActiveDark: { backgroundColor: "#333330" },
  menuItemText: { color: "#242421", flex: 1, fontSize: 15 },
  pressed: { opacity: 0.78 },
  project: { color: "#85857e", fontSize: 12, maxWidth: 240 },
  screen: { backgroundColor: "#f7f7f4", flex: 1 },
  screenDark: { backgroundColor: "#171716" },
  send: {
    alignItems: "center",
    backgroundColor: "#222220",
    borderRadius: 11,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  sendDisabled: { backgroundColor: "#c9c9c3" },
  smallLogo: {
    alignItems: "center",
    backgroundColor: "#222220",
    borderRadius: 9,
    height: 30,
    justifyContent: "center",
    width: 30
  },
  textDark: { color: "#efefeb" },
  threadList: { flex: 1 },
  userMessage: {
    backgroundColor: "#e9e9e3",
    borderBottomRightRadius: 5,
    borderRadius: 17,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  userMessageDark: { backgroundColor: "#2b2b29" },
  userRow: { justifyContent: "flex-end" },
  welcome: { alignItems: "center", paddingHorizontal: 34 },
  welcomeCopy: {
    color: "#787871",
    fontSize: 16,
    lineHeight: 24,
    paddingTop: 12,
    textAlign: "center"
  },
  welcomeTitle: {
    color: "#20201e",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -1,
    paddingTop: 18,
    textAlign: "center"
  }
});
