import { create } from "zustand";

type UIState = {
  /** Fonts + first canvas frame ready; loader fades out when true. */
  ready: boolean;
  setReady: (v: boolean) => void;
  /** Project id whose detail modal is open, or null. */
  selectedProject: string | null;
  setSelectedProject: (id: string | null) => void;
  /** Id of the 3D project card currently hovered (drives cursor + hint). */
  hoveredProject: string | null;
  setHoveredProject: (id: string | null) => void;
  /** Mobile: user hid the text panels to see the 3D scene/planet behind them. */
  panelsHidden: boolean;
  setPanelsHidden: (v: boolean) => void;
};

export const useUIStore = create<UIState>((set) => ({
  ready: false,
  setReady: (v) => set({ ready: v }),
  selectedProject: null,
  setSelectedProject: (id) => set({ selectedProject: id }),
  hoveredProject: null,
  setHoveredProject: (id) => set({ hoveredProject: id }),
  panelsHidden: false,
  setPanelsHidden: (v) => set({ panelsHidden: v }),
}));

// Handle for console debugging / tests
if (typeof window !== "undefined") {
  (window as unknown as { __ui: typeof useUIStore }).__ui = useUIStore;
}
