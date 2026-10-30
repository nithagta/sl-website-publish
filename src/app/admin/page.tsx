import { redirect } from "next/navigation";
import Link from "next/link";
import { Activity, AppWindow, FileClock, Image as ImageIcon, ShieldCheck, Users } from "lucide-react";

import {
  adminSignOut,
  grantUserAccess,
  moderateListing,
  updateUserStatus,
} from "@/app/admin/actions";
import { requireAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

function metric(value: number | null | undefined) {
  return value == null ? "—" : value.toLocaleString();
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string; userSearch?: string; accessUserId?: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) redirect("/admin/login");
  const { error: noticeError, notice, userSearch, accessUserId } = await searchParams;
  const safeSearch = userSearch?.trim().slice(0, 80).replace(/[^\w.@+\- ]/g, "");
  const selectedAccessUserId = accessUserId && /^[0-9a-f-]{36}$/i.test(accessUserId) ? accessUserId : null;

  let userQuery = admin.client
    .from("profiles")
    .select("id,email,full_name,account_status,email_verified,created_at")
    .order("created_at", { ascending: false })
    .limit(10);
  if (safeSearch) {
    userQuery = userQuery.or(`full_name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`);
  }

  const [users, verifiedUsers, activeUsers, blockedUsers, pendingWebsites, approvedWebsites, pendingApps, approvedApps, media, userRows, pendingWebsiteRows, pendingAppRows] =
    await Promise.all([
      admin.client.from("profiles").select("id", { count: "exact", head: true }),
      admin.client.from("profiles").select("id", { count: "exact", head: true }).eq("email_verified", true),
      admin.client.from("profiles").select("id", { count: "exact", head: true }).eq("account_status", "active"),
      admin.client.from("profiles").select("id", { count: "exact", head: true }).eq("account_status", "blocked"),
      admin.client.from("websites").select("id", { count: "exact", head: true }).eq("approval_status", "pending"),
      admin.client.from("websites").select("id", { count: "exact", head: true }).eq("approval_status", "approved").eq("is_published", true),
      admin.client.from("android_apps").select("id", { count: "exact", head: true }).eq("approval_status", "pending"),
      admin.client.from("android_apps").select("id", { count: "exact", head: true }).eq("approval_status", "approved").eq("is_published", true),
      admin.client.from("media_items").select("id", { count: "exact", head: true }),
      userQuery,
      admin.client.from("websites").select("id,name,description,destination_url,developer_name,created_at").in("approval_status", ["pending", "changes_requested"]).order("created_at", { ascending: true }),
      admin.client.from("android_apps").select("id,name,description,developer_name,version,package_name,created_at,external_download_url,apk_path").in("approval_status", ["pending", "changes_requested"]).order("created_at", { ascending: true }),
    ]);

  const selectedUser = userRows.data?.find((user) => user.id === selectedAccessUserId) ?? null;
  const selectedPermissionResult = selectedUser
    ? await admin.client.from("user_permissions").select("*").eq("user_id", selectedUser.id).maybeSingle()
    : null;
  const dataError = [
    users,
    verifiedUsers,
    activeUsers,
    blockedUsers,
    pendingWebsites,
    approvedWebsites,
    pendingApps,
    approvedApps,
    media,
    userRows,
    pendingWebsiteRows,
    pendingAppRows,
  ].find((result) => result.error)?.error;
  return (
    <main className="portal-page">
      <header className="portal-header">
        <Link className="brand" href="/"><span className="brand-symbol">SL</span><span className="brand-copy"><strong>SL Website Publish</strong><small>Owner administration</small></span></Link>
        <form action={adminSignOut}><button className="text-button" type="submit">Sign out</button></form>
      </header>
      <div className="portal-main admin-main">
        <div className="portal-title">
          <div><div className="eyebrow">ADMINISTRATION</div><h1>Platform overview.</h1><p>Owner controls for the SL Website Publish directory.</p></div>
          <span className="account-badge badge-success"><ShieldCheck size={15} /> Owner administrator</span>
        </div>
        {dataError && <div className="inline-error" role="alert">Some dashboard data could not be loaded. Check Supabase configuration and database migrations.</div>}
        {noticeError && <div className="inline-error" role="alert">{noticeError}</div>}
        {notice && <div className="form-message success-message" role="status">{notice}</div>}
        <div className="admin-metrics">
          <article><Users /><span>Registered users</span><strong>{metric(users.count)}</strong></article>
          <article><ShieldCheck /><span>Verified users</span><strong>{metric(verifiedUsers.count)}</strong></article>
          <article><Users /><span>Active users</span><strong>{metric(activeUsers.count)}</strong></article>
          <article><Users /><span>Blocked users</span><strong>{metric(blockedUsers.count)}</strong></article>
          <article><FileClock /><span>Pending websites</span><strong>{metric(pendingWebsites.count)}</strong></article>
          <article><FileClock /><span>Pending Android apps</span><strong>{metric(pendingApps.count)}</strong></article>
          <article><AppWindow /><span>Published websites</span><strong>{metric(approvedWebsites.count)}</strong></article>
          <article><Activity /><span>Published Android apps</span><strong>{metric(approvedApps.count)}</strong></article>
          <article><ImageIcon /><span>Media items</span><strong>{metric(media.count)}</strong></article>
        </div>
        <section className="admin-queue">
          <div className="section-heading compact-heading">
            <div><div className="eyebrow">ACCOUNT CONTROLS</div><h2>User management</h2></div>
          </div>
          <form action="/admin" className="admin-search" method="get">
            <label htmlFor="userSearch">Search by name or email</label>
            <input id="userSearch" name="userSearch" type="search" defaultValue={safeSearch ?? ""} maxLength={80} />
            <button className="button button-outline button-small" type="submit">Search users</button>
          </form>
          {userRows.error ? <p className="inline-error">User records could not be loaded.</p> : (userRows.data?.length ?? 0) === 0 ? (
            <div className="empty-panel compact-empty"><h3>No matching users</h3><p>Only registered profiles can be managed.</p></div>
          ) : userRows.data?.map((user) => (
            <article className="user-row" key={user.id}>
              <div>
                <h3>{user.full_name}</h3>
                <p>{user.email} · {user.email_verified ? "Verified" : "Unverified"} · {user.account_status}</p>
              </div>
              <div className="user-actions">
                <a className="button button-outline button-small" href={`/admin?userSearch=${encodeURIComponent(safeSearch || user.email)}&accessUserId=${user.id}#access-permissions`}>Manage permissions</a>
                <form action={updateUserStatus}>
                  <input type="hidden" name="userId" value={user.id} />
                  <input type="hidden" name="status" value={user.account_status === "blocked" ? "active" : "blocked"} />
                  <button className="button button-outline button-small" type="submit">
                    {user.account_status === "blocked" ? "Unblock account" : "Block account"}
                  </button>
                </form>
              </div>
            </article>
          ))}
          {selectedUser && selectedPermissionResult?.error && (
            <p className="inline-error">This user’s permissions could not be loaded.</p>
          )}
          {selectedUser && selectedPermissionResult && !selectedPermissionResult.error && !selectedPermissionResult.data && (
            <p className="inline-error">No permission record exists for this account; check the user trigger before granting access.</p>
          )}
          {selectedUser && selectedPermissionResult?.data ? (
          <form action={grantUserAccess} className="permission-form" id="access-permissions">
            <h3>Grant or update access for {selectedUser.full_name}</h3>
            <label htmlFor="grant-email">Verified user email</label>
            <input id="grant-email" name="email" type="email" value={selectedUser.email} readOnly required maxLength={254} />
            <div className="permission-checks">
              <label><input name="canSubmitWebsites" type="checkbox" defaultChecked={selectedPermissionResult.data.can_submit_websites} /> Website submissions</label>
              <label><input name="canSubmitApps" type="checkbox" defaultChecked={selectedPermissionResult.data.can_submit_apps} /> Android app submissions</label>
              <label><input name="unlimitedWebsites" type="checkbox" defaultChecked={selectedPermissionResult.data.unlimited_websites} /> Unlimited websites</label>
              <label><input name="unlimitedApps" type="checkbox" defaultChecked={selectedPermissionResult.data.unlimited_apps} /> Unlimited apps</label>
              <label><input name="lifetimeAccess" type="checkbox" defaultChecked={selectedPermissionResult.data.lifetime_access} /> Lifetime access</label>
            </div>
            <div className="permission-limits">
              <div><label htmlFor="websiteLimit">Website limit</label><input id="websiteLimit" name="websiteLimit" type="number" min="0" max="10000" defaultValue={selectedPermissionResult.data.website_limit} required /></div>
              <div><label htmlFor="appLimit">Android app limit</label><input id="appLimit" name="appLimit" type="number" min="0" max="10000" defaultValue={selectedPermissionResult.data.app_limit} required /></div>
              <div><label htmlFor="startsAt">Access starts (ISO-8601 UTC, optional)</label><input id="startsAt" name="startsAt" type="text" defaultValue={selectedPermissionResult.data.starts_at ?? ""} placeholder="2026-10-30T12:00:00Z" /></div>
              <div><label htmlFor="expiresAt">Access expires (ISO-8601 UTC, optional)</label><input id="expiresAt" name="expiresAt" type="text" defaultValue={selectedPermissionResult.data.expires_at ?? ""} placeholder="2026-11-30T12:00:00Z" /></div>
            </div>
            <p className="form-hint">Lifetime access and unlimited submission limits are independent settings. Pending and approved submissions count toward limits.</p>
            <button className="button button-primary button-small" type="submit">Save access permissions</button>
          </form>
          ) : (
            <div className="portal-notice" id="access-permissions"><h3>Select a user to grant or update access</h3><p>Search for the registered account above, then choose Manage permissions.</p></div>
          )}
        </section>
        <section className="admin-queue">
          <div className="section-heading compact-heading"><div><div className="eyebrow">REVIEW QUEUE</div><h2>Website submissions</h2></div></div>
          {pendingWebsiteRows.error ? <p className="inline-error">Website submissions could not be loaded.</p> : (pendingWebsiteRows.data?.length ?? 0) === 0 ? (
            <div className="empty-panel compact-empty"><h3>No pending websites</h3><p>New submissions will appear here for review.</p></div>
          ) : pendingWebsiteRows.data?.map((item) => (
            <article className="review-card" key={item.id}>
              <div><span className="review-meta">{item.developer_name} · {new Date(item.created_at).toLocaleDateString()}</span><h3>{item.name}</h3><p>{item.description}</p><a href={item.destination_url} target="_blank" rel="noopener noreferrer">{item.destination_url}</a></div>
              <div className="review-actions">
                {(["approve", "request_changes", "reject"] as const).map((decision) => (
                  <form action={moderateListing} key={decision}>
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="type" value="website" />
                    <input type="hidden" name="decision" value={decision} />
                    <button className={decision === "approve" ? "button button-primary button-small" : "button button-outline button-small"} type="submit">
                      {decision === "request_changes" ? "Request changes" : decision[0].toUpperCase() + decision.slice(1)}
                    </button>
                  </form>
                ))}
              </div>
            </article>
          ))}
        </section>
        <section className="admin-queue">
          <div className="section-heading compact-heading"><div><div className="eyebrow">REVIEW QUEUE</div><h2>Android app submissions</h2></div></div>
          {pendingAppRows.error ? <p className="inline-error">Android app submissions could not be loaded.</p> : (pendingAppRows.data?.length ?? 0) === 0 ? (
            <div className="empty-panel compact-empty"><h3>No pending apps</h3><p>New submissions will appear here for review.</p></div>
          ) : pendingAppRows.data?.map((item) => (
            <article className="review-card" key={item.id}>
              <div><span className="review-meta">{item.developer_name} · {new Date(item.created_at).toLocaleDateString()}</span><h3>{item.name} <small>v{item.version}</small></h3><p>{item.description}</p><p className="review-meta">Package: {item.package_name} · {item.apk_path ? "APK uploaded" : "External APK link"}</p></div>
              <div className="review-actions">
                {(["approve", "request_changes", "reject"] as const).map((decision) => (
                  <form action={moderateListing} key={decision}>
                    <input type="hidden" name="id" value={item.id} />
                    <input type="hidden" name="type" value="app" />
                    <input type="hidden" name="decision" value={decision} />
                    <button className={decision === "approve" ? "button button-primary button-small" : "button button-outline button-small"} type="submit">
                      {decision === "request_changes" ? "Request changes" : decision[0].toUpperCase() + decision.slice(1)}
                    </button>
                  </form>
                ))}
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
