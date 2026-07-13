import { Route, Routes } from "react-router-dom";
import { AtlasShell } from "./components/AtlasShell";
import { sections } from "./data/catalog";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PlanningDispatchPage } from "./pages/PlanningDispatchPage";
import { SectionPage } from "./components/SectionPage";

export function App() {
  return (
    <Routes>
      <Route element={<AtlasShell />}>
        <Route index element={<HomePage />} />
        {sections.map((section) => (
          <Route
            element={<SectionPage section={section} />}
            key={section.path}
            path={section.path}
          />
        ))}
        <Route element={<PlanningDispatchPage />} path="/workflows/WF-001" />
        <Route
          element={<PlanningDispatchPage screenMode />}
          path="/screens/SCR-001"
        />
        <Route element={<NotFoundPage />} path="*" />
      </Route>
    </Routes>
  );
}
