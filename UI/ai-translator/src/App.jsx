//app.jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { ConfigProvider } from "antd";
import { ConfigProvider, App as AntApp } from "antd";
import HomePage from "./components/HomePage";
import LoginForm from "./components/LoginForm";
import RegisterForm from "./components/RegisterForm";
import MainLayout from "./components/MainLayout";
import ProjectsPage from "./components/Projects";
import WordTranslation from "./components/WordTranslation";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

// Simple wrapper for private routes
function PrivateRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" />;
}

const theme = {
  token: { colorPrimary: "#8b5cf6" }, // purple theme
};

export default function App() {
  return (
    <ConfigProvider theme={theme}>
      <AntApp>
+        <QueryClientProvider client={queryClient}>
+          <Router>
+            <Routes>
            {/* Landing Page */}
            <Route path="/" element={<HomePage />} />

            {/* Auth */}
            <Route path="/login" element={<LoginForm />} />
            <Route path="/register" element={<RegisterForm />} />

            {/* Protected Layout with sidebar */}
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <MainLayout />
                </PrivateRoute>
              }
            >
              {/* Nested routes inside MainLayout */}
              <Route path="projects" element={<ProjectsPage />} />
              <Route
                path="projects/:projectId/word-translation"
                element={<WordTranslation />}
              />
              {/* add other pages later: dashboard, documents, ai-tools */}
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Router>
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  );
}