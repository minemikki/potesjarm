"use client";

import { AppProvider, useApp } from "./components/store";
import { BottomNav, MobileHeader, RightRail, Sidebar, TopBar } from "./components/Shell";
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
    <div className={"app tab-" + app.tab.toLowerCase().normalize("NFD").replace(/[^a-z]/g, "")}>
      <Sidebar />
      <div className="stage">
        <MobileHeader />
        <main className="main">
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
  return (
    <AppProvider>
      <App />
    </AppProvider>
  );
}
