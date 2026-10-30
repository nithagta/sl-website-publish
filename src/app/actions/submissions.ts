"use server";

import { z } from "zod";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const optionalUuid = z
  .string()
  .optional()
  .transform((value) => (value ? value : null))
  .refine((value) => value === null || z.uuid().safeParse(value).success);

function validHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

const websiteSchema = z.object({
  name: z.string().trim().min(2).max(120),
  destinationUrl: z.string().trim().url().refine(validHttpUrl),
  description: z.string().trim().min(10).max(3000),
  developerName: z.string().trim().min(2).max(120),
  contactInformation: z.string().trim().min(2).max(300),
  categoryId: optionalUuid,
});

const appSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(3000),
  externalDownloadUrl: z
    .string()
    .trim()
    .url()
    .refine((value) => {
      try {
        const url = new URL(value);
        return url.protocol === "https:" && !url.username && !url.password;
      } catch {
        return false;
      }
    }),
  googlePlayUrl: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : null))
    .refine((value) => {
      if (!value) return true;
      try {
        const url = new URL(value);
        return (
          url.protocol === "https:" &&
          ["play.google.com", "market.android.com"].includes(url.hostname) &&
          !url.username &&
          !url.password
        );
      } catch {
        return false;
      }
    }),
  developerName: z.string().trim().min(2).max(120),
  version: z.string().trim().min(1).max(40),
  packageName: z.string().trim().regex(/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/),
  categoryId: optionalUuid,
});

async function getVerifiedUser() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user?.email_confirmed_at) return null;
  return { supabase, user };
}

export async function submitWebsite(formData: FormData) {
  const parsed = websiteSchema.safeParse({
    name: formData.get("name"),
    destinationUrl: formData.get("destinationUrl"),
    description: formData.get("description"),
    developerName: formData.get("developerName"),
    contactInformation: formData.get("contactInformation"),
    categoryId: formData.get("categoryId")?.toString(),
  });
  if (!parsed.success) redirect("/dashboard?error=Please%20review%20the%20website%20details.");

  const account = await getVerifiedUser();
  if (!account) redirect("/login?error=Sign%20in%20with%20a%20verified%20email%20to%20submit.");

  const { error } = await account.supabase.from("websites").insert({
    owner_id: account.user.id,
    name: parsed.data.name,
    destination_url: parsed.data.destinationUrl,
    description: parsed.data.description,
    developer_name: parsed.data.developerName,
    contact_information: parsed.data.contactInformation,
    category_id: parsed.data.categoryId,
  });
  if (error) {
    const message = error.message.includes("limit")
      ? "Your%20website%20submission%20limit%20has%20been%20reached."
      : error.message.includes("access") || error.message.includes("active")
        ? "Your%20submission%20access%20is%20not%20active."
        : "The%20website%20submission%20could%20not%20be%20saved.";
    redirect(`/dashboard?error=${message}`);
  }

  redirect("/dashboard?submitted=website");
}

export async function submitApp(formData: FormData) {
  const parsed = appSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    externalDownloadUrl: formData.get("externalDownloadUrl"),
    googlePlayUrl: formData.get("googlePlayUrl")?.toString() ?? "",
    developerName: formData.get("developerName"),
    version: formData.get("version"),
    packageName: formData.get("packageName"),
    categoryId: formData.get("categoryId")?.toString(),
  });
  if (!parsed.success) redirect("/dashboard?error=Please%20review%20the%20Android%20app%20details.");

  const account = await getVerifiedUser();
  if (!account) redirect("/login?error=Sign%20in%20with%20a%20verified%20email%20to%20submit.");

  const { error } = await account.supabase.from("android_apps").insert({
    owner_id: account.user.id,
    name: parsed.data.name,
    description: parsed.data.description,
    external_download_url: parsed.data.externalDownloadUrl,
    google_play_url: parsed.data.googlePlayUrl,
    developer_name: parsed.data.developerName,
    version: parsed.data.version,
    package_name: parsed.data.packageName,
    category_id: parsed.data.categoryId,
  });
  if (error) {
    const message = error.message.includes("limit")
      ? "Your%20Android%20app%20submission%20limit%20has%20been%20reached."
      : error.message.includes("access") || error.message.includes("active")
        ? "Your%20submission%20access%20is%20not%20active."
        : "The%20Android%20app%20submission%20could%20not%20be%20saved.";
    redirect(`/dashboard?error=${message}`);
  }

  redirect("/dashboard?submitted=app");
}
