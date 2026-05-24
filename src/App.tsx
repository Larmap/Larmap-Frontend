import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminShell } from './components/AdminShell'
import { ProtectedRoute } from './components/ProtectedRoute'
import { PublicRoute } from './components/PublicRoute'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AdminAgentsPage } from './pages/AdminAgentsPage'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { AdminLeadsPage } from './pages/AdminLeadsPage'
import { AdminLoginPage } from './pages/AdminLoginPage'
import { AdminPerformancePage } from './pages/AdminPerformancePage'
import { AdminPropertiesPage } from './pages/AdminPropertiesPage'
import { AdminSettingsPage } from './pages/AdminSettingsPage'
import { BrokerDashboardPage } from './pages/BrokerDashboardPage'
import { FavoritesPage } from './pages/FavoritesPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { PublicMapPage } from './pages/PublicMapPage'
import { RegisterPage } from './pages/RegisterPage'

function AdminEntry() {
  const { adminHomePath, isAuthenticated } = useAuth()
  return <Navigate to={isAuthenticated ? adminHomePath : '/admin/login'} replace />
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/favoritos" element={<FavoritesPage />} />
          <Route path="/aluguel" element={<PublicMapPage />} />
          <Route path="/compra" element={<PublicMapPage />} />
          <Route path="/novidades" element={<PublicMapPage />} />
          <Route path="/mapa" element={<PublicMapPage />} />

          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          <Route path="/admin" element={<AdminEntry />} />
          <Route element={<PublicRoute />}>
            <Route path="/admin/login" element={<AdminLoginPage />} />
          </Route>

          <Route element={<ProtectedRoute loginPath="/admin/login" />}>
            <Route element={<AdminShell />}>
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/imoveis" element={<AdminPropertiesPage />} />
              <Route path="/admin/corretores" element={<AdminAgentsPage />} />
              <Route path="/admin/leads" element={<AdminLeadsPage />} />
              <Route path="/admin/desempenho" element={<AdminPerformancePage />} />
              <Route path="/admin/configuracoes" element={<AdminSettingsPage />} />
              <Route path="/admin/corretor" element={<BrokerDashboardPage />} />
            </Route>
          </Route>

          <Route path="/app" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/app/users" element={<Navigate to="/admin/corretores" replace />} />
          <Route path="/app/properties" element={<Navigate to="/admin/imoveis" replace />} />
          <Route path="/users" element={<Navigate to="/admin/corretores" replace />} />
          <Route path="/properties" element={<Navigate to="/admin/imoveis" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
