export type Desk = "dev";
export type DevkitUserType = "developer";

export type DevkitSession = {
  authenticated: true;
  email: string;
  expiresAt: string;
  name: string;
  role: "developer_admin";
  sessionIssuedAt: string;
  userType: DevkitUserType;
};

const tokenKeys: Record<Desk, string> = {
  dev: "codexsun_session_dev",
};

type ApiEnvelope<T> =
  { data: T; success: true } | { error: { message: string }; success: false };

export function getToken(desk: Desk): string | null {
  try {
    return window.localStorage.getItem(tokenKeys[desk]);
  } catch {
    return null;
  }
}

export function setToken(desk: Desk, token: string) {
  window.localStorage.setItem(tokenKeys[desk], token);
}

export function clearToken(desk: Desk) {
  try {
    window.localStorage.removeItem(tokenKeys[desk]);
  } catch (error) {
    void error;
  }
}

export function deskFromPath(pathname = window.location.pathname): Desk {
  void pathname;
  return "dev";
}

export function devkitAuthHeaders(): Record<string, string> {
  const token = getToken(deskFromPath());
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function isLocalSessionValid(desk: Desk) {
  const token = getToken(desk);
  if (!token) return false;

  try {
    const encoded = token.split(".")[1];
    if (!encoded) return false;
    const normalized = encoded.replace(/-/gu, "+").replace(/_/gu, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const claims = JSON.parse(atob(padded)) as {
      exp?: number;
      userType?: string;
    };
    return (
      typeof claims.exp === "number" &&
      claims.exp * 1000 > Date.now() &&
      claims.userType === "developer"
    );
  } catch {
    return false;
  }
}

export async function login(input: {
  desk: Desk;
  email: string;
  password: string;
}): Promise<{ error?: { message: string }; success: boolean }> {
  clearToken(input.desk);
  try {
    const result = await request<{
      accessToken: string;
      email: string;
      name: string;
      role: "developer_admin";
      userType: DevkitUserType;
    }>("/auth/login", {
      body: JSON.stringify({ email: input.email, password: input.password }),
      method: "POST",
    });
    setToken(input.desk, result.accessToken);
    return { success: true };
  } catch (error) {
    return { error: { message: errorMessage(error) }, success: false };
  }
}

export function getSession(desk: Desk) {
  return request<DevkitSession>("/auth/session", { method: "GET" }, desk);
}

export async function logout(desk: Desk) {
  try {
    if (getToken(desk)) {
      await request("/auth/logout", { body: "{}", method: "POST" }, desk);
    }
  } catch (error) {
    void error;
  } finally {
    clearToken(desk);
  }
}

async function request<T>(
  path: string,
  options: RequestInit,
  desk?: Desk,
): Promise<T> {
  const token = desk ? getToken(desk) : null;
  const response = await fetch(`/api/devkit${path}`, {
    ...options,
    headers: {
      ...(options.body === undefined
        ? {}
        : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const text = await response.text();
  if (!text)
    throw new Error(
      `Devkit API returned an empty response (${response.status}).`,
    );

  let envelope: ApiEnvelope<T>;
  try {
    envelope = JSON.parse(text) as ApiEnvelope<T>;
  } catch {
    throw new Error(
      `Devkit API returned an invalid response (${response.status}).`,
    );
  }
  if (!response.ok || !envelope.success) {
    throw new Error(
      envelope.success ? "Request failed" : envelope.error.message,
    );
  }
  return envelope.data;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Authentication failed.";
}
