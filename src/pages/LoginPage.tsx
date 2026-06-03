import { ArrowRight, Building2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getErrorMessage } from '../api/errors'
import { BrandLogo } from '../components/BrandLogo'
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
  const [email, setEmail] = useState(' ')
  const [password, setPassword] = useState(' ')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      await login({ email, password })
      navigate(routeState?.from?.pathname ?? '/app', { replace: true })
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
          <span className="eyebrow">Acesso da imobiliária</span>
          <h1>Mapa operacional para imóveis, equipe e atendimento.</h1>
          <p>
            Entre com a conta da empresa para gerenciar usuários e cadastrar
            imóveis geolocalizados.
          </p>
        </div>
      </section>

      <section className="auth-panel auth-panel--form">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div>
            <span className="form-kicker">
              <Building2 size={17} />
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
            <span>{loading ? 'Entrando...' : 'Entrar'}</span>
            <ArrowRight size={18} />
          </button>

          <p className="auth-switch">
            Ainda não tem empresa cadastrada? <Link to="/register">Criar conta</Link>
          </p>
        </form>
      </section>
    </main>
  )
}
