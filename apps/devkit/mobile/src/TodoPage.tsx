import { Ionicons } from "@expo/vector-icons";
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
import { type MobileTodo, TodoClient } from "./todo-client";

export function TodoPage({ apiUrl, token }: { apiUrl: string; token: string }) {
  const client = useMemo(() => new TodoClient(apiUrl, token), [apiUrl, token]);
  const [todos, setTodos] = useState<MobileTodo[]>([]);
  const [title, setTitle] = useState("");
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
      const todo = await client.create(nextTitle);
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
  createRow: { flexDirection: "row", gap: 9 },
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
  list: { paddingBottom: 24, paddingTop: 18 },
  loading: { alignItems: "center", flex: 1, justifyContent: "center" },
  meta: { color: "#85857e", fontSize: 12, paddingTop: 3 },
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
  todoTitle: { color: "#242421", fontSize: 16, lineHeight: 21 }
});
