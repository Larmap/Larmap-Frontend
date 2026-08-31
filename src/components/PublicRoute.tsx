import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface PublicRouteProps {
  redirectTo?: string
}

export function PublicRoute({ redirectTo }: PublicRouteProps) {
  const { adminHomePath, isAuthenticated, isAuthLoading } = useAuth()

  if (isAuthLoading) {
    return <p className="route-loading">Validando sessão...</p>
  }

  if (isAuthenticated) {
    return <Navigate to={redirectTo ?? adminHomePath} replace />
  }

  return <Outlet />
}
