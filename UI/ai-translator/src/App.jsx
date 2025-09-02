import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App as AntdApp, ConfigProvider } from "antd";
import HomePage from "./components/HomePage";
import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";
import MainLayout from "./components/MainLayout";
import ResetPassword from "./components/ResetPassword";
import DashboardPage from "./pages/DashboardPage";
import SourcesListPage from "./pages/SourcesListPage";
import ProjectsPage from "./pages/ProjectsPage";
import QuickTranslationPage from "./components/QuickTranslationPage"; 
import VerseTranslationPage from './components/VerseTranslationPage';
import WordTranslation from "./components/WordTranslation";
import TextDocumentTranslation from "./components/TextDocumentTranslation";
// React Query config
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false, 
    },
  },
});

const ProtectedOutlet = () => {
  const token = localStorage.getItem("token");
  return token ? <Outlet /> : <Navigate to="/login" replace />;
};

// Ant Design theme
const theme = {
  token: {
    colorPrimary: "#722ed1",
    colorPrimaryHover: "#9b6ff3",  // hover color
    colorPrimaryActive: "#5b36c9", // pressed color
    borderRadius: 8,
  },
};

function App() {
  return (
    <ConfigProvider theme={theme}>
      <AntdApp> 
        <QueryClientProvider client={queryClient}>
          <Router>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginForm />} />
              <Route path="/register" element={<RegisterForm />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Protected routes */}
             {/* App layout always visible */}
            <Route path="/" element={<MainLayout />}>
              {/* PUBLIC inside layout */}
              <Route path="quick-translation" element={<QuickTranslationPage />} />

              {/* PROTECTED inside layout */}
              <Route element={<ProtectedOutlet />}>
              
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/sources" element={<SourcesListPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                <Route path="/quick-translation" element={<QuickTranslationPage />} />
                <Route path="/projects/:projectId/translate" element={<VerseTranslationPage />} />
                <Route path="/projects/:projectId/word-translation" element={<WordTranslation />} />
                <Route path="/projects/:projectId/text-translation" element={<TextDocumentTranslation />} />

              </Route>

                    {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Router>
      </QueryClientProvider>
      </AntdApp>
    </ConfigProvider>
  );
};

export default App;