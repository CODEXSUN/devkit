import { io } from "socket.io-client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  mergeMessengerMessage,
  MessengerClient,
  type MessengerClientKind,
  type MessengerContact,
  type MessengerConversation,
  type MessengerActivity,
  type MessengerMessage
} from "./messenger-client";
import { devkitSocketPath } from "./socket-path";

const refreshIntervalMs = 10_000;

export function useMessenger({
  apiUrl,
  clientKind,
  token
}: {
  apiUrl: string;
  clientKind: MessengerClientKind;
  token: string;
}) {
  const baseUrl = apiUrl.replace(/\/+$/u, "");
  const client = useMemo(() => new MessengerClient(baseUrl, () => token), [baseUrl, token]);
  const [connected, setConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "connecting" | "offline" | "reconnecting">("connecting");
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<MessengerMessage[]>([]);
  const [activity, setActivity] = useState<MessengerActivity[]>([]);
  const [conversations, setConversations] = useState<MessengerConversation[]>([]);
  const [conversationId, setConversationId] = useState("");
  const [contacts, setContacts] = useState<MessengerContact[]>([]);
  const [profileId, setProfileId] = useState("");
  const [peerActorId, setPeerActorId] = useState("");
  const [sending, setSending] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const refreshing = useRef(false);

  const refresh = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    setSyncing(true);
    try {
      if (!conversationId) return;
      const latest = await client.list(conversationId);
      setMessages(latest);
      await client.read(conversationId);
      setConversations(await client.conversations());
      setError("");
    } catch (reason) {
      setError(messageFrom(reason));
    } finally {
      refreshing.current = false;
      setSyncing(false);
    }
  }, [client, conversationId]);

  useEffect(() => {
    setMessages([]);
    void client.conversation(peerActorId || undefined).then((conversation) => {
      setConversationId(conversation.id);
      return Promise.all([client.list(conversation.id), client.activity(conversation.id)]);
    }).then(([items, log]) => { setMessages(items); setActivity(log); }).catch((reason) => setError(messageFrom(reason)));
  }, [client, peerActorId]);

  useEffect(() => {
    void Promise.all([client.contacts(), client.profile(), client.conversations()])
      .then(([availableContacts, profile, availableConversations]) => {
        setContacts(availableContacts.filter((contact) => contact.uuid !== profile.uuid));
        setProfileId(profile.uuid);
        setConversations(availableConversations);
      })
      .catch(() => setContacts([]));
    void refresh();
    const socket = io(baseUrl, {
      auth: { token: `Bearer ${token}` },
      path: devkitSocketPath(baseUrl, "/api/devkit/messenger/socket.io"),
      transports: ["websocket", "polling"],
      tryAllTransports: true
    });
    socket.on("connect", () => {
      setConnected(true);
      setConnectionStatus("connected");
    });
    socket.io.on("reconnect_attempt", () => setConnectionStatus("reconnecting"));
    socket.on("connect_error", () => {
      setConnected(false);
      setConnectionStatus("reconnecting");
      setError("Live connection is retrying. Messages will continue to refresh.");
    });
    socket.on("disconnect", () => {
      setConnected(false);
      setConnectionStatus("reconnecting");
    });
    socket.on("messenger.message", (message: MessengerMessage) => {
      if (message.conversationId === conversationId) {
        setMessages((current) => mergeMessengerMessage(current, message));
        void client.read(conversationId);
      }
    });
    const interval = setInterval(() => void refresh(), refreshIntervalMs);
    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, [baseUrl, client, conversationId, refresh, token]);

  const send = useCallback(
    async (body: string) => {
      const text = body.trim();
      if (!text || sending) return false;
      setSending(true);
      try {
        if (!conversationId) return false;
        const message = await client.send(conversationId, text, clientKind);
        setMessages((current) => mergeMessengerMessage(current, message));
        setActivity(await client.activity(conversationId));
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

  const updateConversationPreferences = useCallback(async (targetId: string, input: { archived?: boolean; muted?: boolean }) => {
    await client.preferences(targetId, input);
    setConversations(await client.conversations());
  }, [client]);

  return { activity, connected, connectionStatus, contacts, conversations, error, messages, peerActorId, profileId, refresh, send, sending, setPeerActorId, syncing, updateConversationPreferences };
}

export function isMessengerConversationMessage(message: MessengerMessage, profileId: string, peerActorId: string) {
  if (!profileId) return false;
  if (!peerActorId) return message.actorId === profileId && !message.recipientActorId;
  return (message.actorId === profileId && message.recipientActorId === peerActorId) ||
    (message.actorId === peerActorId && message.recipientActorId === profileId);
}

function messageFrom(reason: unknown) {
  return reason instanceof Error
    ? reason.message
    : "Messenger could not connect. Please try again.";
}
