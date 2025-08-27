// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";

import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";
import MainLayout from "./components/MainLayout";

// Pages
import DashboardPage from "./pages/DashboardPage";
import SourcesListPage from "./pages/SourcesListPage";
import ProjectsPage from "./pages/ProjectsPage";
import QuickTranslationPage from "./components/QuickTranslationPage";
import ResetPassword from './components/ResetPassword';

// React Query config
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Simple auth check
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
};

// Ant Design theme
const theme = {
  token: {
    colorPrimary: "#722ed1", // matches your purple branding
  },
};

function App() {
  return (
    <ConfigProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginForm />} />
            <Route path="/register" element={<RegisterForm />} />

            <Route path="/reset-password" element={<ResetPassword />} />


            {/* Protected routes with MainLayout */}
            <Route
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/sources" element={<SourcesListPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/quick-translation" element={<QuickTranslationPage />} />

            </Route>

            {/* Default route handling */}
            <Route
              path="/"
              element={
                localStorage.getItem("token")
                  ? <Navigate to="/dashboard" replace />
                  : <Navigate to="/login" replace />
              }
            />
            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </QueryClientProvider>
    </ConfigProvider>
  );
}

export default App;
