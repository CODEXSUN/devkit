import { io } from "socket.io-client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  mergeMessengerMessage,
  MessengerClient,
  reconcileMessengerMessages,
  type MessengerClientKind,
  type MessengerContact,
  type MessengerConversation,
  type MessengerActivity,
  type MessengerMessage,
  type MessengerPresenceEvent,
  type MessengerProfile,
  type MessengerUnreadEvent
} from "./messenger-client";
import { devkitSocketPath } from "./socket-path";

const connectedRefreshIntervalMs = 60_000;
const reconnectRefreshIntervalMs = 5_000;

export function useMessenger({
  active = true,
  apiUrl,
  clientKind,
  deviceConversation = false,
  token
}: {
  active?: boolean;
  apiUrl: string;
  clientKind: MessengerClientKind;
  deviceConversation?: boolean;
  token: string;
}) {
  const baseUrl = apiUrl.replace(/\/+$/u, "");
  const client = useMemo(() => new MessengerClient(baseUrl, () => token), [baseUrl, token]);
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "connecting" | "offline" | "reconnecting"
  >("connecting");
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<MessengerMessage[]>([]);
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [activity, setActivity] = useState<MessengerActivity[]>([]);
  const [conversations, setConversations] = useState<MessengerConversation[]>([]);
  const [conversationId, setConversationId] = useState("");
  const [contacts, setContacts] = useState<MessengerContact[]>([]);
  const [profile, setProfile] = useState<MessengerProfile>();
  const [profileId, setProfileId] = useState("");
  const [peerActorId, setPeerActorId] = useState("");
  const [sending, setSending] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >(() => (typeof Notification === "undefined" ? "unsupported" : Notification.permission));
  const [onlineActorIds, setOnlineActorIds] = useState<string[]>([]);
  const refreshing = useRef(false);
  const conversationLoad = useRef(0);
  const socketConnected = useRef(false);
  const conversationsRef = useRef<MessengerConversation[]>([]);
  const activeRef = useRef(active);
  const contactsRef = useRef(contacts);
  const conversationIdRef = useRef(conversationId);
  const profileIdRef = useRef(profileId);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);
  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { contactsRef.current = contacts; }, [contacts]);
  useEffect(() => { conversationIdRef.current = conversationId; }, [conversationId]);
  useEffect(() => { profileIdRef.current = profileId; }, [profileId]);

  const refresh = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    setSyncing(true);
    try {
      if (!conversationId) return;
      const latest = await client.history(conversationId);
      setMessages((current) => reconcileMessengerMessages(current, latest.items));
      setError("");
      const [conversationResult] = await Promise.allSettled([
        client.conversations(),
        isConversationVisible(active) ? client.read(conversationId) : Promise.resolve(null)
      ]);
      if (conversationResult.status === "fulfilled") setConversations(conversationResult.value);
    } catch (reason) {
      setError(messageFrom(reason));
    } finally {
      refreshing.current = false;
      setSyncing(false);
    }
  }, [active, client, conversationId]);
  const refreshRef = useRef(refresh);
  useEffect(() => { refreshRef.current = refresh; }, [refresh]);

  useEffect(() => {
    setMessages([]);
    setHistoryCursor(null);
    setError("");
    setConversationId("");
    if (!peerActorId && !deviceConversation) {
      setActivity([]);
      return;
    }
    const load = ++conversationLoad.current;
    const openConversation = peerActorId
      ? client.conversation(peerActorId)
      : client.deviceConversation();
    void openConversation
      .then(async (conversation) => {
        if (load !== conversationLoad.current) return;
        setConversationId(conversation.id);
        const page = await client.history(conversation.id);
        if (load !== conversationLoad.current) return;
        setMessages(page.items);
        setHistoryCursor(page.nextCursor);
        setError("");
        const log = await client.activity(conversation.id).catch(() => []);
        if (load !== conversationLoad.current) return;
        setActivity(log);
      })
      .catch((reason) => {
        if (load === conversationLoad.current) setError(messageFrom(reason));
      });
    return () => {
      if (load === conversationLoad.current) conversationLoad.current += 1;
    };
  }, [client, deviceConversation, peerActorId]);

  useEffect(() => {
    void Promise.allSettled([client.contacts(), client.profile(), client.conversations()]).then(
      ([contactResult, profileResult, conversationResult]) => {
        if (profileResult.status === "fulfilled") {
          setProfile(profileResult.value);
          setProfileId(profileResult.value.uuid);
        }
        if (contactResult.status === "fulfilled") {
          const ownId = profileResult.status === "fulfilled" ? profileResult.value.uuid : "";
          const availableContacts = contactResult.value.filter((contact) => contact.uuid !== ownId);
          setContacts(availableContacts);
        }
        if (conversationResult.status === "fulfilled") {
          setConversations(conversationResult.value);
        }
      }
    );
    void refreshRef.current();
    const socket = io(baseUrl, {
      auth: { token: `Bearer ${token}` },
      path: devkitSocketPath(baseUrl, "/api/devkit/messenger/socket.io"),
      transports: ["websocket", "polling"],
      tryAllTransports: true
    });
    let mounted = true;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleRefresh = () => {
      if (!mounted) return;
      if (refreshTimer) globalThis.clearTimeout(refreshTimer);
      refreshTimer = globalThis.setTimeout(
        async () => {
          await refreshRef.current();
          scheduleRefresh();
        },
        socketConnected.current ? connectedRefreshIntervalMs : reconnectRefreshIntervalMs
      );
    };
    socket.on("connect", () => {
      socketConnected.current = true;
      setConnected(true);
      setConnectionStatus("connected");
      setError("");
      void refreshRef.current();
      scheduleRefresh();
    });
    socket.io.on("reconnect_attempt", () => setConnectionStatus("reconnecting"));
    socket.on("connect_error", () => {
      socketConnected.current = false;
      setConnected(false);
      setConnectionStatus("reconnecting");
      scheduleRefresh();
    });
    socket.on("disconnect", () => {
      socketConnected.current = false;
      setConnected(false);
      setConnectionStatus("reconnecting");
      setOnlineActorIds([]);
      scheduleRefresh();
    });
    socket.on("messenger.presence.snapshot", (actorIds: string[]) => {
      setOnlineActorIds([...new Set(actorIds)]);
    });
    socket.on("messenger.presence", (event: MessengerPresenceEvent) => {
      setOnlineActorIds((current) =>
        event.online
          ? [...new Set([...current, event.actorId])]
          : current.filter((actorId) => actorId !== event.actorId)
      );
    });
    socket.on("messenger.message", (message: MessengerMessage) => {
      const selectedConversationId = conversationIdRef.current;
      const conversation = conversationsRef.current.find(
        (item) => item.id === message.conversationId
      );
      const ownMessage =
        conversation?.kind === "device"
          ? message.client === clientKind
          : message.actorId === profileIdRef.current;
      if (
        !ownMessage &&
        (!isConversationVisible(activeRef.current) || message.conversationId !== selectedConversationId) &&
        !conversation?.mutedAt
      ) {
        showMessageNotification(
          message,
          contactsRef.current.find((contact) => contact.uuid === message.actorId)?.name ??
            conversation?.title ??
            "Messenger"
        );
      }
      if (message.conversationId === selectedConversationId) {
        setMessages((current) => mergeMessengerMessage(current, message));
        if (isConversationVisible(activeRef.current)) void client.read(selectedConversationId).catch(() => undefined);
      }
    });
    socket.on("messenger.unread", (event: MessengerUnreadEvent) => {
      if (event.actorId === profileIdRef.current) {
        setConversations((current) => [event.conversation, ...current.filter((item) => item.id !== event.conversation.id)]);
      }
    });
    const recover = () => {
      const visible = typeof document === "undefined" || document.visibilityState === "visible";
      const online = typeof navigator === "undefined" || navigator.onLine;
      if (visible && online) void refreshRef.current();
    };
    const offline = () => {
      socketConnected.current = false;
      setConnected(false);
      setConnectionStatus("offline");
      scheduleRefresh();
    };
    if (typeof window !== "undefined") {
      window.addEventListener("focus", recover);
      window.addEventListener("online", recover);
      window.addEventListener("offline", offline);
    }
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", recover);
    scheduleRefresh();
    return () => {
      mounted = false;
      if (refreshTimer) globalThis.clearTimeout(refreshTimer);
      socketConnected.current = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("focus", recover);
        window.removeEventListener("online", recover);
        window.removeEventListener("offline", offline);
      }
      if (typeof document !== "undefined") document.removeEventListener("visibilitychange", recover);
      socket.disconnect();
    };
  }, [baseUrl, client, clientKind, token]);

  const send = useCallback(
    async (body: string, files: File[] = []) => {
      const text = body.trim();
      if ((!text && !files.length) || sending) return false;
      setSending(true);
      try {
        if (!conversationId) return false;
        const message = await client.send(
          conversationId,
          text || files[0]?.name || "Attachment",
          clientKind
        );
        setMessages((current) => mergeMessengerMessage(current, message));
        if (files.length)
          await Promise.all(files.map((file) => client.attach(conversationId, message.uuid, file)));
        const latest = await client.history(conversationId);
        setMessages((current) => reconcileMessengerMessages(current, latest.items));
        const log = await client.activity(conversationId).catch(() => null);
        if (log) setActivity(log);
        setError("");
        return true;
      } catch (reason) {
        setError(messageFrom(reason));
        return false;
      } finally {
        setSending(false);
      }
    },
    [client, clientKind, conversationId, sending]
  );

  const react = useCallback(
    async (messageId: string, emoji: string) => {
      if (!conversationId) return;
      await client.react(conversationId, messageId, emoji);
      const latest = await client.history(conversationId);
      setMessages((current) => reconcileMessengerMessages(current, latest.items));
    },
    [client, conversationId]
  );

  const loadOlder = useCallback(async () => {
    if (!conversationId || !historyCursor || loadingOlder) return false;
    setLoadingOlder(true);
    try {
      const page = await client.history(conversationId, historyCursor);
      setMessages((current) => reconcileMessengerMessages(page.items, current));
      setHistoryCursor(page.nextCursor);
      setError("");
      return true;
    } catch (reason) {
      setError(messageFrom(reason));
      return false;
    } finally {
      setLoadingOlder(false);
    }
  }, [client, conversationId, historyCursor, loadingOlder]);

  const updateConversationPreferences = useCallback(
    async (targetId: string, input: { archived?: boolean; muted?: boolean }) => {
      await client.preferences(targetId, input);
      setConversations(await client.conversations());
    },
    [client]
  );

  const attachmentBlob = useCallback(
    (attachment: Parameters<MessengerClient["attachmentBlob"]>[0]) =>
      client.attachmentBlob(attachment),
    [client]
  );
  const requestNotifications = useCallback(async () => {
    if (typeof Notification === "undefined") return "unsupported" as const;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    return permission;
  }, []);

  return {
    activity,
    attachmentBlob,
    connected,
    connectionStatus,
    contacts,
    conversations,
    error,
    hasOlder: Boolean(historyCursor),
    loadOlder,
    loadingOlder,
    messages,
    notificationPermission,
    onlineActorIds,
    peerActorId,
    profile,
    profileId,
    react,
    refresh,
    requestNotifications,
    send,
    sending,
    setPeerActorId,
    syncing,
    updateConversationPreferences
  };
}

export function isMessengerConversationMessage(
  message: MessengerMessage,
  profileId: string,
  peerActorId: string
) {
  if (!profileId) return false;
  if (!peerActorId) return message.actorId === profileId && !message.recipientActorId;
  return (
    (message.actorId === profileId && message.recipientActorId === peerActorId) ||
    (message.actorId === peerActorId && message.recipientActorId === profileId)
  );
}

function messageFrom(reason: unknown) {
  return reason instanceof Error
    ? reason.message
    : "Messenger could not connect. Please try again.";
}

function isConversationVisible(active: boolean) {
  return (
    active &&
    (typeof document === "undefined" ||
      (document.visibilityState === "visible" && document.hasFocus()))
  );
}

function showMessageNotification(message: MessengerMessage, title: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  const notification = new Notification(title, {
    body: message.body.slice(0, 180),
    tag: `messenger:${message.conversationId}`
  });
  notification.onclick = () => {
    if (typeof window !== "undefined") window.focus();
    notification.close();
  };
}
