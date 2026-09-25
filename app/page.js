"use client";

import dynamic from "next/dynamic";
import Landing from "./components/Landing";
import { WAITLIST_MODE } from "./lib/launch";

// Appen ligger i en egen chunk. Når ventelisten vises (produksjon), lastes
// den aldri – landingssiden holdes lett for trafikk fra TikTok/Reels.
const AppRoot = dynamic(() => import("./AppRoot"), {
  loading: () => <div className="authLoading">Laster…</div>,
});

export default function Page() {
  // Under bygging: vis ventelisten i stedet for appen. Se app/lib/launch.js.
  if (WAITLIST_MODE) return <Landing />;
  return <AppRoot />;
}
