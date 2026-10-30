import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  AndroidApp,
  Category,
  MediaItem,
  Website,
} from "@/lib/database.types";

export type PublicListing =
  | {
      kind: "website";
      listing: Pick<Website, "id" | "name" | "destination_url" | "description" | "developer_name" | "category_id" | "created_at">;
      category: string;
    }
  | {
      kind: "app";
      listing: Pick<AndroidApp, "id" | "name" | "description" | "developer_name" | "category_id" | "google_play_url" | "created_at">;
      category: string;
    };

export type PublicDirectory = {
  configured: boolean;
  listings: PublicListing[];
  media: Array<MediaItem & { signed_url?: string }>;
  error?: string;
  mediaError?: string;
};

export async function getPublicDirectory(): Promise<PublicDirectory> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { configured: false, listings: [], media: [] };
  }

  const [websitesResult, appsResult, categoriesResult, mediaResult] =
    await Promise.all([
      supabase
        .from("websites")
        .select("id,name,destination_url,description,developer_name,category_id,created_at")
        .eq("approval_status", "approved")
        .eq("is_published", true)
        .order("created_at", { ascending: false }),
      supabase
        .from("android_apps")
        .select("id,name,description,developer_name,category_id,google_play_url,created_at")
        .eq("approval_status", "approved")
        .eq("is_published", true)
        .order("created_at", { ascending: false }),
      supabase.from("categories").select("*"),
      supabase
        .from("media_items")
        .select("*")
        .eq("is_published", true)
        .order("display_order", { ascending: true }),
    ]);

  const failed =
    websitesResult.error ??
    appsResult.error ??
    categoriesResult.error ??
    mediaResult.error;
  if (failed) {
    return {
      configured: true,
      listings: [],
      media: [],
      error: "Directory data could not be loaded. Please try again later.",
    };
  }

  const categories = new Map(
    ((categoriesResult.data ?? []) as Category[]).map((category) => [
      category.id,
      category.name,
    ]),
  );
  const listings: PublicListing[] = [
    ...(websitesResult.data ?? []).map((listing) => ({
      kind: "website" as const,
      listing,
      category: listing.category_id
        ? (categories.get(listing.category_id) ?? "Uncategorized")
        : "Uncategorized",
    })),
    ...(appsResult.data ?? []).map((listing) => ({
      kind: "app" as const,
      listing,
      category: listing.category_id
        ? (categories.get(listing.category_id) ?? "Uncategorized")
        : "Uncategorized",
    })),
  ].sort(
    (left, right) =>
      new Date(right.listing.created_at).getTime() -
      new Date(left.listing.created_at).getTime(),
  );

  const media = (mediaResult.data ?? []) as MediaItem[];
  let mediaSigningFailed = false;
  const signedMedia = await Promise.all(
    media.map(async (item) => {
      if (!item.object_path) return item;
      const { data, error } = await supabase.storage
        .from("media")
        .createSignedUrl(item.object_path, 3600);
      if (error) {
        mediaSigningFailed = true;
        return { ...item, signed_url: undefined };
      }
      return { ...item, signed_url: data.signedUrl };
    }),
  );

  return {
    configured: true,
    listings,
    media: signedMedia,
    mediaError: mediaSigningFailed
      ? "Some gallery files could not be loaded. Check Supabase Storage policies."
      : undefined,
  };
}
