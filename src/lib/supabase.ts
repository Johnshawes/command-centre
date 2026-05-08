// Supabase client — used to read instagram_conversations + bot_config
// from the same project the insta-bot writes to.
//
// Env vars (set in Vercel):
//   SUPABASE_URL  — same as the bot's
//   SUPABASE_KEY  — service-role key (bypasses RLS, server-side only)

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_KEY must be set in environment variables",
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
