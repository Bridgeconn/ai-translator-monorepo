// src/App.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import QuickTranslationPage from "./components/QuickTranslationPage";
import SourcesListPage from "./pages/SourcesListPage";
import MainLayout from "./components/MainLayout_t"; // sidebar layout

function App() {
  return (
    <Router>
      <Routes>
        {/* Default route → Sources List */}
        <Route path="/" element={<Navigate to="/sources" replace />} />

        {/* All main pages share sidebar layout */}
        <Route element={<MainLayout />}>
          <Route path="/sources" element={<SourcesListPage />} />
          <Route path="/quick-translation" element={<QuickTranslationPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/sources" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
