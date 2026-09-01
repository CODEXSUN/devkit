import { GlobalLoader } from "@codexsun/ui/components/global-loader";
import type { ReactElement } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  apiGet,
  getToken,
  redirectToLoginForExpiredSession,
  tokenExpiresAt,
  tokenIsCurrent
} from "../api/platform-api";

export function AuthGate({ children, requireSuperAdmin = false }: { children: ReactElement; requireSuperAdmin?: boolean }) {
  const token = useMemo(() => getToken(), []);
  const expiresAt = useMemo(() => tokenExpiresAt(token), [token]);
  const localValid = useMemo(() => tokenIsCurrent(token), [token]);
  const [serverValid, setServerValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!localValid) {
      setServerValid(false);
      return;
    }
    let cancelled = false;
    void apiGet<{ authenticated: boolean; superAdmin?: boolean }>("/auth/session")
      .then((session) => !cancelled && setServerValid(session.authenticated && (!requireSuperAdmin || session.superAdmin === true)))
      .catch(() => !cancelled && setServerValid(false));
    return () => {
      cancelled = true;
    };
  }, [localValid, requireSuperAdmin]);

  useEffect(() => {
    if (serverValid !== false) return;
    redirectToLoginForExpiredSession(requireSuperAdmin ? "/sa/login" : "/login");
  }, [requireSuperAdmin, serverValid]);

  useEffect(() => {
    if (!expiresAt) return;
    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      redirectToLoginForExpiredSession(requireSuperAdmin ? "/sa/login" : "/login");
      return;
    }
    const timeout = window.setTimeout(() => redirectToLoginForExpiredSession(requireSuperAdmin ? "/sa/login" : "/login"), remaining);
    return () => window.clearTimeout(timeout);
  }, [expiresAt, requireSuperAdmin]);

  if (serverValid === true) return children;
  return <GlobalLoader />;
}
