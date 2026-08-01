import { ArrowRight, Building2, CheckCircle2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

export function TradesLandingLayout({ children }: { children: ReactNode }) {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(
      () => setSlide((current) => (current + 1) % messages.length),
      4200
    );
    return () => window.clearInterval(timer);
  }, []);

  return (
    <main className="trades-login-page">
      <section className="trades-login-shell" aria-label="DevKit Login">
        <div className="trades-login-story">
          <div className="trades-login-brand">
            <span className="auth-surface-mark" data-surface="app">
              <Logo />
              <span className="auth-surface-badge">
                <Building2 size={13} strokeWidth={2.25} />
              </span>
            </span>
            <span>
              <strong>DevKit</strong>
              <small>Developer planning and delivery workspace</small>
            </span>
          </div>
          <div className="trades-login-slider" aria-live="polite">
            <span className="trades-login-eyebrow">
              <CheckCircle2 size={14} /> Local authentication
            </span>
            <p key={messages[slide]}>{messages[slide]}</p>
            <div className="trades-login-dots" aria-hidden="true">
              {messages.map((message, index) => (
                <span className={index === slide ? "is-active" : ""} key={message} />
              ))}
            </div>
          </div>
          <p className="trades-login-footnote">
            Projects, tasks, planning, registry, and automation in one desk <ArrowRight size={14} />
          </p>
        </div>
        <div className="trades-login-panel">
          <div className="trades-login-panel-brand" aria-hidden="true">
            <Logo />
            <span>DevKit</span>
          </div>
          <div className="auth-card-frame auth-card-frame-app trades-login-card-frame">
            <div className="auth-card trades-login-card">
              <header className="auth-card-header">
                <h1>Welcome back</h1>
                <p>Access DevKit with your registered credentials.</p>
              </header>
              {children}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Logo() {
  return (
    <>
      <img
        className="auth-logo-image trades-auth-logo-light"
        src="/logo/logo.svg"
        alt=""
        aria-hidden="true"
      />
      <img
        className="auth-logo-image trades-auth-logo-dark"
        src="/logo/logo-dark.svg"
        alt=""
        aria-hidden="true"
      />
    </>
  );
}

const messages = [
  "Plan projects and connect issues, tasks, activities, and reviews.",
  "Capture reusable whiteboards and link them to delivery records.",
  "Track repositories, platform modules, and daily development priorities."
];
