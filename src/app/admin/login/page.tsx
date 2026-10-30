import AuthPanel from "@/app/auth-panel";
import { adminSignIn } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await requireAdmin()) redirect("/admin");
  const { error } = await searchParams;
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.ADMIN_PASSWORD_HASH &&
      process.env.ADMIN_PROFILE_ID &&
      (process.env.ADMIN_SESSION_SECRET?.length ?? 0) >= 32 &&
      (process.env.ADMIN_RATE_LIMIT_PEPPER?.length ?? 0) >= 32,
  );

  return (
    <AuthPanel
      eyebrow="OWNER ACCESS"
      title="Administrator login."
      description="This area is restricted to the authorized owner administrator."
      error={error}
    >
      {configured ? (
        <>
          <form action={adminSignIn} className="auth-form">
            <label htmlFor="password">Master password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required maxLength={256} />
            <button className="button button-primary auth-submit" type="submit">Open admin dashboard</button>
          </form>
          <p className="auth-switch">Admin authentication uses the Argon2id hash configured on the server.</p>
        </>
      ) : (
        <div className="form-message error-message" role="status">Admin authentication is not configured. Complete the owner setup in README.md; no password is accepted in this state.</div>
      )}
    </AuthPanel>
  );
}
