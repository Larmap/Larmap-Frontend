import { ShieldX } from 'lucide-react'
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import type { AppPermission } from '../auth/authorization'
import { useAuth } from '../context/AuthContext'
import type { AccessRole } from '../types/api'

interface ProtectedRouteProps {
  accessRole?: AccessRole
  loginPath?: string
  permission?: AppPermission
}

export function ProtectedRoute({ accessRole, loginPath = '/login', permission }: ProtectedRouteProps) {
  const location = useLocation()
  const { adminHomePath, authErrorStatus, can, isAuthenticated, isAuthLoading, user } = useAuth()

  if (isAuthLoading) {
    return <p className="route-loading">Validando sessão...</p>
  }

  if (!isAuthenticated) {
    return <Navigate to={loginPath} replace state={{ from: location }} />
  }

  if (authErrorStatus !== null && authErrorStatus !== 403) {
    return (
      <main className="admin-login-page">
        <section className="admin-login__panel">
          <div className="admin-login__form">
            <div className="admin-login__form-header">
              <div>
                <span className="form-kicker">
                  <ShieldX size={17} />
                  Sessão não validada
                </span>
                <h2>Não foi possível confirmar sua sessão.</h2>
              </div>
            </div>
            <p>Tente novamente quando a API estiver disponível. Seus dados locais não foram apagados.</p>
            <button className="primary-button" onClick={() => window.location.reload()} type="button">Tentar novamente</button>
          </div>
        </section>
      </main>
    )
  }

  if (
    authErrorStatus === 403 ||
    (permission && !can(permission)) ||
    (accessRole && user?.accessRole !== accessRole)
  ) {
    const allowedDestination = authErrorStatus === 403 ? '/' : adminHomePath
    return (
      <main className="admin-login-page">
        <section className="admin-login__panel">
          <div className="admin-login__form">
            <div className="admin-login__form-header">
              <div>
                <span className="form-kicker">
                  <ShieldX size={17} />
                  Acesso negado
                </span>
                <h2>Você não possui permissão para esta área.</h2>
              </div>
            </div>
            <p>Sua sessão continua ativa. Volte para uma área permitida da aplicação.</p>
            <Link className="primary-button" to={allowedDestination}>Ir para uma área permitida</Link>
          </div>
        </section>
      </main>
    )
  }

  return <Outlet />
}
