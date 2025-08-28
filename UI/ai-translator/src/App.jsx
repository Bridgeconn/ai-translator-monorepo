// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";
import HomePage from "./components/HomePage";
import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";
import MainLayout from "./components/MainLayout";
import ResetPassword from "./components/ResetPassword";
import DashboardPage from "./pages/DashboardPage";
import SourcesListPage from "./pages/SourcesListPage";
import ProjectsPage from "./pages/ProjectsPage";
import QuickTranslationPage from "./components/QuickTranslationPage"; 
import QuickActions from "./components/QuickActions";
import Dashboard from "./components/DashBoard";
import VerseTranslationPage from './components/VerseTranslationPage';




// React Query config
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
};

// Ant Design theme
const theme = {
  token: {
    colorPrimary: "#722ed1",
  },
};

function App() {
  return (
    <ConfigProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginForm />} />
            <Route path="/register" element={<RegisterForm />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected routes */}
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

              <Route
              path="/projects/:projectId/translate"
              element={
                    <VerseTranslationPage />
              }
            />
            </Route>
{/* 
              <Route
              path="/projects/:projectId/translate"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <VerseTranslationPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            </Route> */}

            {/* Default and fallback */}
            <Route
              path="/"
              element={
                localStorage.getItem("token")
                  ? <Navigate to="/dashboard" replace />
                  : <Navigate to="/login" replace />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </QueryClientProvider>
    </ConfigProvider>
  );
};

export default App;