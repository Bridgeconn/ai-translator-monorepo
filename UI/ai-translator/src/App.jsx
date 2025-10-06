import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App as AntdApp, ConfigProvider } from "antd";
import HomePage from "./components/HomePage";
import { AuthModalProvider } from "./components/AuthModalContext";
import AuthModal from "./components/AuthModal";
import MainLayout from "./components/MainLayout";
import ResetPassword from "./components/ResetPassword";
import DashboardPage from "./pages/DashboardPage";
import SourcesListPage from "./pages/SourcesListPage";
import ProjectsPage from "./pages/ProjectsPage";
import QuickTranslationPage from "./components/QuickTranslationPage"; 
import VerseTranslationPage from './components/VerseTranslationPage';
import WordTranslation from "./components/WordTranslation";
import TextDocumentTranslation from "./components/TextDocumentTranslation";
import { useAuthModal } from "./components/AuthModalContext"; 
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
  const { openLogin } = useAuthModal(); // use the modal context

  if (token) return <Outlet />;

  openLogin();
  return null;
};

// Ant Design theme
const theme = {
  token: {
    colorPrimary: "#2C8DFB",
    colorPrimaryHover: "#4DA3FC", // lighter blue on hover
    colorPrimaryActive: "#1A73E8", // darker blue when pressed
    borderRadius: 8,
  },
};

function App() {
  return (
    <ConfigProvider theme={theme}>
      <AntdApp> 
        <QueryClientProvider client={queryClient}>
          <Router>
          <AuthModalProvider>
              {/* ADD AuthModal component */}
              <AuthModal />
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Protected routes */}
             {/* App layout always visible */}
            <Route path="/" element={<MainLayout />}>
              {/* PUBLIC inside layout */}
              <Route path="quick-translation" element={<QuickTranslationPage />} />

              {/* PROTECTED inside layout */}
              <Route element={<ProtectedOutlet />}>
              
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="sources" element={<SourcesListPage />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="quick-translation" element={<QuickTranslationPage />} />
                <Route path="projects/:projectId/translate" element={<VerseTranslationPage />} />
                <Route path="projects/:projectId/word-translation" element={<WordTranslation />} />
                <Route path="projects/:projectId/text-translation" element={<TextDocumentTranslation />} />

              </Route>

                    {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </AuthModalProvider>
            {/* CLOSE AuthModalProvider */}
          </Router>
        </QueryClientProvider>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;