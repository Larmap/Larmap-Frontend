import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface ProtectedRouteProps {
  loginPath?: string
}

export function ProtectedRoute({ loginPath = '/login' }: ProtectedRouteProps) {
  const location = useLocation()
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to={loginPath} replace state={{ from: location }} />
  }

  return <Outlet />
}
