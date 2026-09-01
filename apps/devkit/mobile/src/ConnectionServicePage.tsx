import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

type Status = {
  bound: boolean;
  cloudUrl: string;
  instanceId: string;
  lastError: string | null;
  pendingRecords: number;
  remoteRevision: number;
  role: "cloud" | "disabled" | "local";
  status: string;
};

export function ConnectionServicePage({ apiUrl, token }: { apiUrl: string; token: string }) {
  const [status, setStatus] = useState<Status>();
  const [code, setCode] = useState("");
  const [cloudUrl, setCloudUrl] = useState("https://devkit.codexsun.com");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const request = useCallback(
    async <T,>(path: string, init: RequestInit = {}) => {
      const response = await fetch(`${apiUrl.replace(/\/+$/u, "")}/api/devkit${path}`, {
        ...init,
        headers: {
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          Authorization: `Bearer ${token}`,
          ...init.headers
        }
      });
      const result = (await response.json()) as {
        data?: T;
        error?: { message?: string };
        success: boolean;
      };
      if (!response.ok || !result.success)
        throw new Error(result.error?.message || "Connection request failed.");
      return result.data as T;
    },
    [apiUrl, token]
  );
  const refresh = useCallback(
    async () => {
      const next = await request<Status>("/admin/sync/status");
      setStatus(next);
      setCloudUrl(next.cloudUrl);
    },
    [request]
  );
  useEffect(() => {
    void refresh().catch((error) =>
      setMessage(error instanceof Error ? error.message : "Unable to read connection.")
    );
  }, [refresh]);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Connection request failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!status)
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#242421" />
      </View>
    );
  return (
    <View style={styles.page}>
      <View style={styles.titleRow}>
        <View style={styles.icon}>
          <Ionicons color="#30302c" name="git-network-outline" size={22} />
        </View>
        <View>
          <Text style={styles.eyebrow}>SERVICES</Text>
          <Text style={styles.title}>Connect Service</Text>
          <Text style={styles.copy}>
            Connect your signed-in DevKit account and approved workspaces to this mobile device.
          </Text>
        </View>
      </View>
      <View style={styles.card}>
        <View style={styles.cardTitle}>
          <View>
            <Text style={styles.heading}>Cloud workspace bridge</Text>
            <Text style={styles.subheading}>
              {status.bound ? `Signed in · ${status.cloudUrl}` : "Waiting for a one-time code"}
            </Text>
          </View>
          <Text style={[styles.badge, status.bound && styles.badgeConnected]}>
            {status.bound ? "Connected" : "Not connected"}
          </Text>
        </View>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {status.role === "local" && !status.bound ? (
          <View style={styles.form}>
            <Text style={styles.label}>Cloud domain</Text>
            <TextInput autoCapitalize="none" keyboardType="url" onChangeText={setCloudUrl} placeholder="https://devkit.codexsun.com" style={styles.input} value={cloudUrl} />
            <Text style={styles.device}>Connecting as <Text style={styles.deviceStrong}>mobile-devkit</Text></Text>
            <Text style={styles.label}>One-time connection code</Text>
            <TextInput
              autoCapitalize="characters"
              maxLength={16}
              onChangeText={(value) => setCode(value.replace(/\s/gu, ""))}
              placeholder="Paste 16-character code"
              style={styles.input}
              value={code}
            />
            <Action
              disabled={busy}
              icon="open-outline"
              label="Get connection code"
              onPress={() =>
                void run(async () => {
                  await Linking.openURL(connectUrl(cloudUrl));
                })
              }
            />
            <Action
              disabled={busy || code.length !== 16}
              icon="link-outline"
              label="Connect device"
              onPress={() =>
                void run(async () => {
                  await request("/admin/sync/bind", {
                    body: JSON.stringify({ cloudUrl: normalizedCloudUrl(cloudUrl), instanceId: "mobile-devkit", token: code }),
                    method: "POST"
                  });
                  setCode("");
                  setMessage("This device is connected to your cloud workspaces.");
                })
              }
              primary
            />
          </View>
        ) : null}
        {status.role === "local" && status.bound ? (
          <View>
            <View style={styles.stats}>
              <Stat label="Device" value={status.instanceId} />
              <Stat label="Cloud revision" value={String(status.remoteRevision)} />
              <Stat label="Pending changes" value={String(status.pendingRecords)} />
            </View>
            <View style={styles.actions}>
              <Action
                disabled={busy}
                icon="refresh-outline"
                label="Verify"
                onPress={() =>
                  void run(async () => {
                    await request("/admin/sync/verify", { body: "{}", method: "POST" });
                    setMessage("Connection verified.");
                  })
                }
              />
              <Action
                disabled={busy}
                icon="cloud-upload-outline"
                label="Publish"
                onPress={() =>
                  void run(async () => {
                    await request("/admin/sync/publish", { body: "{}", method: "POST" });
                    setMessage("Approved workspace changes published.");
                  })
                }
                primary
              />
              <Action
                disabled={busy}
                icon="unlink-outline"
                label="Disconnect"
                onPress={() =>
                  void run(async () => {
                    await request("/admin/sync/bind", { method: "DELETE" });
                    setMessage("Device disconnected. Local files were kept.");
                  })
                }
              />
            </View>
          </View>
        ) : null}
      </View>
      <View style={styles.help}>
        <Text style={styles.heading}>Connect another device</Text>
        <Text style={styles.helpText}>
          1. Generate a one-time code from your signed-in cloud account.
        </Text>
        <Text style={styles.helpText}>2. Open Connect Service on the device.</Text>
        <Text style={styles.helpText}>3. Enter the code and verify the account.</Text>
        <Text style={styles.secure}>
          Repositories, credentials, environment files, builds, and agent secrets remain on each
          device.
        </Text>
      </View>
    </View>
  );
}

function normalizedCloudUrl(value: string) {
  return new URL(value.trim()).origin;
}

function connectUrl(cloudUrl: string) {
  const url = new URL("/connect", normalizedCloudUrl(cloudUrl));
  url.searchParams.set("device", "mobile-devkit");
  return url.toString();
}

function Action({
  disabled,
  icon,
  label,
  onPress,
  primary = false
}: {
  disabled: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        primary && styles.primary,
        disabled && styles.disabled,
        pressed && styles.pressed
      ]}
    >
      <Ionicons color={primary ? "#fff" : "#30302c"} name={icon} size={17} />
      <Text style={[styles.actionText, primary && styles.primaryText]}>{label}</Text>
    </Pressable>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text numberOfLines={2} style={styles.statValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: "center",
    borderColor: "#d9d9d2",
    borderRadius: 9,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 43,
    paddingHorizontal: 13
  },
  actionText: { color: "#30302c", fontSize: 14, fontWeight: "700" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 22 },
  badge: {
    backgroundColor: "#f4f0dc",
    borderRadius: 99,
    color: "#75641a",
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 9,
    paddingVertical: 6
  },
  badgeConnected: { backgroundColor: "#e9f5ec", color: "#28643a" },
  card: {
    backgroundColor: "#fff",
    borderColor: "#dfdfd8",
    borderRadius: 13,
    borderWidth: 1,
    marginTop: 28,
    padding: 20
  },
  cardTitle: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between"
  },
  center: { alignItems: "center", flex: 1, justifyContent: "center" },
  copy: { color: "#6f6f68", fontSize: 15, lineHeight: 22, marginTop: 7 },
  disabled: { opacity: 0.55 },
  device: { color: "#686861", fontSize: 14, lineHeight: 21, paddingVertical: 5 },
  deviceStrong: { color: "#292926", fontWeight: "700" },
  eyebrow: { color: "#65655f", fontSize: 11, fontWeight: "700", letterSpacing: 1.4 },
  form: { gap: 7, marginTop: 24 },
  heading: { color: "#292926", fontSize: 17, fontWeight: "700" },
  help: { borderTopColor: "#dfdfd8", borderTopWidth: 1, marginTop: 25, paddingTop: 20 },
  helpText: { color: "#686861", fontSize: 14, lineHeight: 21, marginTop: 9 },
  icon: {
    alignItems: "center",
    backgroundColor: "#eeeeea",
    borderColor: "#deded8",
    borderRadius: 10,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  input: {
    backgroundColor: "#fff",
    borderColor: "#d9d9d2",
    borderRadius: 8,
    borderWidth: 1,
    color: "#292926",
    fontSize: 16,
    height: 44,
    paddingHorizontal: 11
  },
  label: { color: "#696962", fontSize: 13, fontWeight: "700", marginTop: 8 },
  message: {
    backgroundColor: "#f8f4df",
    borderColor: "#e9dda7",
    borderRadius: 8,
    borderWidth: 1,
    color: "#62581b",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 18,
    padding: 10
  },
  page: { flex: 1, padding: 18 },
  pressed: { opacity: 0.78 },
  primary: { backgroundColor: "#242421", borderColor: "#242421" },
  primaryText: { color: "#fff" },
  secure: { color: "#5d725f", fontSize: 13, lineHeight: 20, marginTop: 19 },
  stat: { flex: 1, minWidth: 88 },
  statLabel: { color: "#777770", fontSize: 12 },
  statValue: { color: "#292926", fontSize: 14, fontWeight: "700", marginTop: 5 },
  stats: { flexDirection: "row", gap: 10, marginTop: 24 },
  subheading: { color: "#777770", fontSize: 13, marginTop: 5 },
  title: { color: "#20201e", fontSize: 27, fontWeight: "700", letterSpacing: -0.8, marginTop: 4 },
  titleRow: { alignItems: "flex-start", flexDirection: "row", gap: 13 }
});
