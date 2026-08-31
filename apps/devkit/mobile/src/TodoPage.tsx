import { Ionicons } from "@expo/vector-icons";
import { type SharedTodo as MobileTodo, TodoClient } from "@codexsun/coworker-chat";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

export function TodoPage({ apiUrl, token }: { apiUrl: string; token: string }) {
  const client = useMemo(() => new TodoClient(apiUrl, token), [apiUrl, token]);
  const [todos, setTodos] = useState<MobileTodo[]>([]);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void client
      .list()
      .then(setTodos)
      .catch((reason: unknown) => setError(messageOf(reason)))
      .finally(() => setLoading(false));
  }, [client]);

  async function create() {
    const nextTitle = title.trim();
    if (!nextTitle || busy) return;
    setBusy(true);
    setError("");
    try {
      const todo = await client.create({ priority, title: nextTitle, visibility });
      setTodos((current) => [todo, ...current]);
      setTitle("");
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  }

  async function toggle(todo: MobileTodo) {
    const status = isDone(todo) ? "open" : "completed";
    try {
      const updated = await client.status(todo.id, status);
      setTodos((current) => current.map((item) => (item.id === todo.id ? updated : item)));
    } catch (reason) {
      setError(messageOf(reason));
    }
  }

  async function toggleVisibility(todo: MobileTodo) {
    try {
      const updated = await client.update(todo.id, {
        visibility: todo.visibility === "public" ? "private" : "public"
      });
      setTodos((current) => current.map((item) => (item.id === todo.id ? updated : item)));
    } catch (reason) {
      setError(messageOf(reason));
    }
  }

  function confirmRemove(todo: MobileTodo) {
    Alert.alert("Delete Todo?", todo.title, [
      { style: "cancel", text: "Cancel" },
      { onPress: () => void remove(todo), style: "destructive", text: "Delete" }
    ]);
  }

  async function remove(todo: MobileTodo) {
    try {
      await client.delete(todo.id);
      setTodos((current) => current.filter((item) => item.id !== todo.id));
    } catch (reason) {
      setError(messageOf(reason));
    }
  }

  return (
    <View style={styles.page}>
      <View style={styles.heading}>
        <Text style={styles.title}>Todos</Text>
        <Text style={styles.count}>{todos.filter((todo) => !isDone(todo)).length} open</Text>
      </View>
      <View style={styles.createRow}>
        <TextInput
          onChangeText={setTitle}
          onSubmitEditing={() => void create()}
          placeholder="Add a todo"
          placeholderTextColor="#8a8a83"
          returnKeyType="done"
          style={styles.input}
          value={title}
        />
        <Pressable
          accessibilityLabel={`Priority ${priority}`}
          onPress={() => setPriority(nextPriority(priority))}
          style={[styles.option, priorityStyle(priority)]}
        >
          <View style={[styles.priorityDot, priorityDotStyle(priority)]} />
          <Text style={styles.optionText}>{priorityLabel(priority)}</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={
            visibility === "public" ? "Make new todo private" : "Make new todo public"
          }
          onPress={() => setVisibility(visibility === "public" ? "private" : "public")}
          style={styles.iconOption}
        >
          <Ionicons
            color={visibility === "public" ? "#397bb8" : "#696963"}
            name={visibility === "public" ? "eye-outline" : "lock-closed-outline"}
            size={18}
          />
        </Pressable>
        <Pressable
          accessibilityLabel="Add todo"
          disabled={!title.trim() || busy}
          onPress={() => void create()}
          style={[styles.add, (!title.trim() || busy) && styles.disabled]}
        >
          {busy ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons color="#fff" name="add" size={22} />
          )}
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#242421" />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={todos.length ? styles.list : styles.emptyList}
          data={todos}
          keyExtractor={(todo) => todo.id}
          ListEmptyComponent={<Text style={styles.empty}>No todos yet.</Text>}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Pressable
                accessibilityLabel={`${item.visibility === "public" ? "Make private" : "Make public"} ${item.title}`}
                onPress={() => void toggleVisibility(item)}
                style={styles.visibility}
              >
                <Ionicons
                  color={item.visibility === "public" ? "#397bb8" : "#8a8a83"}
                  name={item.visibility === "public" ? "eye-outline" : "lock-closed-outline"}
                  size={17}
                />
              </Pressable>
              <Pressable
                accessibilityLabel={`${isDone(item) ? "Reopen" : "Complete"} ${item.title}`}
                onPress={() => void toggle(item)}
                style={[styles.check, isDone(item) && styles.checked]}
              >
                {isDone(item) ? <Ionicons color="#fff" name="checkmark" size={15} /> : null}
              </Pressable>
              <View style={styles.todoCopy}>
                <Text style={[styles.todoTitle, isDone(item) && styles.done]}>{item.title}</Text>
                {item.dueDate || item.priority ? (
                  <Text style={styles.meta}>
                    {[item.priority, item.dueDate].filter(Boolean).join(" · ")}
                  </Text>
                ) : null}
              </View>
              <Pressable
                accessibilityLabel={`Delete ${item.title}`}
                onPress={() => confirmRemove(item)}
                style={styles.delete}
              >
                <Ionicons color="#8a8a83" name="trash-outline" size={18} />
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

function isDone(todo: MobileTodo) {
  return ["completed", "done"].includes(todo.status.toLowerCase());
}

function messageOf(reason: unknown) {
  return reason instanceof Error ? reason.message : "Todos could not be loaded.";
}

const priorities = ["low", "medium", "high", "urgent"];
function nextPriority(priority: string) {
  return priorities[(priorities.indexOf(priority) + 1) % priorities.length] ?? "medium";
}
function priorityLabel(priority: string) {
  return priority === "medium" ? "Med" : priority[0]!.toUpperCase() + priority.slice(1);
}
function priorityStyle(priority: string) {
  if (priority === "urgent") return styles.priorityUrgent;
  if (priority === "high") return styles.priorityHigh;
  if (priority === "low") return styles.priorityLow;
  return styles.priorityMedium;
}
function priorityDotStyle(priority: string) {
  if (priority === "urgent") return styles.dotUrgent;
  if (priority === "high") return styles.dotHigh;
  if (priority === "low") return styles.dotLow;
  return styles.dotMedium;
}

const styles = StyleSheet.create({
  add: {
    alignItems: "center",
    backgroundColor: "#242421",
    borderRadius: 11,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  check: { borderColor: "#aaa9a2", borderRadius: 7, borderWidth: 1.5, height: 24, width: 24 },
  checked: { alignItems: "center", backgroundColor: "#242421", justifyContent: "center" },
  count: { color: "#777770", fontSize: 14 },
  createRow: { flexDirection: "row", gap: 6 },
  delete: { alignItems: "center", height: 40, justifyContent: "center", width: 40 },
  disabled: { opacity: 0.35 },
  done: { color: "#8a8a83", textDecorationLine: "line-through" },
  empty: { color: "#777770", fontSize: 15, textAlign: "center" },
  emptyList: { flexGrow: 1, justifyContent: "center" },
  error: { color: "#b53b35", fontSize: 14 },
  heading: { alignItems: "baseline", flexDirection: "row", justifyContent: "space-between" },
  input: {
    backgroundColor: "#fff",
    borderColor: "#deded8",
    borderRadius: 12,
    borderWidth: 1,
    color: "#242421",
    flex: 1,
    fontSize: 16,
    height: 42,
    paddingHorizontal: 13
  },
  iconOption: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#deded8",
    borderRadius: 11,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  list: { paddingBottom: 24, paddingTop: 18 },
  loading: { alignItems: "center", flex: 1, justifyContent: "center" },
  meta: { color: "#85857e", fontSize: 12, paddingTop: 3 },
  option: {
    alignItems: "center",
    borderRadius: 11,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    height: 42,
    justifyContent: "center",
    paddingHorizontal: 8
  },
  optionText: { color: "#4c4c47", fontSize: 12, fontWeight: "600" },
  priorityDot: { borderRadius: 4, height: 8, width: 8 },
  priorityLow: { backgroundColor: "#f1f7fc", borderColor: "#cfe0ef" },
  priorityMedium: { backgroundColor: "#fff8e8", borderColor: "#edd9a8" },
  priorityHigh: { backgroundColor: "#fff3ec", borderColor: "#efc8b4" },
  priorityUrgent: { backgroundColor: "#fff0ef", borderColor: "#e9bebc" },
  dotLow: { backgroundColor: "#4f91d1" },
  dotMedium: { backgroundColor: "#e59a18" },
  dotHigh: { backgroundColor: "#e8671c" },
  dotUrgent: { backgroundColor: "#c7463d" },
  page: { flex: 1, gap: 14, paddingHorizontal: 18, paddingTop: 24 },
  row: {
    alignItems: "center",
    borderBottomColor: "#e5e5df",
    borderBottomWidth: 1,
    flexDirection: "row",
    minHeight: 62
  },
  title: { color: "#242421", fontSize: 27, fontWeight: "700", letterSpacing: -0.8 },
  todoCopy: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
  todoTitle: { color: "#242421", fontSize: 16, lineHeight: 21 },
  visibility: { alignItems: "center", height: 40, justifyContent: "center", width: 34 }
});
