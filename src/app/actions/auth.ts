"use server";

import { z } from "zod";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const signupSchema = z
  .object({
    fullName: z.string().trim().min(2).max(100),
    email: z.email().trim().max(254),
    password: z.string().min(10).max(128),
    confirmPassword: z.string().min(1),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

const loginSchema = z.object({
  email: z.email().trim().max(254),
  password: z.string().min(1).max(128),
});

function appOrigin() {
  const origin = process.env.NEXT_PUBLIC_APP_URL;
  return origin?.replace(/\/+$/, "") ?? null;
}

export async function register(formData: FormData) {
  const result = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!result.success) {
    redirect("/register?error=Please%20check%20your%20details%20and%20try%20again.");
  }

  const origin = appOrigin();
  const supabase = await createSupabaseServerClient();
  if (!origin || !supabase) {
    redirect("/register?error=Authentication%20is%20not%20configured%20yet.");
  }

  const { error } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
    options: {
      data: { full_name: result.data.fullName },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    redirect(`/register?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/check-email");
}

export async function signIn(formData: FormData) {
  const result = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) {
    redirect("/login?error=Enter%20a%20valid%20email%20and%20password.");
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirect("/login?error=Authentication%20is%20not%20configured%20yet.");
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: result.data.email,
    password: result.data.password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) {
      redirect(`/dashboard?error=${encodeURIComponent(error.message)}`);
    }
  }
  redirect("/");
}
