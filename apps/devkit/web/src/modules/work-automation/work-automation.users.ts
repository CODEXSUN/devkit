import { useQuery } from "@tanstack/react-query";

type IdentityUser = {
  email: string;
  id: number;
  isProtected: boolean;
  name: string;
  role: string;
  status: "active" | "inactive" | "suspended";
  uuid: string;
};

type ApiEnvelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

const usersQueryKey = ["identity", "users", "work-assignees"] as const;

export function useWorkAssigneeUsers() {
  return useQuery({ queryFn: listActiveUsers, queryKey: usersQueryKey, staleTime: 30_000 });
}

async function listActiveUsers() {
  const baseUrl = import.meta.env.VITE_PLATFORM_API_URL.replace(/\/+$/u, "");
  const token = window.localStorage.getItem("devkit_session");
  const response = await fetch(`${baseUrl}/identity/users`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    method: "GET"
  });
  const envelope = (await response.json().catch(() => null)) as ApiEnvelope<IdentityUser[]> | null;
  if (!response.ok || !envelope?.success) {
    throw new Error(
      envelope && !envelope.success ? envelope.error.message : "Users could not be loaded."
    );
  }
  return envelope.data.filter((user) => user.status === "active");
}

export function userLookupOptions(users: IdentityUser[]) {
  return users.map((user) => ({
    description: `${user.email} · ${user.role}`,
    label: user.name,
    value: user.email
  }));
}
