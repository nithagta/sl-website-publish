import AuthPanel from "@/app/auth-panel";
import { signIn } from "@/app/actions/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );

  return (
    <AuthPanel
      eyebrow="WELCOME BACK"
      title="Sign in to your account."
      description="Access your creator dashboard and manage your submissions."
      error={error}
    >
      {configured ? (
        <>
          <form action={signIn} className="auth-form">
            <label htmlFor="email">Email address</label>
            <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} />
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required />
            <button className="button button-primary auth-submit" type="submit">Sign in</button>
          </form>
          <p className="auth-switch">New to the directory? <a href="/register">Create an account</a></p>
        </>
      ) : (
        <div className="form-message error-message" role="status">Sign-in is unavailable until Supabase is configured on the server.</div>
      )}
    </AuthPanel>
  );
}
