import type { ReactNode } from "react";
import Link from "next/link";

export default function AuthPanel({
  eyebrow,
  title,
  description,
  error,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <main className="auth-page">
      <Link className="brand auth-brand" href="/">
        <span className="brand-symbol">SL</span>
        <span className="brand-copy"><strong>SL Website Publish</strong><small>by Nithish Studio</small></span>
      </Link>
      <section className="auth-card">
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p className="auth-description">{description}</p>
        {error && <div className="form-message error-message" role="alert">{error}</div>}
        {children}
      </section>
      <Link className="auth-back" href="/">← Back to the directory</Link>
    </main>
  );
}
