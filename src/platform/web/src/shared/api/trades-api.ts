export type TradesWebClient = { baseUrl: string; getAccessToken(): string | null };
let client: TradesWebClient = {
  baseUrl: "/api/platform",
  getAccessToken: () => {
    try {
      return localStorage.getItem("trades_session");
    } catch {
      return null;
    }
  }
};
export function configureTradesWebClient(configuration: Partial<TradesWebClient>) {
  client = { ...client, ...configuration };
}
type ApiEnvelope<T> = { data: T; success: true } | { error: { message: string }; success: false };
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = client.getAccessToken();
  const response = await fetch(`${client.baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body === undefined ? {} : { "content-type": "application/json" }),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  const envelope = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !envelope?.success) {
    throw new Error(envelope && !envelope.success ? envelope.error.message : `Trades request failed (${response.status}).`);
  }
  return envelope.data;
}
export const apiGet = <T,>(path: string) => request<T>(path, { method: "GET" });
export const apiPost = <T,>(path: string, data?: unknown) => request<T>(path, { body: JSON.stringify(data ?? {}), method: "POST" });
export const apiPut = <T,>(path: string, data?: unknown) => request<T>(path, { body: JSON.stringify(data ?? {}), method: "PUT" });
export const apiDelete = <T,>(path: string) => request<T>(path, { method: "DELETE" });
