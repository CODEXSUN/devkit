import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { io } from "socket.io-client";
import { listNotifications, markNotificationRead } from "./notification.services";

const queryKey = ["devkit", "notifications"] as const;

export function useNotificationCenter() {
  const queryClient = useQueryClient();
  const inbox = useQuery({ queryFn: listNotifications, queryKey, refetchInterval: 30_000 });
  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey })
  });

  useEffect(() => {
    const token = window.localStorage.getItem("devkit_session");
    if (!token) return;
    const apiUrl = import.meta.env.VITE_PLATFORM_API_URL.replace(/\/+$/u, "");
    const socket = io(apiUrl, {
      auth: { token },
      path: "/api/devkit/notifications/socket.io",
      transports: ["websocket", "polling"]
    });
    socket.on("notification.created", () => {
      void queryClient.invalidateQueries({ queryKey });
    });
    return () => {
      socket.close();
    };
  }, [queryClient]);

  return {
    items: inbox.data ?? [],
    markRead: (id: string) => markRead.mutate(id)
  };
}
