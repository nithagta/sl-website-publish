import AuthPanel from "@/app/auth-panel";

export default function CheckEmailPage() {
  return (
    <AuthPanel
      eyebrow="ONE LAST STEP"
      title="Check your inbox."
      description="If the address can be registered, Supabase has sent a verification link. Follow it to verify your email and activate your account."
    >
      <div className="form-message success-message">
        Email delivery is handled by your configured Supabase Auth provider. If no email arrives, check the provider configuration and spam folder.
      </div>
      <p className="auth-switch"><a href="/login">Return to sign in</a></p>
    </AuthPanel>
  );
}
