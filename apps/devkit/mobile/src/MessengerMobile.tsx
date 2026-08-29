import { Ionicons } from "@expo/vector-icons";
import { io } from "socket.io-client";
import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";

type Message = { body: string; client: "desktop" | "mobile" | "web"; createdAt: string; uuid: string };
type Envelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

export function MessengerMobile({ apiUrl, onOpenAi, token }: { apiUrl: string; onOpenAi: () => void; token: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const list = useRef<FlatList<Message>>(null);
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const refreshMessages = useCallback(async () => {
    setSyncing(true);
    try {
      const latest = await request<Message[]>(apiUrl, headers);
      setMessages((current) => reconcileMessages(current, latest));
      setError("");
    } catch (reason) {
      setError(messageFrom(reason));
    } finally {
      setSyncing(false);
    }
  }, [apiUrl, token]);
  useEffect(() => {
    void refreshMessages();
    const socket = io(apiUrl, { auth: { token: `Bearer ${token}` }, path: "/api/devkit/messenger/socket.io", transports: ["websocket", "polling"], tryAllTransports: true });
    socket.on("connect", () => setConnected(true));
    socket.on("connect_error", () => { setConnected(false); setError("Live connection is retrying. Messages will continue to refresh."); });
    socket.on("disconnect", () => setConnected(false));
    socket.on("messenger.message", (message: Message) => setMessages((current) => mergeMessage(current, message)));
    const interval = setInterval(() => void refreshMessages(), 10_000);
    return () => { clearInterval(interval); socket.disconnect(); };
  }, [apiUrl, refreshMessages, token]);
  async function send() {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const message = await request<Message>(apiUrl, headers, { body: JSON.stringify({ body: text, client: "mobile" }), method: "POST" });
      setMessages((current) => mergeMessage(current, message));
      setBody("");
      setError("");
    } catch (reason) {
      setError(messageFrom(reason));
    } finally {
      setSending(false);
    }
  }
  return <SafeAreaView style={styles.screen}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
    <View style={styles.header}><View><Text style={styles.title}>My Devices</Text><Text style={styles.caption}>{connected ? "Web, desktop, and mobile" : syncing ? "Syncing your messages" : "Offline — refresh to retry"}</Text></View><Pressable onPress={onOpenAi} style={styles.ai}><Ionicons name="sparkles-outline" size={17} /><Text>AI Chat</Text></Pressable></View>
    <FlatList contentContainerStyle={styles.list} data={messages} keyExtractor={(item) => item.uuid} onContentSizeChange={() => list.current?.scrollToEnd()} ref={list} renderItem={({ item }) => <MessageBubble message={item} />} />
    {error ? <Pressable accessibilityLabel="Refresh Messenger" disabled={syncing} onPress={() => void refreshMessages()}><Text accessibilityLiveRegion="polite" style={styles.feedback}>{error} {syncing ? "Refreshing…" : "Tap to refresh."}</Text></Pressable> : null}
    <View style={styles.composer}><TextInput editable={!sending} multiline onChangeText={setBody} placeholder="Message web and desktop" style={styles.input} value={body} /><Pressable disabled={!body.trim() || sending} onPress={() => void send()} style={styles.send}><Ionicons color="white" name="arrow-up" size={18} /></Pressable></View>
  </KeyboardAvoidingView></SafeAreaView>;
}

async function request<T>(apiUrl: string, headers: Record<string, string>, init: RequestInit = {}) { const response = await fetch(`${apiUrl}/api/devkit/messenger/messages`, { ...init, headers }); const result = await response.json() as Envelope<T>; if (!response.ok || !result.success) throw new Error(result.success ? "Request failed." : result.error.message); return result.data; }

function mergeMessage(messages: Message[], message: Message) {
  return reconcileMessages(messages, [message]);
}

function reconcileMessages(current: Message[], latest: Message[]) {
  const messages = new Map(current.map((message) => [message.uuid, message]));
  latest.forEach((message) => messages.set(message.uuid, message));
  return [...messages.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

function messageFrom(reason: unknown) {
  return reason instanceof Error ? reason.message : "Messenger could not connect. Please try again.";
}

function MessageBubble({ message }: { message: Message }) {
  const outgoing = message.client === "mobile";
  return <View style={[styles.message, outgoing ? styles.outgoingMessage : styles.incomingMessage]}><Text style={[styles.label, outgoing && styles.outgoingMeta]}>{message.client}</Text><Text style={styles.body}>{message.body}</Text><Text style={[styles.time, outgoing && styles.outgoingMeta]}>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text></View>;
}

const styles = StyleSheet.create({ ai: { alignItems: "center", backgroundColor: "#ecece7", borderRadius: 10, flexDirection: "row", gap: 6, paddingHorizontal: 11, paddingVertical: 8 }, body: { color: "#20201e", fontSize: 16, lineHeight: 23 }, caption: { color: "#777770", fontSize: 13 }, composer: { alignItems: "flex-end", borderColor: "#deded8", borderRadius: 16, borderWidth: 1, flexDirection: "row", gap: 8, margin: 12, padding: 8 }, feedback: { color: "#777770", fontSize: 12, paddingHorizontal: 16, textAlign: "center" }, flex: { flex: 1 }, header: { alignItems: "center", borderBottomColor: "#e3e3dd", borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", padding: 16 }, incomingMessage: { alignSelf: "flex-start", backgroundColor: "#fafaf8", borderColor: "#e1e1db", borderBottomLeftRadius: 17, borderBottomRightRadius: 17, borderTopLeftRadius: 5, borderTopRightRadius: 17, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 }, input: { flex: 1, fontSize: 16, maxHeight: 120, minHeight: 38, padding: 8 }, label: { color: "#777770", fontSize: 12, textTransform: "capitalize" }, list: { flexGrow: 1, justifyContent: "flex-end", padding: 14 }, message: { gap: 3, marginVertical: 4, maxWidth: "84%" }, outgoingMessage: { alignSelf: "flex-end", backgroundColor: "#e9e9e4", borderBottomRightRadius: 5, borderRadius: 17, paddingHorizontal: 14, paddingVertical: 10 }, outgoingMeta: { textAlign: "right" }, screen: { backgroundColor: "#f7f7f4", flex: 1 }, send: { alignItems: "center", backgroundColor: "#20201e", borderRadius: 18, height: 36, justifyContent: "center", width: 36 }, time: { color: "#777770", fontSize: 11, textAlign: "left" }, title: { color: "#20201e", fontSize: 19, fontWeight: "700" } });
