import Constants from "expo-constants";
import { Platform } from "react-native";

const API_PORT = 9050;

export function resolveApiUrl(): string {
  const configuredUrl = process.env.EXPO_PUBLIC_COWORKER_API_URL?.replace(/\/+$/u, "");
  if (configuredUrl) return configuredUrl;

  if (Platform.OS === "web") {
    return `http://${globalThis.location?.hostname || "127.0.0.1"}:${API_PORT}`;
  }

  const expoHost = Constants.expoConfig?.hostUri?.split(":")[0];
  if (expoHost) return `http://${expoHost}:${API_PORT}`;
  return `http://${Platform.OS === "android" ? "10.0.2.2" : "127.0.0.1"}:${API_PORT}`;
}
