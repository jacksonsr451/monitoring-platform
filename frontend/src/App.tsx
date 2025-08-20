import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import theme from './theme';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/Layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Instagram from './pages/Instagram';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import WebMonitoring from './pages/WebMonitoring';
import Login from './pages/Login';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Dashboard />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/projects" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Projects />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/instagram" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Instagram />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/web-monitoring" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <WebMonitoring />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Reports />
                </DashboardLayout>
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Settings />
                </DashboardLayout>
              </ProtectedRoute>
            } />
        </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
