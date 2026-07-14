import { Route, Routes, useParams } from "react-router-dom";
import { AtlasShell } from "./components/AtlasShell";
import { sections } from "./data/catalog";
import { HomePage } from "./pages/HomePage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { PlanningDispatchPage } from "./pages/PlanningDispatchPage";
import {
  LighthousePage,
  VisualDirectionsPage,
} from "./pages/VisualDirectionsPage";
import { SectionPage } from "./components/SectionPage";
import { ProductionScreenPage } from "./pages/ProductionScreenPage";
import { PrototypePage } from "./pages/PrototypePage";

function PrototypeRoute() {
  const { flowId } = useParams();
  return <PrototypePage key={flowId} />;
}

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
        <Route element={<ProductionScreenPage />} path="/screens/:screenId" />
        <Route element={<PrototypeRoute />} path="/prototypes/:flowId" />
        <Route element={<VisualDirectionsPage />} path="/visual-directions" />
        <Route
          element={<LighthousePage />}
          path="/visual-directions/:direction/:lighthouse"
        />
        <Route element={<NotFoundPage />} path="*" />
      </Route>
    </Routes>
  );
}
