import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

type FormResult = { updatedAt: string | null; values: Record<string, string> };
type Page = "architecture" | "product";

export function DocsPage({ apiUrl, token }: { apiUrl: string; token: string }) {
  const [page, setPage] = useState<Page>("architecture");
  const [values, setValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const request = useCallback(
    async (method: "GET" | "PUT", values?: Record<string, string>) => {
      const response = await fetch(
        `${apiUrl.replace(/\/+$/u, "")}/api/devkit/docs/forms/product-structure/project-n-definition`,
        {
          body: values ? JSON.stringify({ values }) : undefined,
          headers: {
            ...(values ? { "Content-Type": "application/json" } : {}),
            Authorization: `Bearer ${token}`
          },
          method
        }
      );
      const result = (await response.json()) as {
        data?: FormResult;
        error?: { message?: string };
        success: boolean;
      };
      if (!response.ok || !result.success)
        throw new Error(result.error?.message || "Documentation request failed.");
      return result.data!;
    },
    [apiUrl, token]
  );

  useEffect(() => {
    if (page !== "product") return;
    setLoading(true);
    void request("GET")
      .then((result) => setValues(result.values))
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : "Unable to load saved notes.")
      )
      .finally(() => setLoading(false));
  }, [page, request]);

  async function save() {
    setLoading(true);
    setMessage("");
    try {
      setValues((await request("PUT", values)).values);
      setMessage("Approval notes saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save approval notes.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.tabs}>
        <Tab
          active={page === "architecture"}
          label="Architecture"
          onPress={() => setPage("architecture")}
        />
        <Tab
          active={page === "product"}
          label="Product structure"
          onPress={() => setPage("product")}
        />
      </View>
      {page === "architecture" ? (
        <Architecture />
      ) : (
        <ProductForm
          loading={loading}
          message={message}
          onSave={() => void save()}
          onValuesChange={setValues}
          values={values}
        />
      )}
    </ScrollView>
  );
}

function Architecture() {
  return (
    <View style={styles.card}>
      <Ionicons color="#30302c" name="git-network-outline" size={24} />
      <Text style={styles.title}>Architecture</Text>
      <Text style={styles.copy}>
        One organization uses one engineering platform and source-of-truth repository to support
        independent products. Shared capabilities provide consistent identity, source control,
        testing, release, infrastructure, and observability controls.
      </Text>
      <Text style={styles.note}>
        Each product keeps its own scope, data, release lifecycle, and owner-approved decisions.
      </Text>
    </View>
  );
}

function ProductForm({
  loading,
  message,
  onSave,
  onValuesChange,
  values
}: {
  loading: boolean;
  message: string;
  onSave: () => void;
  onValuesChange: (values: Record<string, string>) => void;
  values: Record<string, string>;
}) {
  return (
    <View style={styles.card}>
      <Ionicons color="#30302c" name="book-outline" size={24} />
      <Text style={styles.title}>Product structure</Text>
      <Text style={styles.copy}>
        Products stay independent. Record Project N details only after the owner approves its
        purpose, users, scope, and first workflow.
      </Text>
      <Text style={styles.label}>Approving owner</Text>
      <TextInput
        onChangeText={(owner) => onValuesChange({ ...values, owner })}
        placeholder="Name or role"
        style={styles.input}
        value={values.owner ?? ""}
      />
      <Text style={styles.label}>Approved definition</Text>
      <TextInput
        multiline
        onChangeText={(decision) => onValuesChange({ ...values, decision })}
        placeholder="Purpose, users, scope, and first workflow"
        style={[styles.input, styles.textarea]}
        textAlignVertical="top"
        value={values.decision ?? ""}
      />
      {message ? <Text style={styles.message}>{message}</Text> : null}
      <Pressable
        disabled={loading || !values.owner?.trim() || !values.decision?.trim()}
        onPress={onSave}
        style={[
          styles.button,
          (loading || !values.owner?.trim() || !values.decision?.trim()) && styles.disabled
        ]}
      >
        <Text style={styles.buttonText}>{loading ? "Saving…" : "Save approval notes"}</Text>
      </Pressable>
    </View>
  );
}

function Tab({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: "#242421",
    borderRadius: 10,
    marginTop: 16,
    minHeight: 44,
    justifyContent: "center"
  },
  buttonText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  card: {
    backgroundColor: "#fff",
    borderColor: "#deded8",
    borderRadius: 14,
    borderWidth: 1,
    gap: 11,
    padding: 18
  },
  copy: { color: "#5f5f58", fontSize: 15, lineHeight: 23 },
  disabled: { opacity: 0.5 },
  input: {
    backgroundColor: "#fff",
    borderColor: "#d8d8d1",
    borderRadius: 10,
    borderWidth: 1,
    color: "#242421",
    fontSize: 15,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  label: { color: "#30302c", fontSize: 14, fontWeight: "700", marginTop: 5 },
  message: { color: "#5f5f58", fontSize: 14 },
  note: {
    borderLeftColor: "#242421",
    borderLeftWidth: 3,
    color: "#454540",
    fontSize: 14,
    lineHeight: 21,
    paddingLeft: 10
  },
  page: { backgroundColor: "#f7f7f4", flexGrow: 1, gap: 16, padding: 16 },
  tab: { borderRadius: 9, flex: 1, minHeight: 38, alignItems: "center", justifyContent: "center" },
  tabActive: { backgroundColor: "#242421" },
  tabText: { color: "#5f5f58", fontSize: 13, fontWeight: "700" },
  tabTextActive: { color: "#fff" },
  tabs: { backgroundColor: "#ecece7", borderRadius: 11, flexDirection: "row", padding: 3 },
  textarea: { minHeight: 130 },
  title: { color: "#242421", fontSize: 23, fontWeight: "700" }
});
