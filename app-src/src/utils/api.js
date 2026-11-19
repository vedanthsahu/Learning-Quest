import { supabase } from "./supabaseClient";

// import.meta.env.BASE_URL is "/" for local dev/the local server, or the
// configured --base (e.g. "/Learning-Quest/") for the GitHub Pages build --
// see package.json's build:pages script.
const ROOT = import.meta.env.BASE_URL;
const BASE = `${ROOT}api/data`;
const UPLOAD_URL = `${ROOT}api/upload`;
const LS_KEY = "lq_data_v1";
const SEED_URL = `${ROOT}data.seed.json`;

// getSession() reads the cached session from localStorage (no network round
// trip) -- fine here since this app has no real security requirement; every
// save/load is debounced and shouldn't wait on an auth-server call.
async function currentUserId() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id || null;
}

// Tracks whether the local Python server (server.py) is actually reachable this
// session. Starts unknown; fetchData()/saveData() set it on their first real
// attempt. Once false, we stop retrying the network on every save -- go straight
// to localStorage so a static deployment (e.g. GitHub Pages) doesn't throw on
// every keystroke-triggered save.
let apiAvailable = null;

export async function fetchData() {
  const userId = await currentUserId();
  if (userId) {
    const { data: row, error } = await supabase
      .from("progress")
      .select("data")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (row?.data) return row.data;
    // Logged in but nothing saved under this account yet -- fresh start from
    // the catalog-only seed, same as an anonymous first visit.
    const seedRes = await fetch(SEED_URL, { cache: "no-store" });
    if (!seedRes.ok) throw new Error(`No seed data available (${seedRes.status})`);
    return await seedRes.json();
  }

  try {
    const res = await fetch(BASE, { cache: "no-store" });
    if (!res.ok) throw new Error(`status ${res.status}`);
    apiAvailable = true;
    return await res.json();
  } catch {
    apiAvailable = false;
    const saved = readLocal();
    if (saved) return saved;
    // First-ever visit with no server and no local save yet: load the
    // catalog-only seed (no personal progress -- see scripts/make_seed.py).
    const seedRes = await fetch(SEED_URL, { cache: "no-store" });
    if (!seedRes.ok) {
      throw new Error(`No server and no seed data available (${seedRes.status})`);
    }
    return await seedRes.json();
  }
}

export async function saveData(data) {
  const userId = await currentUserId();
  if (userId) {
    const { error } = await supabase
      .from("progress")
      .upsert({ user_id: userId, data, updated_at: new Date().toISOString() });
    if (error) throw error;
    return { ok: true, remote: true };
  }

  if (apiAvailable !== false) {
    try {
      const res = await fetch(BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      apiAvailable = true;
      return await res.json();
    } catch {
      apiAvailable = false; // fall through to localStorage
    }
  }
  writeLocal(data);
  return { ok: true, local: true };
}

// Uploads an image (a File, or a data URL string). With the local server, it's
// saved to uploads/ and we get back a short relative path. Without a server
// (static hosting), there's nowhere to store the file, so the data URL itself
// is kept as the "path" and embedded directly in the saved JSON -- see
// resolveImagePath() below for how callers render either form.
export async function uploadImage(fileOrDataUrl, filename) {
  const dataUrl =
    typeof fileOrDataUrl === "string" ? fileOrDataUrl : await readAsDataUrl(fileOrDataUrl);

  if (apiAvailable !== false) {
    try {
      const res = await fetch(UPLOAD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl, filename: filename || "pasted-image.png" }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      apiAvailable = true;
      return await res.json(); // { path }
    } catch {
      apiAvailable = false;
    }
  }
  return { path: dataUrl };
}

// Renders either kind of imagePath: a server-relative path ("uploads/x.png",
// needs a leading slash) or an embedded data URL (already a complete src,
// a leading slash would break it).
export function resolveImagePath(path) {
  if (!path) return path;
  return path.startsWith("data:") ? path : `${ROOT}${path}`;
}

function readLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null; // corrupted save or storage disabled -- treat as "no save yet"
  }
}

function writeLocal(data) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
