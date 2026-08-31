import { Ionicons } from "@expo/vector-icons";
import type { CoworkerChatRecord, CoworkerProject } from "@codexsun/coworker-chat";
import { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

export function ArchivedChatsPage({
  chats,
  onDelete,
  onDeleteAll,
  onRestore,
  projects
}: {
  chats: CoworkerChatRecord[];
  onDelete: (chat: CoworkerChatRecord) => Promise<void>;
  onDeleteAll: () => Promise<void>;
  onRestore: (chat: CoworkerChatRecord) => Promise<void>;
  projects: CoworkerProject[];
}) {
  const [query, setQuery] = useState("");
  const projectNames = useMemo(
    () => new Map(projects.map((project) => [project.id, project.title])),
    [projects]
  );
  const visibleChats = chats.filter((chat) =>
    `${chat.title} ${projectNames.get(chat.projectUuid) ?? "General"}`
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase())
  );

  function confirmDelete(chat: CoworkerChatRecord) {
    Alert.alert(
      "Delete permanently?",
      `This will permanently delete “${chat.title}” and every stored message. This action cannot be undone.`,
      [
        { style: "cancel", text: "Cancel" },
        { onPress: () => void onDelete(chat), style: "destructive", text: "Delete permanently" }
      ]
    );
  }

  function confirmDeleteAll() {
    Alert.alert(
      "Delete all archived chats?",
      `This will permanently delete all ${chats.length} archived conversations and every stored message. This action cannot be undone.`,
      [
        { style: "cancel", text: "Cancel" },
        { onPress: () => void onDeleteAll(), style: "destructive", text: "Delete all" }
      ]
    );
  }

  return (
    <View style={styles.page}>
      <View style={styles.heading}>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>Archived chats</Text>
          <Text style={styles.subtitle}>Restore a chat or permanently remove its messages.</Text>
        </View>
        <Pressable
          accessibilityLabel="Delete all archived chats"
          disabled={!chats.length}
          onPress={confirmDeleteAll}
          style={[styles.deleteAll, !chats.length && styles.disabled]}
        >
          <Ionicons color="#a93530" name="trash-outline" size={17} />
          <Text style={styles.deleteAllText}>Delete all</Text>
        </Pressable>
      </View>
      <View style={styles.search}>
        <Ionicons color="#777770" name="search-outline" size={18} />
        <TextInput
          onChangeText={setQuery}
          placeholder="Search archived chats"
          placeholderTextColor="#919189"
          style={styles.searchInput}
          value={query}
        />
      </View>
      <FlatList
        contentContainerStyle={visibleChats.length ? styles.list : styles.emptyList}
        data={visibleChats}
        keyExtractor={(chat) => chat.uuid}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons color="#777770" name="archive-outline" size={26} />
            <Text style={styles.emptyTitle}>No archived chats</Text>
            <Text style={styles.emptyText}>
              {query ? "Try a different search." : "Archived Agent conversations will appear here."}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowCopy}>
              <Text numberOfLines={1} style={styles.chatTitle}>{item.title}</Text>
              <Text style={styles.chatMeta}>
                {projectNames.get(item.projectUuid) ?? "General"} · {formatDate(item.updatedAt)}
              </Text>
            </View>
            <Pressable
              accessibilityLabel={`Permanently delete ${item.title}`}
              onPress={() => confirmDelete(item)}
              style={styles.iconAction}
            >
              <Ionicons color="#9b3b36" name="trash-outline" size={19} />
            </Pressable>
            <Pressable onPress={() => void onRestore(item)} style={styles.restore}>
              <Ionicons color="#30302d" name="arrow-undo-outline" size={17} />
              <Text style={styles.restoreText}>Restore</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
}

const styles = StyleSheet.create({
  chatMeta: { color: "#7b7b74", fontSize: 12, marginTop: 5 },
  chatTitle: { color: "#242421", fontSize: 15, fontWeight: "600" },
  deleteAll: { alignItems: "center", flexDirection: "row", gap: 5, padding: 7 },
  deleteAllText: { color: "#a93530", fontSize: 13, fontWeight: "600" },
  disabled: { opacity: 0.42 },
  empty: { alignItems: "center", gap: 8 },
  emptyList: { flexGrow: 1, justifyContent: "center" },
  emptyText: { color: "#777770", fontSize: 13, textAlign: "center" },
  emptyTitle: { color: "#343431", fontSize: 16, fontWeight: "600" },
  heading: { alignItems: "flex-start", flexDirection: "row", justifyContent: "space-between" },
  headingCopy: { flex: 1, paddingRight: 8 },
  iconAction: { alignItems: "center", height: 38, justifyContent: "center", width: 38 },
  list: { gap: 8, paddingBottom: 28 },
  page: { backgroundColor: "#f8f8f5", flex: 1, paddingHorizontal: 16, paddingTop: 22 },
  restore: { alignItems: "center", backgroundColor: "#efefe9", borderRadius: 9, flexDirection: "row", gap: 5, height: 36, paddingHorizontal: 10 },
  restoreText: { color: "#30302d", fontSize: 13, fontWeight: "600" },
  row: { alignItems: "center", backgroundColor: "#fff", borderColor: "#deded8", borderRadius: 12, borderWidth: 1, flexDirection: "row", minHeight: 70, paddingHorizontal: 12 },
  rowCopy: { flex: 1, minWidth: 0 },
  search: { alignItems: "center", backgroundColor: "#fff", borderColor: "#deded8", borderRadius: 11, borderWidth: 1, flexDirection: "row", gap: 8, height: 44, marginBottom: 18, marginTop: 20, paddingHorizontal: 12 },
  searchInput: { color: "#242421", flex: 1, fontSize: 15 },
  subtitle: { color: "#777770", fontSize: 13, lineHeight: 19, marginTop: 5 },
  title: { color: "#20201e", fontSize: 25, fontWeight: "700", letterSpacing: -0.8 }
});
