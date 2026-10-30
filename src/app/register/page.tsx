import AuthPanel from "@/app/auth-panel";
import { register } from "@/app/actions/auth";

export default async function RegisterPage({
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
      eyebrow="JOIN THE COMMUNITY"
      title="Create your account."
      description="Register to request creator access. Email verification is required."
      error={error}
    >
      {configured ? (
        <>
          <form action={register} className="auth-form">
            <label htmlFor="fullName">Full name</label>
            <input id="fullName" name="fullName" autoComplete="name" required minLength={2} maxLength={100} />
            <label htmlFor="email">Email address</label>
            <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} />
            <label htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={128} />
            <label htmlFor="confirmPassword">Confirm password</label>
            <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required minLength={10} maxLength={128} />
            <p className="form-hint">Use at least 10 characters. Your password is never shared with the directory.</p>
            <button className="button button-primary auth-submit" type="submit">Create account</button>
          </form>
          <p className="auth-switch">Already registered? <a href="/login">Sign in</a></p>
        </>
      ) : (
        <div className="form-message error-message" role="status">Registration is unavailable until Supabase Auth is configured on the server.</div>
      )}
    </AuthPanel>
  );
}
