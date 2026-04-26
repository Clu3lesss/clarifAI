import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './components/Dashboard'
import DashboardHome from './components/DashboardHome'
import Analyse from './components/Analyse'
import LandingPage from './components/LandingPage'
import Reports from './components/Reports'
import NotFound from './components/NotFound'
import AuthPage from './components/AuthPage'

const App = () => {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />}>
            <Route index element={<DashboardHome />} />
            <Route path="analyse" element={<Analyse />} />
            <Route path="reports" element={<Reports />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
