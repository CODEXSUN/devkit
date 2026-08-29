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
  useWindowDimensions,
  View
} from "react-native";
import type { CoworkerChatRecord, CoworkerProject } from "@codexsun/coworker-chat";
import logoImage from "../assets/logo.png";

export type MobileScreen = "chat" | "todos";

export function MobileDrawer({
  open,
  chats,
  activeChatId,
  projects,
  screen,
  selectedProject,
  onClose,
  onNewChat,
  onOpenChat,
  onOpenProject,
  onOpenScreen
}: {
  open: boolean;
  chats: CoworkerChatRecord[];
  activeChatId: string | null;
  projects: CoworkerProject[];
  screen: MobileScreen;
  selectedProject?: CoworkerProject;
  onClose: () => void;
  onNewChat: () => void;
  onOpenChat: (chat: CoworkerChatRecord) => void;
  onOpenProject: (project: CoworkerProject) => void;
  onOpenScreen: (screen: MobileScreen) => void;
}) {
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(width * 0.84, 340);
  const progress = useRef(new Animated.Value(0)).current;
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [mounted, setMounted] = useState(open);

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
          <View style={styles.divider} />
          <DrawerItem icon="create-outline" label="New chat" onPress={onNewChat} />
          {chats.length ? (
            <View style={styles.chatHistory}>
              <Text style={styles.sectionLabel}>Recent chats</Text>
              {chats.slice(0, 12).map((chat) => (
                <DrawerItem
                  active={screen === "chat" && activeChatId === chat.uuid}
                  icon="chatbox-outline"
                  key={chat.uuid}
                  label={chat.title}
                  onPress={() => onOpenChat(chat)}
                  small
                />
              ))}
            </View>
          ) : null}
          <DrawerItem
            icon={projectsOpen ? "chevron-down" : "chevron-forward"}
            label="Projects"
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
