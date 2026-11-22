/* eslint-disable react/only-export-components -- Context and its provider share one small preferences module. */
import { createContext, useContext, useEffect, useState } from "react";
import { MotionConfig, useReducedMotion } from "framer-motion";
const Preferences = createContext(null);
const defaults = { theme: "orbital", motion: "full", companion: "owl", ambience: "off" };
export function PreferencesProvider({ children }) {
  const [prefs, setPrefs] = useState(() => { try {
    const stored = JSON.parse(localStorage.getItem("lq-atmosphere") || "{}");
    // One-time visual migration only; preserve motion, sound and companion choices.
    return {...defaults, ...stored, theme: stored.visualVersion === 2 ? stored.theme || 'orbital' : 'orbital', visualVersion: 2};
  } catch { return {...defaults, visualVersion: 2}; } });
  const systemReduced = useReducedMotion();
  const reduced = systemReduced || prefs.motion === "quiet";
  function update(patch) { setPrefs(p => ({...p, ...patch})); }
  useEffect(() => { document.documentElement.dataset.theme = prefs.theme; document.documentElement.dataset.motion = reduced ? "quiet" : "full"; try { localStorage.setItem("lq-atmosphere", JSON.stringify(prefs)); } catch { /* Preferences remain available for this session. */ } }, [prefs, reduced]);
  return <Preferences.Provider value={{prefs,update,reduced}}><MotionConfig reducedMotion={reduced ? "always" : "never"}>{children}</MotionConfig></Preferences.Provider>;
}
export function usePreferences() { return useContext(Preferences) || {prefs:defaults,update:()=>{},reduced:false}; }
