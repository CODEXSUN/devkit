import { Ionicons } from "@expo/vector-icons";
import { isMessengerMessageOwn, type MessengerMessage, useMessenger } from "@codexsun/coworker-chat";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

export function MessengerMobile({
  apiUrl,
  onOpenAi,
  token
}: {
  apiUrl: string;
  onOpenAi: () => void;
  token: string;
}) {
  const [body, setBody] = useState("");
  const [contactQuery, setContactQuery] = useState("");
  const {
    connected,
    contacts,
    conversations,
    error,
    hasOlder,
    loadOlder,
    loadingOlder,
    messages,
    onlineActorIds,
    peerActorId,
    profileId,
    refresh,
    send: sendMessage,
    sending,
    setPeerActorId,
    syncing
  } = useMessenger({
    apiUrl,
    clientKind: "mobile",
    token
  });
  const list = useRef<FlatList<MessengerMessage>>(null);
  const atBottom = useRef(true);
  const selectedContact = contacts.find((contact) => contact.uuid === peerActorId);
  const visibleContacts = useMemo(() => contacts.filter((contact) => `${contact.name} ${contact.email}`.toLocaleLowerCase().includes(contactQuery.trim().toLocaleLowerCase())), [contactQuery, contacts]);
  useEffect(() => {
    atBottom.current = true;
    requestAnimationFrame(() => list.current?.scrollToEnd({ animated: false }));
  }, [peerActorId]);
  useEffect(() => {
    if (!peerActorId && contacts[0]) setPeerActorId(contacts[0].uuid);
  }, [contacts, peerActorId, setPeerActorId]);
  async function submitMessage() {
    const text = body.trim();
    if (!text || sending) return;
    if (await sendMessage(text)) setBody("");
  }
  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{selectedContact?.name ?? "Messenger"}</Text>
            <Text style={styles.caption}>
              {selectedContact
                ? onlineActorIds.includes(selectedContact.uuid) ? "Online" : "Offline"
                : connected
                ? "Select a user to start a chat"
                : syncing
                  ? "Syncing your messages"
                  : "Offline — refresh to retry"}
            </Text>
          </View>
          <Pressable onPress={onOpenAi} style={styles.ai}>
            <Ionicons name="sparkles-outline" size={17} />
            <Text>AI Chat</Text>
          </Pressable>
        </View>
        <View style={styles.contactPicker}>
          <View style={styles.contactSearch}><Ionicons color="#777770" name="search-outline" size={15} /><TextInput onChangeText={setContactQuery} placeholder="Search people" style={styles.contactSearchInput} value={contactQuery} /></View>
          <ScrollView contentContainerStyle={styles.contactRows} horizontal showsHorizontalScrollIndicator={false}>
            {visibleContacts.map((contact) => <ConversationChip key={contact.uuid} label={contact.name} onPress={() => setPeerActorId(contact.uuid)} online={onlineActorIds.includes(contact.uuid)} selected={peerActorId === contact.uuid} unread={conversations.find((item) => item.peerActorId === contact.uuid)?.unreadCount ?? 0} />)}
          </ScrollView>
        </View>
        <FlatList
          contentContainerStyle={styles.list}
          data={messages}
          keyExtractor={(item) => item.uuid}
          ListHeaderComponent={hasOlder ? <Pressable disabled={loadingOlder} onPress={() => void loadOlder()} style={styles.loadOlder}><Text style={styles.loadOlderText}>{loadingOlder ? "Loading…" : "Load older messages"}</Text></Pressable> : null}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          onContentSizeChange={() => {
            if (atBottom.current) list.current?.scrollToEnd({ animated: false });
          }}
          onScroll={(event) => {
            const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
            atBottom.current = contentSize.height - contentOffset.y - layoutMeasurement.height < 80;
          }}
          scrollEventThrottle={100}
          ref={list}
          renderItem={({ item }) => <MessageBubble clientKind="mobile" message={item} peerActorId={peerActorId} profileId={profileId} />}
        />
        {error ? (
          <Pressable
            accessibilityLabel="Refresh Messenger"
            disabled={syncing}
            onPress={() => void refresh()}
          >
            <Text accessibilityLiveRegion="polite" style={styles.feedback}>
              {error} {syncing ? "Refreshing…" : "Tap to refresh."}
            </Text>
          </Pressable>
        ) : null}
        <View style={styles.composer}>
          <TextInput
            editable={!sending}
            multiline
            onChangeText={setBody}
            placeholder={selectedContact ? `Message ${selectedContact.name}` : "Select a user"}
            style={styles.input}
            value={body}
          />
          <Pressable
            disabled={!body.trim() || sending}
            onPress={() => void submitMessage()}
            style={styles.send}
          >
            <Ionicons color="white" name="arrow-up" size={18} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ConversationChip({ label, onPress, online, selected, unread }: { label: string; onPress: () => void; online: boolean; selected: boolean; unread: number }) {
  const initials = label.split(/\s+/u).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <Pressable onPress={onPress} style={[styles.contactChip, selected && styles.contactChipSelected]}><View style={styles.chipAvatar}><Text style={styles.chipAvatarText}>{initials}</Text>{online ? <View style={styles.onlineDot} /> : null}</View><Text numberOfLines={1} style={[styles.contactChipText, selected && styles.contactChipTextSelected]}>{label}</Text>{unread ? <Text style={styles.unread}>{unread}</Text> : null}</Pressable>;
}

function MessageBubble({ clientKind, message, peerActorId, profileId }: { clientKind: "mobile"; message: MessengerMessage; peerActorId: string; profileId: string }) {
  const outgoing = isMessengerMessageOwn(message, clientKind, profileId, peerActorId);
  return (
    <View style={[styles.message, outgoing ? styles.outgoingMessage : styles.incomingMessage]}>
      <Text style={[styles.label, outgoing && styles.outgoingMeta]}>{message.client}</Text>
      <Text style={styles.body}>{message.body}</Text>
      <Text style={[styles.time, outgoing && styles.outgoingMeta]}>
        {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        {outgoing ? ` · ${message.readAt ? "Read" : message.deliveredAt ? "Delivered" : "Sent"}` : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ai: {
    alignItems: "center",
    backgroundColor: "#ecece7",
    borderRadius: 10,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 8
  },
  body: { color: "#20201e", fontSize: 16, lineHeight: 23 },
  caption: { color: "#777770", fontSize: 13 },
  contactChip: { alignItems: "center", borderColor: "#deded8", borderRadius: 999, borderWidth: 1, flexDirection: "row", gap: 6, maxWidth: 180, paddingHorizontal: 11, paddingVertical: 7 },
  contactChipSelected: { backgroundColor: "#20201e", borderColor: "#20201e" },
  contactChipText: { color: "#55554f", fontSize: 13, fontWeight: "600", maxWidth: 125 },
  contactChipTextSelected: { color: "white" },
  contactPicker: { borderBottomColor: "#e5e5df", borderBottomWidth: 1, gap: 8, paddingHorizontal: 12, paddingVertical: 9 },
  contactRows: { gap: 7, paddingRight: 12 },
  chipAvatar: { alignItems: "center", backgroundColor: "#e3e3dd", borderRadius: 999, height: 25, justifyContent: "center", position: "relative", width: 25 },
  chipAvatarText: { color: "#3f3f3b", fontSize: 9, fontWeight: "700" },
  contactSearch: { alignItems: "center", backgroundColor: "#efefe9", borderRadius: 10, flexDirection: "row", gap: 7, paddingHorizontal: 10 },
  contactSearchInput: { color: "#20201e", flex: 1, fontSize: 14, height: 36, paddingVertical: 0 },
  composer: {
    alignItems: "flex-end",
    borderColor: "#deded8",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    margin: 12,
    padding: 8
  },
  feedback: { color: "#777770", fontSize: 12, paddingHorizontal: 16, textAlign: "center" },
  flex: { flex: 1 },
  header: {
    alignItems: "center",
    borderBottomColor: "#e3e3dd",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16
  },
  incomingMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#fafaf8",
    borderColor: "#e1e1db",
    borderBottomLeftRadius: 17,
    borderBottomRightRadius: 17,
    borderTopLeftRadius: 5,
    borderTopRightRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  input: { flex: 1, fontSize: 16, maxHeight: 120, minHeight: 38, padding: 8 },
  label: { color: "#777770", fontSize: 12, textTransform: "capitalize" },
  list: { flexGrow: 1, justifyContent: "flex-end", padding: 14 },
  loadOlder: { alignSelf: "center", paddingHorizontal: 12, paddingVertical: 8 },
  loadOlderText: { color: "#66665f", fontSize: 13 },
  message: { gap: 3, marginVertical: 4, maxWidth: "84%" },
  onlineDot: { backgroundColor: "#16a34a", borderColor: "#f7f7f4", borderRadius: 999, borderWidth: 1.5, bottom: -1, height: 8, position: "absolute", right: -1, width: 8 },
  outgoingMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#e9e9e4",
    borderBottomRightRadius: 5,
    borderRadius: 17,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  outgoingMeta: { textAlign: "right" },
  screen: { backgroundColor: "#f7f7f4", flex: 1 },
  send: {
    alignItems: "center",
    backgroundColor: "#20201e",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  time: { color: "#777770", fontSize: 11, textAlign: "left" },
  title: { color: "#20201e", fontSize: 19, fontWeight: "700" },
  unread: { backgroundColor: "#d96b3f", borderRadius: 999, color: "white", fontSize: 10, fontWeight: "700", minWidth: 18, overflow: "hidden", paddingHorizontal: 5, paddingVertical: 2, textAlign: "center" }
});
