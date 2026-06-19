import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { partnershipsApi } from '../api/client'
import { getErrorMessage } from '../api/errors'
import { PublicFooter } from '../components/PublicFooter'
import { PublicNavbar } from '../components/PublicNavbar'
import type { CreatePartnershipInput, PartnershipType } from '../types/api'

const partnerTypes: Array<{ label: string; value: PartnershipType }> = [
  { label: 'Sou imobiliária', value: 'imobiliaria' },
  { label: 'Sou corretor', value: 'corretor' },
  { label: 'Sou autônomo', value: 'autonomo' },
]

const interestOptions = [
  'Anunciar imóveis',
  'Captar clientes',
  'Divulgar minha imobiliária',
  'Divulgar meus serviços',
  'Fazer parceria comercial',
  'Outro',
]

const originOptions = [
  'Google',
  'Instagram',
  'Facebook',
  'LinkedIn',
  'Indicação',
  'Pesquisa na internet',
  'Outro',
]

const emptyForm: CreatePartnershipInput = {
  tipo: 'corretor',
  nome: '',
  cpfCnpj: '',
  telefone: '',
  email: '',
  cidade: '',
  estado: '',
  creci: '',
  interesse: '',
  origem: '',
  motivacao: '',
}

function getPartnerType(value: string | null): PartnershipType {
  if (value === 'imobiliaria' || value === 'corretor' || value === 'autonomo') return value
  return 'corretor'
}

function formatPartnerType(value: PartnershipType) {
  if (value === 'imobiliaria') return 'Imobiliária'
  if (value === 'autonomo') return 'Autônomo'
  return 'Corretor'
}

export function PartnerPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedType = getPartnerType(searchParams.get('tipo'))
  const [form, setForm] = useState<CreatePartnershipInput>({ ...emptyForm, tipo: selectedType })
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const showCreci = form.tipo === 'corretor' || form.tipo === 'imobiliaria'

  useEffect(() => {
    setForm((current) => ({
      ...current,
      tipo: selectedType,
      creci: selectedType === 'autonomo' ? '' : current.creci,
    }))
    setSuccess(false)
    setError('')
  }, [selectedType])

  const nameLabel = useMemo(() => {
    return form.tipo === 'imobiliaria' ? 'Nome da imobiliária' : 'Nome completo'
  }, [form.tipo])

  function updateField<Key extends keyof CreatePartnershipInput>(
    field: Key,
    value: CreatePartnershipInput[Key],
  ) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function handleTypeChange(tipo: PartnershipType) {
    setSearchParams({ tipo })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess(false)

    if (!acceptedPrivacy) {
      setError('Para enviar, é necessário concordar com a Política de Privacidade da LarMap.')
      return
    }

    if (showCreci && !form.creci.trim()) {
      setError('Informe o CRECI para continuar.')
      return
    }

    const payload: CreatePartnershipInput = {
      tipo: form.tipo,
      nome: form.nome.trim(),
      cpfCnpj: form.cpfCnpj.trim(),
      telefone: form.telefone.trim(),
      email: form.email.trim(),
      cidade: form.cidade.trim(),
      estado: form.estado.trim().toUpperCase(),
      creci: showCreci ? form.creci.trim() : '',
      interesse: form.interesse,
      origem: form.origem,
      motivacao: form.motivacao.trim(),
    }

    setSubmitting(true)

    try {
      await partnershipsApi.create(payload)
      setSuccess(true)
      setForm({ ...emptyForm, tipo: form.tipo })
      setAcceptedPrivacy(false)
    } catch (caughtError) {
      setError(getErrorMessage(caughtError))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="institutional-site institutional-site--partner">
      <PublicNavbar />
      <main className="partner-main">
        <article className="partner-document">
          <header className="partner-header">
            <h1>Seja Parceiro LarMap</h1>
            <p>
              A LarMap está construindo uma nova experiência para o mercado imobiliário, conectando pessoas, imóveis e
              localização em uma única plataforma.
            </p>
            <p>
              Se você é corretor, imobiliária ou profissional autônomo e deseja crescer conosco, preencha o formulário
              abaixo. Nossa equipe analisará suas informações e entrará em contato.
            </p>
          </header>

          <form className="partner-form" onSubmit={handleSubmit}>
            <fieldset className="partner-profile-group">
              <legend>Perfil</legend>
              <div className="partner-profile-options">
                {partnerTypes.map((option) => (
                  <button
                    aria-pressed={form.tipo === option.value}
                    className={
                      form.tipo === option.value
                        ? 'partner-profile-option partner-profile-option--active'
                        : 'partner-profile-option'
                    }
                    key={option.value}
                    onClick={() => handleTypeChange(option.value)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="partner-form__grid">
              <label>
                {nameLabel}
                <input
                  autoComplete="name"
                  minLength={2}
                  onChange={(event) => updateField('nome', event.target.value)}
                  placeholder={form.tipo === 'imobiliaria' ? 'Imobiliária Horizonte' : 'João da Silva'}
                  required
                  value={form.nome}
                />
              </label>

              <label>
                CPF ou CNPJ
                <input
                  inputMode="numeric"
                  onChange={(event) => updateField('cpfCnpj', event.target.value)}
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                  required
                  value={form.cpfCnpj}
                />
              </label>

              <label>
                Telefone
                <input
                  autoComplete="tel"
                  inputMode="tel"
                  onChange={(event) => updateField('telefone', event.target.value)}
                  placeholder="(22) 99999-9999"
                  required
                  type="tel"
                  value={form.telefone}
                />
              </label>

              <label>
                E-mail
                <input
                  autoComplete="email"
                  inputMode="email"
                  onChange={(event) => updateField('email', event.target.value)}
                  placeholder="voce@email.com"
                  required
                  type="email"
                  value={form.email}
                />
              </label>

              <label>
                Cidade
                <input
                  autoComplete="address-level2"
                  onChange={(event) => updateField('cidade', event.target.value)}
                  placeholder="Campos dos Goytacazes"
                  required
                  value={form.cidade}
                />
              </label>

              <label>
                Estado
                <input
                  autoComplete="address-level1"
                  maxLength={2}
                  onChange={(event) => updateField('estado', event.target.value.toUpperCase())}
                  placeholder="RJ"
                  required
                  value={form.estado}
                />
              </label>

              {showCreci ? (
                <label>
                  CRECI
                  <input
                    onChange={(event) => updateField('creci', event.target.value)}
                    placeholder="12345"
                    required
                    value={form.creci}
                  />
                </label>
              ) : null}

              <label>
                Qual seu principal interesse na LarMap?
                <select
                  onChange={(event) => updateField('interesse', event.target.value)}
                  required
                  value={form.interesse}
                >
                  <option value="">Selecione uma opção</option>
                  {interestOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Como conheceu a LarMap?
                <select
                  onChange={(event) => updateField('origem', event.target.value)}
                  required
                  value={form.origem}
                >
                  <option value="">Selecione uma opção</option>
                  {originOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="partner-form__textarea">
              Conte um pouco sobre você e o que motivou seu interesse em trabalhar conosco.
              <textarea
                maxLength={1200}
                onChange={(event) => updateField('motivacao', event.target.value)}
                placeholder="Compartilhe informações que ajudem nossa equipe a entender seu perfil e objetivo."
                rows={5}
                value={form.motivacao}
              />
            </label>

            <label className="partner-consent">
              <input
                checked={acceptedPrivacy}
                onChange={(event) => setAcceptedPrivacy(event.target.checked)}
                required
                type="checkbox"
              />
              <span>
                Li e concordo com a{' '}
                <Link to="/politica-de-privacidade" target="_blank">
                  Política de Privacidade
                </Link>{' '}
                da LarMap.
              </span>
            </label>

            {success ? (
              <div className="partner-feedback partner-feedback--success" role="status">
                <strong>Recebemos seu interesse!</strong>
                <p>Obrigado por entrar em contato com a LarMap. Nossa equipe analisará suas informações e retornará em breve.</p>
              </div>
            ) : null}

            {error ? (
              <div className="partner-feedback partner-feedback--error" role="alert">
                <strong>Não foi possível enviar o formulário.</strong>
                <p>{error}</p>
              </div>
            ) : null}

            <div className="partner-form__actions">
              <button className="primary-button partner-submit" disabled={submitting || !acceptedPrivacy} type="submit">
                {submitting ? 'Enviando...' : 'Enviar'}
              </button>
              <span>Perfil selecionado: {formatPartnerType(form.tipo)}</span>
            </div>
          </form>
        </article>
      </main>
      <PublicFooter />
    </div>
  )
}
