import { ArrowRight, ShieldCheck, UserPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { BrandLogo } from '../components/BrandLogo'
import { featureFlags } from '../config/features'

function RegisterForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [error, setError] = useState('')
  const [registrationPending, setRegistrationPending] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (password !== passwordConfirmation) {
      setError('As senhas precisam ser iguais.')
      return
    }

    // O endpoint atual cria Company. A UI não envia estes dados até o backend
    // implementar o cadastro individual que força accessRole = COMMON.
    setRegistrationPending(true)
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel auth-panel--intro">
        <BrandLogo className="brand--auth" to="/" />

        <div className="auth-copy">
          <span className="eyebrow">Sua conta LarMap</span>
          <h1>Guarde seus imóveis e conteúdos preferidos.</h1>
          <p>
            Crie uma conta pessoal para organizar imóveis e artigos do LarMap Explica.
            Este cadastro não concede acesso administrativo.
          </p>
        </div>
      </section>

      <section className="auth-panel auth-panel--form">
        <form className="auth-form" onSubmit={handleSubmit}>
          <div>
            <span className="form-kicker">
              <UserPlus size={17} />
              Cadastro pessoal
            </span>
            <h2>Crie sua conta</h2>
          </div>

          <label>
            Nome
            <input
              autoComplete="name"
              minLength={2}
              onChange={(event) => setName(event.target.value)}
              placeholder="Como podemos chamar você?"
              required
              value={name}
            />
          </label>

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
              autoComplete="new-password"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              type="password"
              value={password}
            />
          </label>

          <label>
            Confirme a senha
            <input
              autoComplete="new-password"
              minLength={8}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              placeholder="Digite a senha novamente"
              required
              type="password"
              value={passwordConfirmation}
            />
          </label>

          <p className="auth-security-note">
            <ShieldCheck size={16} />
            Toda conta criada por este fluxo terá perfil pessoal COMMON, definido com segurança pelo backend.
          </p>

          {error ? <p className="form-error">{error}</p> : null}
          {registrationPending ? (
            <p aria-live="polite" className="notice">
              Seu cadastro não foi enviado. A criação de contas pessoais será ativada quando o novo contrato do backend estiver disponível.
            </p>
          ) : null}

          <button className="primary-button" disabled={registrationPending} type="submit">
            <span>{registrationPending ? 'Aguardando integração' : 'Criar minha conta'}</span>
            <ArrowRight size={18} />
          </button>

          <p className="auth-switch">
            Já tem uma conta? <Link to="/login">Entrar</Link>
          </p>
        </form>
      </section>
    </main>
  )
}

function RegistrationUnavailablePage() {
  return (
    <main className="auth-screen">
      <section className="auth-panel auth-panel--intro">
        <BrandLogo className="brand--auth" to="/" />

        <div className="auth-copy">
          <span className="eyebrow">Sua conta LarMap</span>
          <h1>O cadastro está temporariamente indisponível.</h1>
          <p>
            Estamos concluindo a integração segura do novo cadastro pessoal. O acesso de contas existentes continua disponível.
          </p>
        </div>
      </section>

      <section className="auth-panel auth-panel--form">
        <div className="auth-form">
          <div>
            <span className="form-kicker">
              <ShieldCheck size={17} />
              Cadastro pessoal
            </span>
            <h2>Voltaremos em breve</h2>
          </div>
          <p className="auth-security-note">
            Nenhum dado foi enviado e nenhuma imobiliária será criada por esta página durante a transição.
          </p>
          <Link className="primary-button" to="/login">
            Entrar
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  )
}

export function RegisterPage() {
  return featureFlags.PUBLIC_REGISTRATION ? <RegisterForm /> : <RegistrationUnavailablePage />
}
