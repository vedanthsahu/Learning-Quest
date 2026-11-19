import { useEffect, useState } from "react";
import { supabase, usernameToEmail } from "../utils/supabaseClient";

// Deliberately silent: no login prompt anywhere else in the app. People who
// never click this keep using the open, unsaved-by-default experience.
export default function AuthWidget() {
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setUser(data.user || null));
  }, []);

  if (!supabase) return null; // this build has no Supabase project configured

  async function submit(event) {
    event.preventDefault();
    if (!username.trim() || !password) return;
    setBusy(true);
    setError("");
    const email = usernameToEmail(username);
    const { error: authError } =
      mode === "signup"
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    // Reload so useGameData's one-time fetchData() re-runs under the new identity.
    window.location.reload();
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.reload();
  }

  if (user) {
    const label = user.email?.split("@")[0] || "Account";
    return (
      <div className="auth-widget">
        <span className="auth-user" title={`Signed in as ${label}`}>{label}</span>
        <button type="button" className="auth-link" onClick={logout}>Log out</button>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="auth-widget">
        <button type="button" className="auth-link" onClick={() => setOpen(true)}>Log in</button>
      </div>
    );
  }

  return (
    <form className="auth-widget auth-form" onSubmit={submit}>
      <input autoFocus placeholder="username" value={username} autoComplete="username"
        onChange={(event) => setUsername(event.target.value)} />
      <input type="password" placeholder="password" value={password} autoComplete="current-password"
        onChange={(event) => setPassword(event.target.value)} />
      {error && <p className="auth-error">{error}</p>}
      <div className="auth-form-actions">
        <button type="submit" disabled={busy}>{mode === "signup" ? "Create account" : "Log in"}</button>
        <button type="button" className="auth-link" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>
          {mode === "signup" ? "Have an account? Log in" : "New here? Sign up"}
        </button>
        <button type="button" className="auth-link" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
