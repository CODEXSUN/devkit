export type Desk = "sa" | "admin";
export type PlatformUserType = "super_admin" | "staff";

export type PlatformSession = {
  authenticated: true;
  email: string;
  expiresAt: string;
  name?: string;
  sessionIssuedAt?: string;
  userType: PlatformUserType;
};

const tokenKeys: Record<Desk, string> = {
  admin: "codexsun_session_admin",
  sa: "codexsun_session_sa",
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
  return pathname.startsWith("/admin") ? "admin" : "sa";
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
    const expectedUserType = desk === "sa" ? "super_admin" : "staff";
    return (
      typeof claims.exp === "number" &&
      claims.exp * 1000 > Date.now() &&
      claims.userType === expectedUserType
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
      name?: string;
      userType: PlatformUserType;
    }>("/auth/platform/login", {
      body: JSON.stringify(input),
      method: "POST",
    });
    setToken(input.desk, result.accessToken);
    return { success: true };
  } catch (error) {
    return { error: { message: errorMessage(error) }, success: false };
  }
}

export function getSession(desk: Desk) {
  return request<PlatformSession>(
    "/auth/platform/session",
    { method: "GET" },
    desk,
  );
}

export async function logout(desk: Desk) {
  try {
    if (getToken(desk)) {
      await request(
        "/auth/platform/logout",
        { body: "{}", method: "POST" },
        desk,
      );
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
