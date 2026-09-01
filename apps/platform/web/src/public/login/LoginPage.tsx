import { Button } from "@codexsun/ui/components/button";
import { Field } from "@codexsun/ui/components/Field";
import { GlobalLoader } from "@codexsun/ui/components/global-loader";
import { Alert, AlertDescription, AlertTitle } from "@codexsun/ui/components/alert";
import { useNavigate } from "@tanstack/react-router";
import { LogIn, TriangleAlert } from "lucide-react";
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import {
  apiGet,
  clearToken,
  clearSessionExpiredWarning,
  developmentLogin,
  getToken,
  hasSessionExpiredWarning,
  login,
  redirectToLoginForExpiredSession,
  tokenIsCurrent
} from "../../shared/api/platform-api";
import { applicationEntryPath } from "../../desks/app/app-shell-access";
import { PlatformAuthLayout } from "./PlatformAuthLayout";
import { PlatformLandingLayout } from "./PlatformLandingLayout";

export function LoginPage() {
  return <LoginSurface landing={false} />;
}

export function SuperAdminLoginPage() {
  return <LoginSurface landing={false} superAdmin />;
}

export function LandingLoginPage() {
  return <LoginSurface landing />;
}

function LoginSurface({ landing, superAdmin = false }: { landing: boolean; superAdmin?: boolean }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [sessionExpiredWarning] = useState(hasSessionExpiredWarning);
  const [loading, setLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const autoLoginStarted = useRef(false);

  useEffect(() => {
    const timeout = window.setTimeout(clearSessionExpiredWarning, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!tokenIsCurrent(token)) {
      if (token) {
        redirectToLoginForExpiredSession();
        return;
      }
      clearToken();
      setSessionChecked(true);
      return;
    }
    let cancelled = false;
    void apiGet<{ authenticated: boolean; role?: string; superAdmin?: boolean }>("/auth/session")
      .then((session) => {
        if (cancelled) return;
        if (session.authenticated && (!superAdmin || session.superAdmin)) {
          void navigate({ replace: true, to: superAdmin ? "/sa" : applicationEntryPath() });
          return;
        }
        clearToken();
        setSessionChecked(true);
      })
      .catch(() => {
        if (cancelled) return;
        clearToken();
        setSessionChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [navigate, superAdmin]);

  useEffect(() => {
    if (
      !sessionChecked ||
      !import.meta.env.DEV ||
      import.meta.env.VITE_DEV_AUTO_LOGIN !== "1" ||
      autoLoginStarted.current
    ) {
      return;
    }
    autoLoginStarted.current = true;
    setLoading(true);
    void developmentLogin()
      .then((result) => {
        if (result.success && (!superAdmin || result.data.superAdmin)) {
          void navigate({ replace: true, to: superAdmin ? "/sa" : applicationEntryPath() });
        } else if (result.success) {
          clearToken();
          setMessage("The development account is not assigned to Super Admin.");
        } else setMessage(result.error.message);
      })
      .finally(() => setLoading(false));
  }, [navigate, sessionChecked, superAdmin]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const result = await login({ email, password });
    if (result.success) {
      if (superAdmin && !result.data.superAdmin) {
        clearToken();
        setMessage("This account is not assigned to Super Admin.");
      } else void navigate({ replace: true, to: superAdmin ? "/sa" : applicationEntryPath() });
    } else setMessage(result.error.message);
    setLoading(false);
  }

  if (!sessionChecked) return <GlobalLoader />;

  const form = (
    <form className="auth-form" onSubmit={submit}>
      {sessionExpiredWarning ? (
        <Alert className="auth-session-warning" variant="destructive">
          <TriangleAlert className="size-4" />
          <AlertTitle>Session expired</AlertTitle>
          <AlertDescription>Your session ended. Sign in again to continue.</AlertDescription>
        </Alert>
      ) : null}
      <Field
        autoComplete="email"
        className="auth-field"
        label="Email"
        name="email"
        disabled={loading}
        onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
        type="email"
        value={email}
      />
      <Field
        autoComplete="current-password"
        className="auth-field"
        label="Password"
        name="password"
        disabled={loading}
        onChange={(event: ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
        type="password"
        value={password}
      />
      {message ? <p className="form-error">{message}</p> : null}
      <Button
        className={landing ? "auth-submit" : undefined}
        disabled={loading}
        icon={<LogIn size={16} />}
        type="submit"
      >
        {loading ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );

  return landing ? (
    <PlatformLandingLayout>{form}</PlatformLandingLayout>
  ) : (
    <PlatformAuthLayout surface="app" title={superAdmin ? "Super Admin Login" : "CodeLogicX Login"}>
      {form}
    </PlatformAuthLayout>
  );
}
