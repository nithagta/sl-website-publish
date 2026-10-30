import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function trackDownload(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  appId: string,
) {
  const { error } = await supabase.from("download_events").insert({ app_id: appId });
  if (error) {
    console.error("Could not record APK download event:", error.message);
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!uuidPattern.test(id)) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Application downloads are not configured." },
      { status: 503 },
    );
  }

  const { data: app, error } = await supabase
    .from("android_apps")
    .select("id,name,apk_path,external_download_url")
    .eq("id", id)
    .eq("approval_status", "approved")
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    console.error("Could not retrieve public Android application:", error.message);
    return NextResponse.json(
      { error: "The application could not be loaded." },
      { status: 500 },
    );
  }
  if (!app) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }

  if (app.external_download_url) {
    try {
      const destination = new URL(app.external_download_url);
      if (destination.protocol !== "https:") {
        return NextResponse.json(
          { error: "This application has an invalid download destination." },
          { status: 500 },
        );
      }
      await trackDownload(supabase, app.id);
      return NextResponse.redirect(destination, 302);
    } catch {
      return NextResponse.json(
        { error: "This application has an invalid download destination." },
        { status: 500 },
      );
    }
  }

  if (!app.apk_path) {
    return NextResponse.json(
      { error: "No downloadable APK is currently available." },
      { status: 404 },
    );
  }

  const filename = `${app.name.replace(/[^a-zA-Z0-9_-]/g, "-")}.apk`;
  const { data: signedUrl, error: signingError } = await supabase.storage
    .from("apks")
    .createSignedUrl(app.apk_path, 60, { download: filename });

  if (signingError || !signedUrl) {
    console.error(
      "Could not create APK download URL:",
      signingError?.message ?? "Missing signed URL",
    );
    return NextResponse.json(
      { error: "The APK could not be prepared for download." },
      { status: 500 },
    );
  }

  await trackDownload(supabase, app.id);
  return NextResponse.redirect(signedUrl.signedUrl, 302);
}
