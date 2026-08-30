import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";
import type { CoworkerChatRecord, CoworkerProject } from "@codexsun/coworker-chat";
import logoImage from "../assets/logo.png";

export type MobileScreen = "chat" | "todos" | "projects";

export function MobileDrawer({
  open,
  chats,
  activeChatId,
  projects,
  screen,
  selectedProject,
  onClose,
  onArchiveChat,
  onNewChat,
  onOpenChat,
  onOpenProject,
  onOpenScreen,
  onSetChatPinned
}: {
  open: boolean;
  chats: CoworkerChatRecord[];
  activeChatId: string | null;
  projects: CoworkerProject[];
  screen: MobileScreen;
  selectedProject?: CoworkerProject;
  onClose: () => void;
  onArchiveChat: (chat: CoworkerChatRecord) => void;
  onNewChat: () => void;
  onOpenChat: (chat: CoworkerChatRecord) => void;
  onOpenProject: (project: CoworkerProject) => void;
  onOpenScreen: (screen: MobileScreen) => void;
  onSetChatPinned: (chat: CoworkerChatRecord) => void;
}) {
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(width * 0.84, 340);
  const progress = useRef(new Animated.Value(0)).current;
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [mounted, setMounted] = useState(open);
  const [query, setQuery] = useState("");
  const projectNames = new Map(projects.map((project) => [project.id, project.title]));
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleChats = chats.filter((chat) => {
    const projectName = projectNames.get(chat.projectUuid) ?? "General";
    return `${chat.title} ${projectName}`.toLocaleLowerCase().includes(normalizedQuery);
  });
  const pinnedChats = visibleChats.filter((chat) => chat.pinnedAt);
  const recentChats = visibleChats.filter((chat) => !chat.pinnedAt);
  const chatGroups = [
    ...new Set(recentChats.map((chat) => projectNames.get(chat.projectUuid) ?? "General"))
  ];

  useEffect(() => {
    if (open) setMounted(true);
    Animated.timing(progress, {
      duration: open ? 260 : 210,
      easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      toValue: open ? 1 : 0,
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished && !open) setMounted(false);
    });
  }, [open, progress]);

  if (!mounted) return null;

  return (
    <View style={styles.layer}>
      <Animated.View style={[styles.backdrop, { opacity: progress }]}>
        <Pressable accessibilityLabel="Close menu" onPress={onClose} style={styles.backdropPress} />
      </Animated.View>
      <Animated.View
        style={[
          styles.drawer,
          {
            transform: [
              {
                translateX: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [drawerWidth, 0]
                })
              }
            ],
            width: drawerWidth
          }
        ]}
      >
        <View style={styles.brandRow}>
          <Image source={logoImage} style={styles.logo} />
          <Text style={styles.brand}>DevKit</Text>
          <Pressable accessibilityLabel="Close menu" onPress={onClose} style={styles.close}>
            <Ionicons color="#242421" name="close" size={24} />
          </Pressable>
        </View>
        <View style={styles.searchRow}>
          <Ionicons color="#777770" name="search-outline" size={18} />
          <TextInput
            onChangeText={setQuery}
            placeholder="Search agent chats..."
            placeholderTextColor="#919189"
            style={styles.searchInput}
            value={query}
          />
        </View>
        <ScrollView contentContainerStyle={styles.navigation}>
          <DrawerItem
            active={screen === "chat"}
            icon="chatbubble-outline"
            label="Chat"
            onPress={() => onOpenScreen("chat")}
          />
          <DrawerItem
            active={screen === "todos"}
            icon="checkbox-outline"
            label="Todos"
            onPress={() => onOpenScreen("todos")}
          />
          <DrawerItem
            active={screen === "projects"}
            icon="folder-open-outline"
            label="Projects"
            onPress={() => onOpenScreen("projects")}
          />
          <View style={styles.divider} />
          <DrawerItem icon="create-outline" label="New chat" onPress={onNewChat} />
          {visibleChats.length ? (
            <View style={styles.chatHistory}>
              <Text style={styles.sectionLabel}>Recent chats</Text>
              {pinnedChats.length ? (
                <View style={styles.chatGroup}>
                  <Text style={styles.chatGroupLabel}>Pinned</Text>
                  {pinnedChats.map((chat) => (
                    <ChatDrawerItem
                      active={screen === "chat" && activeChatId === chat.uuid}
                      chat={chat}
                      key={chat.uuid}
                      onArchive={() => onArchiveChat(chat)}
                      onOpen={() => onOpenChat(chat)}
                      onTogglePin={() => onSetChatPinned(chat)}
                    />
                  ))}
                </View>
              ) : null}
              {chatGroups.map((projectName) => (
                <View key={projectName} style={styles.chatGroup}>
                  <Text style={styles.chatGroupLabel}>{projectName}</Text>
                  {recentChats
                    .filter(
                      (chat) => (projectNames.get(chat.projectUuid) ?? "General") === projectName
                    )
                    .slice(0, 12)
                    .map((chat) => (
                      <ChatDrawerItem
                        active={screen === "chat" && activeChatId === chat.uuid}
                        chat={chat}
                        key={chat.uuid}
                        onArchive={() => onArchiveChat(chat)}
                        onOpen={() => onOpenChat(chat)}
                        onTogglePin={() => onSetChatPinned(chat)}
                      />
                    ))}
                </View>
              ))}
            </View>
          ) : normalizedQuery ? (
            <Text style={styles.emptySearch}>No matching agent chats</Text>
          ) : null}
          <DrawerItem
            icon={projectsOpen ? "chevron-down" : "chevron-forward"}
            label="Project shortcuts"
            onPress={() => setProjectsOpen((value) => !value)}
          />
          {projectsOpen ? (
            <View style={styles.nested}>
              {projects.map((project) => (
                <DrawerItem
                  active={screen === "chat" && selectedProject?.id === project.id}
                  icon="folder-outline"
                  key={project.id}
                  label={project.title}
                  onPress={() => onOpenProject(project)}
                  small
                />
              ))}
            </View>
          ) : null}
          <DrawerItem icon="settings-outline" label="Settings" onPress={onClose} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

function ChatDrawerItem({
  active,
  chat,
  onArchive,
  onOpen,
  onTogglePin
}: {
  active: boolean;
  chat: CoworkerChatRecord;
  onArchive: () => void;
  onOpen: () => void;
  onTogglePin: () => void;
}) {
  return (
    <View style={[styles.chatItem, active && styles.itemActive]}>
      <Pressable onPress={onOpen} style={styles.chatItemMain}>
        <Ionicons color={active ? "#242421" : "#696963"} name="chatbox-outline" size={18} />
        <Text numberOfLines={1} style={[styles.itemText, active && styles.itemTextActive]}>
          {chat.title}
        </Text>
      </Pressable>
      <Pressable
        accessibilityLabel={chat.pinnedAt ? `Unpin ${chat.title}` : `Pin ${chat.title}`}
        onPress={onTogglePin}
        style={styles.chatAction}
      >
        <Ionicons color="#696963" name={chat.pinnedAt ? "pin" : "pin-outline"} size={17} />
      </Pressable>
      <Pressable
        accessibilityLabel={`Archive ${chat.title}`}
        onPress={onArchive}
        style={styles.chatAction}
      >
        <Ionicons color="#696963" name="archive-outline" size={17} />
      </Pressable>
    </View>
  );
}

function DrawerItem({
  active = false,
  icon,
  label,
  onPress,
  small = false
}: {
  active?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  small?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.item, active && styles.itemActive, small && styles.small]}>
      <Ionicons color={active ? "#242421" : "#696963"} name={icon} size={small ? 18 : 20} />
      <Text numberOfLines={1} style={[styles.itemText, active && styles.itemTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: "rgba(20, 20, 18, 0.32)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  backdropPress: { flex: 1 },
  brand: { color: "#242421", fontSize: 16, fontWeight: "700" },
  brandRow: {
    alignItems: "center",
    borderBottomColor: "#e6e6e0",
    borderBottomWidth: 1,
    flexDirection: "row",
    height: 62,
    paddingHorizontal: 16
  },
  chatHistory: { gap: 2, paddingVertical: 4 },
  chatGroup: { gap: 2, paddingBottom: 7 },
  chatGroupLabel: { color: "#85857e", fontSize: 12, fontWeight: "600", paddingHorizontal: 13, paddingTop: 5 },
  chatAction: { alignItems: "center", height: 36, justifyContent: "center", width: 34 },
  chatItem: { alignItems: "center", borderRadius: 10, flexDirection: "row", minHeight: 41 },
  chatItemMain: { alignItems: "center", flex: 1, flexDirection: "row", gap: 10, minWidth: 0, paddingLeft: 13 },
  close: { alignItems: "center", height: 40, justifyContent: "center", marginLeft: "auto", width: 40 },
  divider: { backgroundColor: "#e7e7e1", height: 1, marginVertical: 8 },
  drawer: {
    backgroundColor: "#fbfbf9",
    bottom: 0,
    elevation: 18,
    position: "absolute",
    right: 0,
    shadowColor: "#000",
    shadowOffset: { height: 0, width: -10 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    top: 0
  },
  item: {
    alignItems: "center",
    borderRadius: 10,
    flexDirection: "row",
    gap: 12,
    minHeight: 46,
    paddingHorizontal: 13
  },
  itemActive: { backgroundColor: "#ecece7" },
  itemText: { color: "#4f4f4a", flex: 1, fontSize: 15 },
  itemTextActive: { color: "#242421", fontWeight: "600" },
  layer: { bottom: 0, left: 0, position: "absolute", right: 0, top: 0, zIndex: 100 },
  logo: { height: 30, marginRight: 10, resizeMode: "contain", width: 37 },
  navigation: { padding: 12, paddingBottom: 30 },
  emptySearch: { color: "#777770", fontSize: 13, paddingHorizontal: 13, paddingVertical: 10 },
  searchInput: { color: "#242421", flex: 1, fontSize: 15, height: 42, paddingVertical: 0 },
  searchRow: { alignItems: "center", borderBottomColor: "#e7e7e1", borderBottomWidth: 1, flexDirection: "row", gap: 8, height: 54, paddingHorizontal: 16 },
  sectionLabel: {
    color: "#85857e",
    fontSize: 12,
    fontWeight: "600",
    paddingBottom: 5,
    paddingHorizontal: 13,
    paddingTop: 8
  },
  nested: { borderLeftColor: "#deded8", borderLeftWidth: 1, marginLeft: 22, paddingLeft: 7 },
  small: { minHeight: 41 }
});
