import { ArrowRight, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getErrorMessage } from '../api/errors'
import { canAccessPath, getPostLoginDestination } from '../auth/authorization'
import { BrandLogo } from '../components/BrandLogo'
import { featureFlags } from '../config/features'
import { useAuth } from '../context/AuthContext'

interface RouteState {
  from?: {
    pathname?: string
  }
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const routeState = location.state as RouteState | null
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
      setError(getErrorMessage(caughtError))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel auth-panel--intro">
        <BrandLogo className="brand--auth" to="/" />

        <div className="auth-copy">
          <span className="eyebrow">Sua conta LarMap</span>
          <h1>Seus imóveis e conteúdos preferidos em um só lugar.</h1>
          <p>
            Entre na sua conta pessoal para continuar pesquisando e acessar o que você salvou.
          </p>
        </div>
      </section>

      <section className="auth-panel auth-panel--form">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div>
            <span className="form-kicker">
              <UserRound size={17} />
              Login
            </span>
            <h2>Entrar no LarMap</h2>
          </div>

          <label>
            Email
            <input
              autoComplete="email"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@email.com"
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
            <span>{loading ? 'Entrando...' : 'Entrar'}</span>
            <ArrowRight size={18} />
          </button>

          {featureFlags.PUBLIC_REGISTRATION ? (
            <p className="auth-switch">
              Ainda não tem conta? <Link to="/register">Criar conta</Link>
            </p>
          ) : null}
        </form>
      </section>
    </main>
  )
}
