/* eslint-disable react/only-export-components -- context, hook and strings share one small module. */
import { createContext, useContext, type ReactNode } from "react";
import { SECTION_LABELS, type FlightContent } from "./data";

/** LearningQuest copy for the flight HUD (replaces the portfolio's i18n). */
export const UI = {
  loader: "Preparing your universe",
  goTo: "Go to",
  sections: SECTION_LABELS,
  mobile: { forward: "Fly forward", back: "Fly back", hint: "Fly" },
  panels: { show: "Show panels", hide: "Hide panels to see the scene" },
  fallback: {
    title: "The 3D flight could not start on this device. Every destination is still one click away.",
    retry: "Try the flight again",
    dashboard: "Open dashboard",
  },
};

export type NavigateTarget = { view: string; bookId?: string };
export type ReaderTarget = {
  scope: string;
  bookId?: string;
  partIndex?: number;
  topicIndex?: number;
  projectIndex?: number;
  side?: string;
};

export type FlightActions = {
  navigate: (target: NavigateTarget) => void;
  openReader: (target: ReaderTarget) => void;
  toggleMenu: () => void;
  toggleMotion: () => void;
  reduced: boolean;
};

type FlightValue = { content: FlightContent; actions: FlightActions };

const FlightContext = createContext<FlightValue | null>(null);

export function FlightProvider({
  value,
  children,
}: {
  value: FlightValue;
  children: ReactNode;
}) {
  return <FlightContext.Provider value={value}>{children}</FlightContext.Provider>;
}

export function useFlight(): FlightValue {
  const value = useContext(FlightContext);
  if (!value) throw new Error("useFlight must be used inside FlightProvider");
  return value;
}

export function useI18n() {
  return { ui: UI };
}
