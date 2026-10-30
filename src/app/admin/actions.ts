"use server";

import "server-only";

import { createHash } from "node:crypto";
import argon2 from "argon2";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  adminCookieName,
  createAdminServiceClient,
  createAdminToken,
  requireAdmin,
  setAdminSession,
} from "@/lib/admin";

const passwordSchema = z.string().min(1).max(256);
const uuidSchema = z.uuid();

async function rateLimitFingerprint() {
  const pepper = process.env.ADMIN_RATE_LIMIT_PEPPER;
  if (!pepper || pepper.length < 32) return null;
  const requestHeaders = await headers();
  const source =
    requestHeaders.get("x-vercel-forwarded-for") ??
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    requestHeaders.get("x-real-ip") ??
    "unknown-client";
  return createHash("sha256").update(`${pepper}:${source}`).digest("hex");
}

export async function adminSignIn(formData: FormData) {
  const password = passwordSchema.safeParse(formData.get("password"));
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  const adminId = process.env.ADMIN_PROFILE_ID;
  const client = createAdminServiceClient();
  const fingerprint = await rateLimitFingerprint();

  if (!password.success || !passwordHash || !adminId || !client || !fingerprint) {
    redirect("/admin/login?error=Admin%20authentication%20is%20not%20configured.");
  }

  const { data: canAttempt, error: limitError } = await client.rpc(
    "consume_admin_login_attempt",
    { p_fingerprint: fingerprint },
  );
  if (limitError || !canAttempt) {
    redirect("/admin/login?error=Too%20many%20attempts%20or%20rate%20limiting%20is%20unavailable.");
  }

  let validPassword = false;
  try {
    validPassword = await argon2.verify(passwordHash, password.data);
  } catch (error) {
    console.error("Could not verify configured administrator password hash:", error);
    redirect("/admin/login?error=Administrator%20authentication%20is%20misconfigured.");
  }

  const { error: recordError } = await client.rpc("record_admin_login_attempt", {
    p_fingerprint: fingerprint,
    p_succeeded: validPassword,
  });
  if (recordError) {
    console.error("Could not record administrator login attempt:", recordError.message);
    redirect("/admin/login?error=Administrator%20rate%20limiting%20is%20unavailable.");
  }
  if (!validPassword) {
    redirect("/admin/login?error=The%20administrator%20password%20is%20incorrect.");
  }

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id,is_admin,account_status")
    .eq("id", adminId)
    .maybeSingle();
  if (profileError || !profile?.is_admin || profile.account_status !== "active") {
    redirect("/admin/login?error=The%20configured%20owner%20profile%20is%20not%20authorized.");
  }

  try {
    const token = await createAdminToken(profile.id);
    await setAdminSession(token);
  } catch (error) {
    console.error("Could not create administrator session:", error);
    redirect("/admin/login?error=Administrator%20session%20configuration%20is%20invalid.");
  }

  redirect("/admin");
}

export async function adminSignOut() {
  const cookieStore = await cookies();
  cookieStore.delete(adminCookieName);
  redirect("/admin/login");
}

const moderationSchema = z.object({
  id: uuidSchema,
  type: z.enum(["website", "app"]),
  decision: z.enum(["approve", "reject", "request_changes", "unpublish"]),
});

const accessSchema = z.object({
  email: z.email().trim().max(254),
  canSubmitWebsites: z.preprocess((value) => value === "on", z.boolean()),
  canSubmitApps: z.preprocess((value) => value === "on", z.boolean()),
  websiteLimit: z.coerce.number().int().min(0).max(10000),
  appLimit: z.coerce.number().int().min(0).max(10000),
  unlimitedWebsites: z.preprocess((value) => value === "on", z.boolean()),
  unlimitedApps: z.preprocess((value) => value === "on", z.boolean()),
  lifetimeAccess: z.preprocess((value) => value === "on", z.boolean()),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
});

export async function grantUserAccess(formData: FormData) {
  const parsed = accessSchema.safeParse({
    email: formData.get("email"),
    canSubmitWebsites: formData.get("canSubmitWebsites"),
    canSubmitApps: formData.get("canSubmitApps"),
    websiteLimit: formData.get("websiteLimit"),
    appLimit: formData.get("appLimit"),
    unlimitedWebsites: formData.get("unlimitedWebsites"),
    unlimitedApps: formData.get("unlimitedApps"),
    lifetimeAccess: formData.get("lifetimeAccess"),
    startsAt: formData.get("startsAt")?.toString(),
    expiresAt: formData.get("expiresAt")?.toString(),
  });
  const admin = await requireAdmin();
  if (!parsed.success || !admin) redirect("/admin/login?error=Administrator%20authorization%20required.");

  const startsAt = parsed.data.startsAt ? new Date(parsed.data.startsAt) : null;
  const expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;
  if (
    (startsAt && Number.isNaN(startsAt.getTime())) ||
    (expiresAt && Number.isNaN(expiresAt.getTime())) ||
    (startsAt && expiresAt && expiresAt <= startsAt)
  ) {
    redirect("/admin?error=The%20access%20date%20range%20is%20invalid.");
  }

  const email = parsed.data.email.toLowerCase();
  const { data: profile, error: profileError } = await admin.client
    .from("profiles")
    .select("id,email_verified")
    .eq("email", email)
    .maybeSingle();
  if (profileError || !profile) {
    redirect("/admin?error=No%20registered%20profile%20matches%20that%20email.");
  }
  if (!profile.email_verified) {
    redirect("/admin?error=Verify%20the%20user%27s%20email%20before%20granting%20submission%20access.");
  }

  const { error } = await admin.client.from("user_permissions").upsert({
    user_id: profile.id,
    can_submit_websites: parsed.data.canSubmitWebsites,
    can_submit_apps: parsed.data.canSubmitApps,
    website_limit: parsed.data.websiteLimit,
    app_limit: parsed.data.appLimit,
    unlimited_websites: parsed.data.unlimitedWebsites,
    unlimited_apps: parsed.data.unlimitedApps,
    starts_at: startsAt?.toISOString() ?? null,
    expires_at: parsed.data.lifetimeAccess ? null : expiresAt?.toISOString() ?? null,
    lifetime_access: parsed.data.lifetimeAccess,
  });
  if (error) {
    console.error("Could not update user submission permissions:", error.message);
    redirect("/admin?error=The%20user%20permissions%20could%20not%20be%20saved.");
  }

  const { error: auditError } = await admin.client.from("admin_audit_logs").insert({
    admin_id: admin.adminId,
    action: "update_permissions",
    target_type: "user",
    target_id: profile.id,
    details: {
      can_submit_websites: parsed.data.canSubmitWebsites,
      can_submit_apps: parsed.data.canSubmitApps,
      website_limit: parsed.data.websiteLimit,
      app_limit: parsed.data.appLimit,
      unlimited_websites: parsed.data.unlimitedWebsites,
      unlimited_apps: parsed.data.unlimitedApps,
      lifetime_access: parsed.data.lifetimeAccess,
    },
  });
  if (auditError) {
    console.error("Could not record permission update in audit log:", auditError.message);
    redirect("/admin?error=Permissions%20were%20saved%20but%20the%20audit%20log%20could%20not%20be%20written.");
  }

  redirect("/admin?notice=User%20permissions%20updated.");
}

const userStatusSchema = z.object({
  userId: uuidSchema,
  status: z.enum(["active", "blocked"]),
});

export async function updateUserStatus(formData: FormData) {
  const parsed = userStatusSchema.safeParse({
    userId: formData.get("userId"),
    status: formData.get("status"),
  });
  const admin = await requireAdmin();
  if (!parsed.success || !admin) redirect("/admin/login?error=Administrator%20authorization%20required.");
  if (parsed.data.userId === admin.adminId && parsed.data.status === "blocked") {
    redirect("/admin?error=The%20owner%20administrator%20cannot%20block%20their%20own%20account.");
  }

  const { data, error } = await admin.client
    .from("profiles")
    .update({ account_status: parsed.data.status })
    .eq("id", parsed.data.userId)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("Could not update user status:", error?.message ?? "No profile matched.");
    redirect("/admin?error=The%20account%20status%20could%20not%20be%20updated.");
  }

  const { error: auditError } = await admin.client.from("admin_audit_logs").insert({
    admin_id: admin.adminId,
    action: parsed.data.status === "blocked" ? "block_user" : "unblock_user",
    target_type: "user",
    target_id: parsed.data.userId,
    details: {},
  });
  if (auditError) {
    console.error("Could not record account status change:", auditError.message);
    redirect("/admin?error=Account%20status%20was%20changed%20but%20the%20audit%20log%20could%20not%20be%20written.");
  }
  redirect("/admin?notice=User%20account%20status%20updated.");
}

export async function moderateListing(formData: FormData) {
  const parsed = moderationSchema.safeParse({
    id: formData.get("id"),
    type: formData.get("type"),
    decision: formData.get("decision"),
  });
  const admin = await requireAdmin();
  if (!parsed.success || !admin) redirect("/admin/login?error=Administrator%20authorization%20required.");

  const table = parsed.data.type === "website" ? "websites" : "android_apps";
  const status =
    parsed.data.decision === "approve"
      ? "approved"
      : parsed.data.decision === "reject"
        ? "rejected"
        : parsed.data.decision === "request_changes"
          ? "changes_requested"
          : undefined;
  const published = parsed.data.decision === "approve";
  const updateQuery = admin.client.from(table).update({
    ...(status ? { approval_status: status } : {}),
    is_published: published,
  }).eq("id", parsed.data.id);
  const { data, error } = await updateQuery.select("id").maybeSingle();
  if (error || !data) {
    console.error("Administrator listing moderation failed:", error?.message ?? "No listing matched.");
    redirect("/admin?error=The%20listing%20could%20not%20be%20updated.");
  }

  const { error: auditError } = await admin.client.from("admin_audit_logs").insert({
    admin_id: admin.adminId,
    action: parsed.data.decision,
    target_type: parsed.data.type,
    target_id: parsed.data.id,
    details: {},
  });
  if (auditError) {
    console.error("Could not record administrator action:", auditError.message);
    redirect("/admin?error=The%20listing%20was%20updated%20but%20the%20audit%20log%20could%20not%20be%20written.");
  }

  redirect("/admin?notice=Listing%20updated.");
}
