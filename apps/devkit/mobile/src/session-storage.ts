import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const SESSION_KEY = "devkit_session";

class SessionStorage {
  async get(): Promise<string | null> {
    if (Platform.OS === "web") return globalThis.localStorage?.getItem(SESSION_KEY) ?? null;
    return SecureStore.getItemAsync(SESSION_KEY);
  }

  async set(token: string): Promise<void> {
    if (Platform.OS === "web") {
      globalThis.localStorage?.setItem(SESSION_KEY, token);
      return;
    }
    await SecureStore.setItemAsync(SESSION_KEY, token);
  }

  async clear(): Promise<void> {
    if (Platform.OS === "web") {
      globalThis.localStorage?.removeItem(SESSION_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(SESSION_KEY);
  }
}

export const sessionStorage = new SessionStorage();
