// Supabase client — used to read instagram_conversations + bot_config
// from the same project the insta-bot writes to.
//
// Env vars (Vercel's auto-integration naming — set automatically when you
// link a Supabase project to a Vercel project):
//   SUPABASE_URL              — project URL
//   SUPABASE_SERVICE_ROLE_KEY — service-role key (bypasses RLS, server-side only)
//
// Falls back to SUPABASE_KEY for environments that use the bot's naming.

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY) must be set in environment variables",
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
