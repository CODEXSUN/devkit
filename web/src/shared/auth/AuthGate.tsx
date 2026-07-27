import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { GlobalLoader } from "@codexsun/ui/components/global-loader";
import {
  clearToken,
  type DevkitSession,
  getSession,
  isLocalSessionValid,
  type Desk,
} from "./auth.services";

const loginPaths: Record<Desk, string> = {
  dev: "/dev/login",
};

export function AuthGate({
  children,
  desk,
}: {
  children: (session: DevkitSession) => ReactElement;
  desk: Desk;
}) {
  const [session, setSession] = useState<DevkitSession | null | undefined>(
    undefined,
  );

  useEffect(() => {
    let cancelled = false;
    if (!isLocalSessionValid(desk)) {
      setSession(null);
      return;
    }

    void getSession(desk)
      .then((result) => {
        if (!cancelled && result.userType === "developer") setSession(result);
        else if (!cancelled) setSession(null);
      })
      .catch(() => {
        clearToken(desk);
        if (!cancelled) setSession(null);
      });

    return () => {
      cancelled = true;
    };
  }, [desk]);

  useEffect(() => {
    if (session === null) window.location.replace(loginPaths[desk]);
  }, [desk, session]);

  if (session) return children(session);
  return <GlobalLoader />;
}
