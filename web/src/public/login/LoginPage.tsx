import { type ChangeEvent, type FormEvent, useState } from "react";
import { LogIn } from "lucide-react";
import { Button } from "@codexsun/ui/components/button";
import { Field } from "@codexsun/ui/components/Field";
import { AuthLayout } from "@codexsun/ui/layouts/auth-layout";
import { login, type Desk } from "../../shared/auth/auth.services";

export function LoginPage({ desk }: { desk: Desk }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const title = "Developer Login";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const result = await login({ desk, email, password });
      if (!result.success) {
        setMessage(result.error?.message ?? "Login failed.");
        return;
      }
      window.location.assign("/dev");
    } catch {
      setMessage("Network error, please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      description="Use your Platform super admin credentials for the developer desk."
      surface="sa"
      title={title}
    >
      <form className="auth-form" noValidate onSubmit={submit}>
        <Field
          autoComplete="email"
          className="auth-field"
          disabled={loading}
          label="Email"
          name="email"
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            setEmail(event.target.value)
          }
          type="email"
          value={email}
        />
        <Field
          autoComplete="current-password"
          className="auth-field"
          disabled={loading}
          label="Password"
          name="password"
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            setPassword(event.target.value)
          }
          type="password"
          value={password}
        />
        {message ? <p className="form-error">{message}</p> : null}
        <Button disabled={loading} icon={<LogIn size={16} />} type="submit">
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
}
