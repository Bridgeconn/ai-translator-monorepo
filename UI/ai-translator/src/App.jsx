import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import MainLayout from './components/MainLayout'; // Updated import

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

const theme = {
  token: {
    colorPrimary: '#722ed1',
  },
};

function App() {
  return (
    <ConfigProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginForm />} />
            <Route path="/register" element={<RegisterForm />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              } 
            />
            {/* Add more protected routes here when other developers create the pages */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </QueryClientProvider>
    </ConfigProvider>
  );
}
