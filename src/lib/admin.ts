import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";

const cookieName = "sl_admin_session";
const sessionDurationSeconds = 4 * 60 * 60;

export function createAdminServiceClient(): SupabaseClient<Database> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  return createClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function sessionSecret() {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value || value.length < 32) return null;
  return new TextEncoder().encode(value);
}

export async function createAdminToken(adminId: string) {
  const secret = sessionSecret();
  if (!secret) throw new Error("ADMIN_SESSION_SECRET must contain at least 32 characters.");

  return new SignJWT({ role: "owner_admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(adminId)
    .setIssuer("sl-website-publish")
    .setAudience("sl-admin")
    .setIssuedAt()
    .setExpirationTime(`${sessionDurationSeconds}s`)
    .sign(secret);
}

export async function setAdminSession(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/admin",
    maxAge: sessionDurationSeconds,
  });
}

export async function requireAdmin() {
  const secret = sessionSecret();
  const client = createAdminServiceClient();
  if (!secret || !client) return null;

  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
      issuer: "sl-website-publish",
      audience: "sl-admin",
    });
    if (!payload.sub || payload.role !== "owner_admin") return null;

    const { data: profile, error } = await client
      .from("profiles")
      .select("id,is_admin,account_status")
      .eq("id", payload.sub)
      .maybeSingle();
    if (error || !profile?.is_admin || profile.account_status !== "active") {
      return null;
    }

    return { adminId: profile.id, client };
  } catch {
    return null;
  }
}

export const adminCookieName = cookieName;
