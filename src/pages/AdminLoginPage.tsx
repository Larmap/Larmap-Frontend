import { LogIn } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { canAccessPath, getPostLoginDestination } from '../auth/authorization'
import { getLoginErrorMessage } from '../auth/loginErrors'
import { BrandLogo } from '../components/BrandLogo'
import { useAuth } from '../context/AuthContext'

interface RouteState {
  from?: {
    pathname?: string
  }
}

export function AdminLoginPage() {
  const { adminHomePath, isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const routeState = location.state as RouteState | null
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) {
    return <Navigate to={adminHomePath} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const session = await login({ email, password })
      const requestedPath = routeState?.from?.pathname
      const destination = requestedPath && canAccessPath(session, requestedPath)
        ? requestedPath
        : getPostLoginDestination(session)
      navigate(destination, { replace: true })
    } catch (caughtError) {
      setError(getLoginErrorMessage(caughtError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="admin-login-page">
      <section aria-labelledby="admin-login-intro-title" className="admin-login__intro">
        <BrandLogo className="admin-login__logo brand--auth" to="/" />

        <div className="admin-login__copy">
          <span className="eyebrow">Área profissional</span>
          <h1 id="admin-login-intro-title">Gestão de imóveis, corretores e leads em um só painel.</h1>
          <p>Acompanhe sua carteira, equipe e oportunidades com clareza.</p>
        </div>
      </section>

      <section aria-labelledby="admin-login-title" className="admin-login__panel">
        <form
          aria-busy={loading}
          aria-describedby={error ? 'admin-login-error admin-login-help' : 'admin-login-help'}
          className="admin-login__form"
          onSubmit={handleSubmit}
        >
          <header className="admin-login__form-header">
            <div>
              <span className="form-kicker">Acesso administrativo</span>
              <h2 id="admin-login-title">Entrar no painel</h2>
            </div>
          </header>

          <label htmlFor="admin-login-email">
            E-mail
            <input
              autoCapitalize="none"
              autoComplete="email"
              autoFocus
              disabled={loading}
              id="admin-login-email"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@imobiliaria.com"
              required
              spellCheck={false}
              type="email"
              value={email}
            />
          </label>

          <label htmlFor="admin-login-password">
            Senha
            <input
              autoComplete="current-password"
              disabled={loading}
              id="admin-login-password"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Sua senha"
              required
              type="password"
              value={password}
            />
          </label>

          {error ? (
            <p aria-atomic="true" className="form-error" id="admin-login-error" role="alert">
              {error}
            </p>
          ) : null}

          <button className="primary-button" disabled={loading} type="submit">
            <span>{loading ? 'Entrando...' : 'Entrar no painel'}</span>
            <LogIn aria-hidden="true" size={18} />
          </button>

          <p className="auth-switch" id="admin-login-help">
            O acesso administrativo é concedido pela equipe LarMap.
          </p>
        </form>
      </section>
    </main>
  )
}
