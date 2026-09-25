"use client";

import { AppProvider, useApp } from "./components/store";
import { BottomNav, DemoBanner, MobileHeader, RightRail, Sidebar, TopBar } from "./components/Shell";
import Home from "./components/Home";
import { ActivityView, DogsView, EventsView, ExploreView, GroupsView, MapView, NowView } from "./components/Views";
import Overlays from "./components/Overlays";
import Waitlist from "./components/Waitlist";
import { WAITLIST_MODE } from "./lib/launch";

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
    <div className={"app tab-" + app.tab.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "")}>
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

export default function Page() {
  // Under bygging (ingen backend ennå): vis en ærlig venteliste i stedet for
  // den fungerende, men local-only prototypen. Se app/lib/launch.js.
  if (WAITLIST_MODE) return <Waitlist />;
  return (
    <AppProvider>
      <App />
    </AppProvider>
  );
}
