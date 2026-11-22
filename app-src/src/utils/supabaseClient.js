import { createClient } from "@supabase/supabase-js";

// Both values are injected at build time -- from app-src/.env.local for local
// dev/builds, from GitHub Actions secrets for the published site (see
// deploy-pages.yml). Neither is committed to the repo. The anon key is safe
// to end up in the shipped JS bundle regardless (Supabase's public,
// RLS-gated key) -- keeping it out of source control is just extra hygiene.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Login is an optional feature: builds without the env vars (e.g. a fork that
// hasn't set up its own Supabase project) just run in unsaved-only mode.
//
// No real security requirement here (personal reading tracker, not an app
// with anything sensitive in it) -- auth options are spelled out explicitly
// so a logged-in visit stays logged in across closing the tab/browser and
// coming back, rather than relying on library defaults.
export const supabase = url && anonKey
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        storage: window.localStorage,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// Supabase auth wants an email; we only expose a username to the person, so
// a fixed fake domain maps one to the other consistently.
export function usernameToEmail(username) {
  return `${username.trim().toLowerCase()}@learningquest.local`;
}
