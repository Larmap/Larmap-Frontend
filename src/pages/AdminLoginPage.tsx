import { KeyRound, LogIn } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { getErrorMessage } from '../api/errors'
import { BrandLogo } from '../components/BrandLogo'
import { useAuth } from '../context/AuthContext'

interface RouteState {
  from?: {
    pathname?: string
  }
}

function getPostLoginPath(role?: string) {
  return role === 'agent' ? '/admin/corretor' : '/admin/dashboard'
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
      const data = await login({ email, password })
      const fallbackPath = getPostLoginPath(data.user?.role)
      navigate(routeState?.from?.pathname ?? fallbackPath, { replace: true })
    } catch (caughtError) {
      setError(getErrorMessage(caughtError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login__intro">
        <BrandLogo className="admin-login__logo brand--auth" to="/" />

        <div className="admin-login__copy">
          <span className="eyebrow">Área profissional</span>
          <h1>Gestão de imóveis, corretores e leads em um só painel.</h1>
          <p>
            Acesse com a conta da imobiliária ou do corretor para acompanhar carteira,
            negociações e desempenho comercial.
          </p>
        </div>
      </section>

      <section className="admin-login__panel">
        <form className="admin-login__form" onSubmit={handleSubmit}>
          <div className="admin-login__form-header">
            <div>
              <span className="form-kicker">
                <KeyRound size={17} />
                Login administrativo
              </span>
              <h2>Entrar no LarMap</h2>
            </div>
          </div>

          <label>
            Email
            <input
              autoComplete="email"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@imobiliaria.com"
              required
              type="email"
              value={email}
            />
          </label>

          <label>
            Senha
            <input
              autoComplete="current-password"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Sua senha"
              required
              type="password"
              value={password}
            />
          </label>

          {error ? <p className="form-error">{error}</p> : null}

          <button className="primary-button" disabled={loading} type="submit">
            <span>{loading ? 'Entrando...' : 'Entrar no painel'}</span>
            <LogIn size={18} />
          </button>

          <p className="auth-switch">
            Ainda não tem uma conta? <Link to="/register">Cadastrar imobiliária</Link>
          </p>
        </form>
      </section>
    </main>
  )
}
