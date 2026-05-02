import { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import type { PageKey } from "./types";
import { CardsPage } from "./pages/CardsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ImportPage } from "./pages/ImportPage";
import { ReviewPage } from "./pages/ReviewPage";

function App() {
  const [activePage, setActivePage] = useState<PageKey>("dashboard");

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950 md:flex">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      <div className="min-w-0 flex-1">{renderPage(activePage)}</div>
    </main>
  );
}

function renderPage(page: PageKey) {
  switch (page) {
    case "dashboard":
      return <DashboardPage />;
    case "cards":
      return <CardsPage />;
    case "import":
      return <ImportPage />;
    case "review":
      return <ReviewPage />;
  }
}

export default App;
