import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.redirect(new URL("/login?error=Authentication%20is%20not%20configured.", request.url));
  }

  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const code = request.nextUrl.searchParams.get("code");
  let errorMessage: string | null = null;

  if (tokenHash && type === "signup") {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "signup",
    });
    errorMessage = error?.message ?? null;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    errorMessage = error?.message ?? null;
  } else {
    errorMessage = "The verification link is missing or invalid.";
  }

  const destination = errorMessage
    ? new URL(`/login?error=${encodeURIComponent(errorMessage)}`, request.url)
    : new URL("/dashboard?verified=1", request.url);

  return NextResponse.redirect(destination);
}
