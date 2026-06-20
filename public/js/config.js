/**
 * Roarline — Configuration
 * ─────────────────────────────────────────────────────────────
 * Replace SUPABASE_URL and SUPABASE_ANON_KEY with your project
 * values from https://supabase.com/dashboard → Project Settings → API
 *
 * GOOGLE_CLIENT_ID: from Google Cloud Console → OAuth 2.0 credentials
 * The redirect URI must be set to https://yourproject.supabase.co/auth/v1/callback
 * in both Google Cloud Console AND Supabase Auth → Providers → Google.
 */

const brand = window.ROARLINE_BRAND || {
  name: "Roarline",
  tagline: "Live scores. Match rooms. Fan voices.",
};

window.GRANDSTAND_CONFIG = {
  // ── Supabase ────────────────────────────────────────────────
  SUPABASE_URL:      'https://nxqxboepctqiowtgjkgn.supabase.co',
  SUPABASE_ANON_KEY: "sb_publishable_mw4HqBhIZrcAT3uXxg8fbQ_q2QvOA0y",

  // ── App ─────────────────────────────────────────────────────
  APP_NAME: brand.name,
  BRAND: brand,
  APP_URL: "https://ponyfizz2.github.io/grandstand/",
  LIVE_SCORES_URL: "https://nxqxboepctqiowtgjkgn.supabase.co/functions/v1/live-scores",

  // ── Feature flags ───────────────────────────────────────────
  CHAT_ENABLED: true,
  REQUIRE_AUTH_FOR_CHAT: true,
  ALLOW_GUEST_BROWSE: true,

  // ── Chat ────────────────────────────────────────────────────
  CHAT_MAX_MESSAGE_LENGTH: 280,
  CHAT_MESSAGES_TO_LOAD: 80,

  // ── Admin ───────────────────────────────────────────────────
  // Admin users are set in Supabase via the 'is_admin' column in the profiles table
};
