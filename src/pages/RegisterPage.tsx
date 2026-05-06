import { ArrowRight, MapPin } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getErrorMessage } from '../api/errors'
import { BrandLogo } from '../components/BrandLogo'
import { useAuth } from '../context/AuthContext'

export function RegisterPage() {
  const { registerCompany } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [brandImageUrl, setBrandImageUrl] = useState('')
  const [headquartersStreet, setHeadquartersStreet] = useState('')
  const [headquartersNumber, setHeadquartersNumber] = useState('')
  const [headquartersNeighborhood, setHeadquartersNeighborhood] = useState('')
  const [headquartersCity, setHeadquartersCity] = useState('')
  const [headquartersState, setHeadquartersState] = useState('')
  const [headquartersPostalCode, setHeadquartersPostalCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      await registerCompany({
        name,
        email,
        password,
        phone: phone || undefined,
        whatsapp: whatsapp || undefined,
        brandImageUrl,
        logoUrl: brandImageUrl,
        headquartersStreet,
        headquartersNumber,
        headquartersNeighborhood,
        headquartersCity,
        headquartersState,
        headquartersPostalCode,
        headquartersAddress: [
          `${headquartersStreet}, ${headquartersNumber}`,
          headquartersNeighborhood,
          headquartersCity,
          headquartersState,
          headquartersPostalCode,
        ].join(', '),
      })
      navigate('/app', { replace: true })
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
          <span className="eyebrow">Nova empresa</span>
          <h1>Comece com uma conta multi-tenant isolada.</h1>
          <p>
            O cadastro cria a empresa e já autentica sua sessão para continuar
            no painel.
          </p>
        </div>
      </section>

      <section className="auth-panel auth-panel--form">
        <form className="auth-form auth-form--wide" onSubmit={handleSubmit}>
          <div>
            <span className="form-kicker">
              <MapPin size={17} />
              Cadastro
            </span>
            <h2>Criar imobiliária</h2>
          </div>

          <label>
            Nome da empresa
            <input
              minLength={2}
              onChange={(event) => setName(event.target.value)}
              placeholder="Sua Imobiliária"
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
              placeholder="admin@imobiliaria.com"
              required
              type="email"
              value={email}
            />
          </label>

          <div className="form-grid">
            <label>
              Telefone
              <input
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+55-21-99999-0000"
                type="tel"
                value={phone}
              />
            </label>

            <label>
              WhatsApp
              <input
                onChange={(event) => setWhatsapp(event.target.value)}
                placeholder="+55-21-99999-0000"
                type="tel"
                value={whatsapp}
              />
            </label>
          </div>

          <label>
            Foto de marca / logomarca
            <input
              onChange={(event) => setBrandImageUrl(event.target.value)}
              placeholder="URL da imagem da marca"
              required
              value={brandImageUrl}
            />
          </label>

          <div className="form-grid">
            <label>
              Rua ou avenida da sede
              <input onChange={(event) => setHeadquartersStreet(event.target.value)} required value={headquartersStreet} />
            </label>
            <label>
              Número
              <input onChange={(event) => setHeadquartersNumber(event.target.value)} required value={headquartersNumber} />
            </label>
          </div>

          <div className="form-grid">
            <label>
              Bairro
              <input onChange={(event) => setHeadquartersNeighborhood(event.target.value)} required value={headquartersNeighborhood} />
            </label>
            <label>
              Cidade
              <input onChange={(event) => setHeadquartersCity(event.target.value)} required value={headquartersCity} />
            </label>
          </div>

          <div className="form-grid">
            <label>
              Estado
              <input maxLength={2} onChange={(event) => setHeadquartersState(event.target.value.toUpperCase())} required value={headquartersState} />
            </label>
            <label>
              CEP
              <input inputMode="numeric" onChange={(event) => setHeadquartersPostalCode(event.target.value)} required value={headquartersPostalCode} />
            </label>
          </div>

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

          {error ? <p className="form-error">{error}</p> : null}

          <button className="primary-button" disabled={loading} type="submit">
            <span>{loading ? 'Criando...' : 'Criar e entrar'}</span>
            <ArrowRight size={18} />
          </button>

          <p className="auth-switch">
            Já existe cadastro? <Link to="/login">Entrar</Link>
          </p>
        </form>
      </section>
    </main>
  )
}
