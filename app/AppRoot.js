"use client";

import { AppProvider, useApp } from "./components/store";
import { AuthProvider, useAuth } from "./components/auth";
import LoginScreen from "./components/LoginScreen";
import { BottomNav, DemoBanner, MobileHeader, RightRail, Sidebar, TopBar, hasRail } from "./components/Shell";
import Home from "./components/Home";
import { ActivityView, DogsView, EventsView, ExploreView, GroupsView, MapView, NowView } from "./components/Views";
import Overlays from "./components/Overlays";

const VIEWS = {
  "For deg": Home,
  "Nå skjer": NowView,
  Grupper: GroupsView,
  Hunder: DogsView,
  Kart: MapView,
  Aktivitet: ActivityView,
  Arrangementer: EventsView,
  Utforsk: ExploreView,
};

function App() {
  const app = useApp();
  const View = VIEWS[app.tab] || Home;
  return (
    <div className={"app tab-" + app.tab.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "") + (hasRail(app.tab) && !app.groupId ? "" : " noRail")}>
      <Sidebar />
      <div className="stage">
        <MobileHeader />
        <main className="main">
          <DemoBanner />
          <TopBar />
          <View />
        </main>
        <RightRail />
      </div>
      <BottomNav />
      <Overlays />
    </div>
  );
}

// Bestemmer hva en besøkende ser når appen (ikke ventelisten) er på:
//  - Supabase satt opp + ikke innlogget -> innloggingsskjerm (magic link)
//  - Supabase satt opp + innlogget      -> appen, med ekte bruker
//  - Supabase ikke satt opp             -> appen som lokal prototype/demo
// Slik krever vi aldri en innlogging vi ikke har backend til å oppfylle.
function Gated() {
  const { configured, loading, session, user } = useAuth();
  if (configured) {
    if (loading) return <div className="authLoading">Laster…</div>;
    if (!session) return <LoginScreen />;
  }
  return (
    <AppProvider authUser={user}>
      <App />
    </AppProvider>
  );
}

/** Selve appen – lastes som egen chunk, så ventelisten slipper å laste den. */
export default function AppRoot() {
  return (
    <AuthProvider>
      <Gated />
    </AuthProvider>
  );
}
