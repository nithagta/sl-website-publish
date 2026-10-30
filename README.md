# SL Website Publish

A Next.js directory for real websites and Android apps submitted by creators and published after owner review. The site does not seed demonstration listings, media, users, or analytics.

## Requirements

- Node.js 20.9 or later
- A Supabase project with PostgreSQL, Auth, and Storage enabled
- An SMTP/email provider configured in Supabase Auth before enabling registration in production

## Local development

1. Copy `.env.example` to `.env.local` and set your Supabase project URL and publishable key.
2. Set `NEXT_PUBLIC_APP_URL` to the origin used by the app.
3. Apply `supabase/migrations/20261030000000_initial_schema.sql` to the Supabase project.
4. In Supabase Auth, enable email confirmations and configure the site URL and redirect allowlist to include `${NEXT_PUBLIC_APP_URL}/auth/callback`.
5. Start the app:

   ```powershell
   npm run dev
   ```

Without Supabase configuration, the directory displays a setup notice and does not present an empty database as a configured one.

## Owner administrator setup

Admin password authentication is server-only and uses an Argon2id hash. Do not put a plaintext password in `.env.local` or source code.

1. Register the owner account using `/register` and complete the email verification link.
2. In the Supabase SQL editor, set `is_admin` on that verified owner profile:

   ```sql
   update public.profiles
   set is_admin = true
   where id = (
     select id from auth.users where email = 'OWNER_EMAIL'
   );
   ```

   Confirm exactly one row was updated. Find that profile UUID in `public.profiles` and set it as `ADMIN_PROFILE_ID`.
3. Run `npm run admin:hash` in an interactive terminal. Paste its Argon2id output into `ADMIN_PASSWORD_HASH`. The password input is not echoed.
4. Create two independent secrets of at least 32 characters for `ADMIN_SESSION_SECRET` and `ADMIN_RATE_LIMIT_PEPPER`. For example, generate each locally with `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`.
5. Set `SUPABASE_SERVICE_ROLE_KEY` only in the server environment. It must never be exposed to client code.
6. Open `/admin/login`. Admin login is rate-limited through database functions and the custom HTTP-only, Secure-in-production, SameSite=Strict cookie expires after four hours.

The admin session is revalidated against the owner's active `is_admin` profile on each protected server request. Revoking the profile role or blocking the owner invalidates further access.

## Storage

The migration creates private `apks` and `media` buckets. APK upload size is currently set to 100 MiB and media to 50 MiB in the migration. Storage object policies restrict APK uploads to enabled users and public reads to published records. Do not make these buckets public.

## Deployment

Deploy the Next.js app to Vercel or another Node.js host. Configure all environment values in the host's server-side environment settings; only the Supabase URL and publishable key are public. Use HTTPS, configure Supabase Auth's production redirect URLs and SMTP provider, and apply migrations before exposing registration or admin access.

## Current implementation boundaries

Implemented in this workspace: responsive public directory UI, database-backed published listing reads and search, Supabase email registration/sign-in/callback, server-enforced website and external-link app submissions, account permission/status view, private signed media/APK download handling, an Argon2id owner login with database-backed rate limiting, user search/access management, account blocking, and pending website/app moderation with audit logging.

This is not yet a complete production release. Logo uploads, direct APK uploads and signature checks, media-management UI, category editor, listing editing/deletion and deletion confirmation flows, account deletion, and deployment/runtime acceptance tests still need implementation. App submissions currently require an external HTTPS APK download link. Do not grant public access until the remaining workflows have been completed and tested against a configured Supabase project.
