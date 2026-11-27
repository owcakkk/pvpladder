import { createContext, useContext, useEffect, type ReactNode } from "react";
import { PVP_LADDER, type LadderConfig } from "./ladders";

const LadderContext = createContext<LadderConfig>(PVP_LADDER);

// Tells every component below which ladder (PvP or Subtiers) it is showing, and applies
// the Subtiers colour theme (also to dialogs, which render outside the page wrapper).
export function LadderProvider({ ladder, children }: { ladder: LadderConfig; children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("theme-sub", ladder.id === "sub");
    return () => root.classList.remove("theme-sub");
  }, [ladder.id]);
  return <LadderContext.Provider value={ladder}>{children}</LadderContext.Provider>;
}

export const useLadderConfig = () => useContext(LadderContext);
export const themeClass = (ladder: LadderConfig) => (ladder.id === "sub" ? "theme-sub" : "");
