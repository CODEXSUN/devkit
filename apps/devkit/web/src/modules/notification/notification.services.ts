import { apiGet, apiPut } from "../../shared/api/devkit-api";
import type { DevkitNotification } from "./notification.types";

export const listNotifications = () => apiGet<DevkitNotification[]>("/notifications");
export const markNotificationRead = (id: string) =>
  apiPut<DevkitNotification>(`/notifications/${id}/read`);
