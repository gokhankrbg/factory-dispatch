// Presentation-only accent styling per team. Colors are always paired with
// the team's text label elsewhere in the UI — never color alone.

import type { TeamKey } from "@/lib/types";

export interface TeamAccent {
  badge: string;
  border: string;
  dot: string;
  bar: string;
}

export const TEAM_ACCENTS: Record<TeamKey, TeamAccent> = {
  maintenance: {
    badge: "bg-amber-50 text-amber-800 border-amber-300",
    border: "border-amber-300",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
  },
  quality: {
    badge: "bg-violet-50 text-violet-800 border-violet-300",
    border: "border-violet-300",
    dot: "bg-violet-500",
    bar: "bg-violet-500",
  },
  logistics: {
    badge: "bg-teal-50 text-teal-800 border-teal-300",
    border: "border-teal-300",
    dot: "bg-teal-500",
    bar: "bg-teal-500",
  },
  human_review: {
    badge: "bg-rose-50 text-rose-800 border-rose-300",
    border: "border-rose-300",
    dot: "bg-rose-500",
    bar: "bg-rose-500",
  },
};
