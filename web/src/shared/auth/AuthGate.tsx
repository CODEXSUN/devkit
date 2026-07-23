import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { Button } from "@codexsun/ui/components/button";
import { Card } from "@codexsun/ui/components/card";
import { GlobalLoader } from "@codexsun/ui/components/global-loader";
import { StatusBadge } from "@codexsun/ui/components/StatusBadge";
import {
  clearToken,
  getSession,
  isLocalSessionValid,
  type Desk,
  type PlatformSession,
} from "./auth.services";

const loginPaths: Record<Desk, string> = {
  admin: "/admin/login",
  sa: "/sa/login",
};

const deskLabels: Record<Desk, string> = {
  admin: "staff admin",
  sa: "super admin",
};

export function AuthGate({
  children,
  desk,
}: {
  children: (session: PlatformSession) => ReactElement;
  desk: Desk;
}) {
  const [session, setSession] = useState<PlatformSession | null | undefined>(
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
        const expectedUserType = desk === "sa" ? "super_admin" : "staff";
        if (!cancelled && result.userType === expectedUserType)
          setSession(result);
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

  if (session) return children(session);
  if (session === undefined) return <GlobalLoader />;

  return (
    <main className="simple-page">
      <Card title="Login required">
        <StatusBadge tone="red">Blocked</StatusBadge>
        <p className="mb-6 mt-4">
          You need an active {deskLabels[desk]} Platform session to view this
          page.
        </p>
        <Button
          className="w-full"
          onClick={() => window.location.assign(loginPaths[desk])}
        >
          Go to Login
        </Button>
      </Card>
    </main>
  );
}
