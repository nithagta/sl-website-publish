import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarClock, ShieldCheck, Smartphone, Globe2 } from "lucide-react";

import { signOut } from "@/app/actions/auth";
import { submitApp, submitWebsite } from "@/app/actions/submissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; submitted?: string }>;
}) {
  const { error: formError, submitted } = await searchParams;
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return (
      <main className="portal-page">
        <Link className="brand" href="/"><span className="brand-symbol">SL</span><span className="brand-copy"><strong>SL Website Publish</strong><small>by Nithish Studio</small></span></Link>
        <div className="portal-notice"><h1>Account services are not configured</h1><p>Set up Supabase Auth and apply the database migration before using the dashboard.</p></div>
      </main>
    );
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const [profileResult, permissionResult, websitesResult, appsResult, activePermissionResult, categoriesResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("user_permissions").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("websites").select("id,approval_status,name").eq("owner_id", user.id),
    supabase.from("android_apps").select("id,approval_status,name").eq("owner_id", user.id),
    supabase.rpc("has_active_permission", { p_user_id: user.id }),
    supabase.from("categories").select("*").eq("is_active", true).order("name"),
  ]);
  const error =
    profileResult.error ??
    permissionResult.error ??
    websitesResult.error ??
    appsResult.error ??
    activePermissionResult.error ??
    categoriesResult.error;

  if (profileResult.data?.is_admin) redirect("/admin");

  const profile = profileResult.data;
  const permission = permissionResult.data;
  const websites = websitesResult.data ?? [];
  const apps = appsResult.data ?? [];
  const categories = (categoriesResult.data ?? []) as Category[];
  const activePermission = activePermissionResult.data === true;
  const activeWebsites = websites.filter((item) => item.approval_status !== "rejected");
  const activeApps = apps.filter((item) => item.approval_status !== "rejected");
  const websiteRemaining = permission?.unlimited_websites
    ? "Unlimited"
    : Math.max(0, (permission?.website_limit ?? 0) - activeWebsites.length).toString();
  const appRemaining = permission?.unlimited_apps
    ? "Unlimited"
    : Math.max(0, (permission?.app_limit ?? 0) - activeApps.length).toString();
  const canSubmitWebsite =
    !!permission?.can_submit_websites &&
    (permission.unlimited_websites || websiteRemaining !== "0");
  const canSubmitApp =
    !!permission?.can_submit_apps &&
    (permission.unlimited_apps || appRemaining !== "0");

  return (
    <main className="portal-page">
      <header className="portal-header">
        <Link className="brand" href="/"><span className="brand-symbol">SL</span><span className="brand-copy"><strong>SL Website Publish</strong><small>Creator dashboard</small></span></Link>
        <form action={signOut}><button className="text-button" type="submit">Sign out</button></form>
      </header>
      <div className="portal-main">
        <div className="portal-title">
          <div><div className="eyebrow">YOUR WORKSPACE</div><h1>Welcome, {profile?.full_name ?? user.user_metadata.full_name ?? "creator"}.</h1><p>{user.email}</p></div>
          <span className={`account-badge ${profile?.account_status === "blocked" ? "badge-danger" : "badge-success"}`}>
            <ShieldCheck size={15} /> {profile?.account_status ?? "pending profile"}
          </span>
        </div>
        {error && <div className="inline-error" role="alert">Dashboard information could not be loaded. Please try again later.</div>}
        {formError && <div className="inline-error" role="alert">{formError}</div>}
        {submitted && (
          <div className="form-message success-message" role="status">
            Your submission has been received and is awaiting administrator approval.
          </div>
        )}
        {profile?.account_status === "blocked" ? (
          <div className="portal-notice"><h2>Account access is suspended</h2><p>Please contact Nithish Studio on WhatsApp if you need help.</p><a href="https://wa.me/94754345412" target="_blank" rel="noopener noreferrer">Contact on WhatsApp ↗</a></div>
        ) : !user.email_confirmed_at ? (
          <div className="portal-notice"><h2>Verify your email address</h2><p>Your email must be verified before creator access can be requested.</p></div>
        ) : !permission || !activePermission ? (
          <div className="portal-notice">
            <h2>Creator submissions are locked</h2>
            <p>Your email has been verified. Please contact Nithish Studio on WhatsApp to request submission access.</p>
            <a className="button button-primary" href="https://wa.me/94754345412" target="_blank" rel="noopener noreferrer">Request access on WhatsApp</a>
          </div>
        ) : (
          <>
            <div className="permission-panel">
              <div><span className="eyebrow">SUBMISSION ACCESS</span><h2>Your permissions</h2></div>
              <p>{permission.lifetime_access ? "Lifetime access" : permission.expires_at ? `Available until ${new Date(permission.expires_at).toLocaleDateString()}` : "Active access"}</p>
            </div>
            <div className="dashboard-stats">
              <article><Globe2 /><span>Websites</span><strong>{websites.length} <small>submitted</small></strong><p>{permission.can_submit_websites ? `${websiteRemaining} slots remaining` : "Not enabled"}</p></article>
              <article><Smartphone /><span>Android apps</span><strong>{apps.length} <small>submitted</small></strong><p>{permission.can_submit_apps ? `${appRemaining} slots remaining` : "Not enabled"}</p></article>
              <article><CalendarClock /><span>Access</span><strong>{permission.lifetime_access ? "Lifetime" : "Time limited"}</strong><p>{permission.expires_at ? `Expires ${new Date(permission.expires_at).toLocaleDateString()}` : "No expiry date set"}</p></article>
            </div>
            <section className="submission-lists">
              <div><h2>My websites</h2>{websites.length ? websites.map((item) => <p key={item.id}>{item.name}<span>{item.approval_status.replace("_", " ")}</span></p>) : <p>No website submissions yet.</p>}</div>
              <div><h2>My Android apps</h2>{apps.length ? apps.map((item) => <p key={item.id}>{item.name}<span>{item.approval_status.replace("_", " ")}</span></p>) : <p>No app submissions yet.</p>}</div>
            </section>
            <section className="creator-submissions">
              <div className="section-heading compact-heading">
                <div><div className="eyebrow">CREATOR TOOLS</div><h2>Submit for review</h2></div>
              </div>
              <div className="creator-form-grid">
                <form action={submitWebsite} className="submission-form">
                  <h3>Submit a website</h3>
                  {canSubmitWebsite ? (
                    <>
                      <label htmlFor="website-name">Website name</label>
                      <input id="website-name" name="name" required minLength={2} maxLength={120} />
                      <label htmlFor="website-url">Actual website address</label>
                      <input id="website-url" name="destinationUrl" type="url" required placeholder="https://example.com" />
                      <label htmlFor="website-description">Description</label>
                      <textarea id="website-description" name="description" required minLength={10} maxLength={3000} rows={4} />
                      <label htmlFor="website-developer">Developer name</label>
                      <input id="website-developer" name="developerName" required minLength={2} maxLength={120} />
                      <label htmlFor="website-contact">Contact information</label>
                      <input id="website-contact" name="contactInformation" required minLength={2} maxLength={300} />
                      <label htmlFor="website-category">Category</label>
                      <select id="website-category" name="categoryId" defaultValue="">
                        <option value="">Choose a category</option>
                        {categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}
                      </select>
                      <p className="form-hint">Logo upload is not yet available. Your verified access and remaining limit are enforced by the database.</p>
                      <button className="button button-primary auth-submit" type="submit">Submit website for approval</button>
                    </>
                  ) : <p className="form-hint">Website submissions are not enabled for your account or your assigned limit has been reached.</p>}
                </form>
                <form action={submitApp} className="submission-form">
                  <h3>Submit an Android app</h3>
                  {canSubmitApp ? (
                    <>
                      <label htmlFor="app-name">Android app name</label>
                      <input id="app-name" name="name" required minLength={2} maxLength={120} />
                      <label htmlFor="app-description">Description</label>
                      <textarea id="app-description" name="description" required minLength={10} maxLength={3000} rows={4} />
                      <label htmlFor="app-download">External APK download link</label>
                      <input id="app-download" name="externalDownloadUrl" type="url" required placeholder="https://..." />
                      <label htmlFor="app-play">Google Play link (optional)</label>
                      <input id="app-play" name="googlePlayUrl" type="url" placeholder="https://play.google.com/..." />
                      <label htmlFor="app-developer">Developer name</label>
                      <input id="app-developer" name="developerName" required minLength={2} maxLength={120} />
                      <label htmlFor="app-version">Application version</label>
                      <input id="app-version" name="version" required maxLength={40} />
                      <label htmlFor="app-package">Package name</label>
                      <input id="app-package" name="packageName" required placeholder="com.example.app" />
                      <label htmlFor="app-category">Category</label>
                      <select id="app-category" name="categoryId" defaultValue="">
                        <option value="">Choose a category</option>
                        {categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}
                      </select>
                      <p className="form-hint">APK file and logo uploads are not yet available. External download links must use HTTPS.</p>
                      <button className="button button-primary auth-submit" type="submit">Submit app for approval</button>
                    </>
                  ) : <p className="form-hint">Android app submissions are not enabled for your account or your assigned limit has been reached.</p>}
                </form>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
