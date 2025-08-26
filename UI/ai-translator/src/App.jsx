import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import MainLayout from './components/MainLayout';
import ResetPassword from './components/ResetPassword';

 
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
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
};
 
// Placeholder components for different pages (to be replaced by other developers)
const DashboardPage = () => (
  <div style={{ padding: '24px', background: 'white', borderRadius: '8px' }}>
    <h2>Dashboard</h2>
    <p>This is the dashboard page. Content will be developed by other team members.</p>
  </div>
);
 
const DocumentsPage = () => (
  <div style={{ padding: '24px', background: 'white', borderRadius: '8px' }}>
    <h2>Documents</h2>
    <p>This is the documents page. Content will be developed by other team members.</p>
  </div>
);
 
const ProjectsPage = () => (
  <div style={{ padding: '24px', background: 'white', borderRadius: '8px' }}>
    <h2>Projects</h2>
    <p>This is the projects page. Content will be developed by other team members.</p>
  </div>
);
 
const AIToolsPage = () => (
  <div style={{ padding: '24px', background: 'white', borderRadius: '8px' }}>
    <h2>AI Tools</h2>
    <p>This is the AI tools page. Content will be developed by other team members.</p>
  </div>
);
 
const theme = {
  token: {
    colorPrimary: '#1890ff',
  },
};
 
function App() {
  return (
    <ConfigProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Routes>
            {/* Auth Routes */}
            <Route path="/login" element={<LoginForm />} />
            <Route path="/register" element={<RegisterForm />} />
            
            {/* Protected Routes with MainLayout */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <MainLayout>
                  <DashboardPage />
                </MainLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/documents" element={
              <ProtectedRoute>
                <MainLayout>
                  <DocumentsPage />
                </MainLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/projects" element={
              <ProtectedRoute>
                <MainLayout>
                  <ProjectsPage />
                </MainLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/ai-tools" element={
              <ProtectedRoute>
                <MainLayout>
                  <AIToolsPage />
                </MainLayout>
              </ProtectedRoute>
            } />
            
            {/* Default redirects */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
            
            <Route path="/reset-password" element={<ResetPassword />} />

          </Routes>
        </Router>
      </QueryClientProvider>
    </ConfigProvider>
  );
}
 
export default App;
 
 