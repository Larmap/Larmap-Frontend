import {
  Building2,
  Image as ImageIcon,
  Link2,
  Mail,
  MapPin,
  Phone,
  Save,
  Upload,
  UserRound,
  X,
} from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { getErrorMessage } from '../api/errors'
import { useAuth } from '../context/AuthContext'
import type { Company, UpdateCompanyInput } from '../types/api'
import { validateCompanyLogoFile } from '../utils/companyLogo'

type CompanyForm = Required<UpdateCompanyInput>
type CompanyFormKey = keyof CompanyForm
type LogoMode = 'file' | 'url'

interface SelectedLogo {
  file: File
  previewUrl: string
}

function createInitialForm(company: Company | null): CompanyForm {
  return {
    name: company?.name ?? '',
    email: company?.email ?? '',
    phone: company?.phone ?? '',
    whatsapp: company?.whatsapp ?? '',
    brandImageUrl: company?.brandImageUrl ?? company?.logoUrl ?? '',
    logoUrl: company?.logoUrl ?? company?.brandImageUrl ?? '',
    headquartersStreet: company?.headquartersStreet ?? '',
    headquartersNumber: company?.headquartersNumber ?? '',
    headquartersComplement: company?.headquartersComplement ?? '',
    headquartersNeighborhood: company?.headquartersNeighborhood ?? '',
    headquartersCity: company?.headquartersCity ?? '',
    headquartersState: company?.headquartersState ?? '',
    headquartersPostalCode: company?.headquartersPostalCode ?? '',
    headquartersAddress: company?.headquartersAddress ?? '',
  }
}

export function AdminSettingsPage() {
  const { company, updateCompanyProfile, user } = useAuth()
  const [form, setForm] = useState<CompanyForm>(() => createInitialForm(company))
  const [dirtyFields, setDirtyFields] = useState<Set<CompanyFormKey>>(() => new Set())
  const [logoMode, setLogoMode] = useState<LogoMode>(
    company?.brandImageUrl || company?.logoUrl ? 'url' : 'file',
  )
  const [selectedLogo, setSelectedLogo] = useState<SelectedLogo | null>(null)
  const [logoError, setLogoError] = useState('')
  const [previewFailed, setPreviewFailed] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const savedLogoUrl = form.brandImageUrl || form.logoUrl
  const logoPreviewUrl = logoMode === 'file'
    ? selectedLogo?.previewUrl || savedLogoUrl
    : savedLogoUrl
  const profileDataIncomplete = Boolean(
    company &&
    (!Object.prototype.hasOwnProperty.call(company, 'email') ||
      !Object.prototype.hasOwnProperty.call(company, 'headquartersStreet')),
  )

  useEffect(() => {
    if (dirtyFields.size === 0) {
      setForm(createInitialForm(company))
    }
  }, [company, dirtyFields.size])

  useEffect(() => {
    setPreviewFailed(false)
  }, [logoPreviewUrl])

  useEffect(
    () => () => {
      if (selectedLogo) URL.revokeObjectURL(selectedLogo.previewUrl)
    },
    [selectedLogo],
  )

  function updateForm(next: Partial<CompanyForm>) {
    setForm((current) => ({ ...current, ...next }))
    setDirtyFields((current) => {
      const updated = new Set(current)
      for (const key of Object.keys(next) as CompanyFormKey[]) updated.add(key)
      return updated
    })
  }

  function buildUpdatePayload(): UpdateCompanyInput {
    const payload: UpdateCompanyInput = {}
    const writablePayload = payload as Record<CompanyFormKey, string>

    for (const key of dirtyFields) writablePayload[key] = form[key]

    const addressFields: CompanyFormKey[] = [
      'headquartersStreet',
      'headquartersNumber',
      'headquartersComplement',
      'headquartersNeighborhood',
      'headquartersCity',
      'headquartersState',
      'headquartersPostalCode',
    ]
    if (addressFields.some((key) => dirtyFields.has(key))) {
      payload.headquartersAddress = buildHeadquartersAddress()
    }

    return payload
  }

  function buildHeadquartersAddress() {
    return [
      `${form.headquartersStreet}${form.headquartersNumber ? `, ${form.headquartersNumber}` : ''}`,
      form.headquartersComplement,
      form.headquartersNeighborhood,
      form.headquartersCity,
      form.headquartersState,
      form.headquartersPostalCode,
    ]
      .map((item) => item.trim())
      .filter(Boolean)
      .join(', ')
  }

  function selectLogoFile(file?: File) {
    if (!file) return

    const validationError = validateCompanyLogoFile(file)
    if (validationError) {
      setLogoError(validationError)
      return
    }

    setLogoError('')
    setError('')
    setLogoMode('file')
    setSelectedLogo({ file, previewUrl: URL.createObjectURL(file) })
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    selectLogoFile(event.target.files?.[0])
    event.target.value = ''
  }

  function handleLogoDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragActive(false)
    selectLogoFile(event.dataTransfer.files?.[0])
  }

  function removeLogo() {
    setSelectedLogo(null)
    setLogoError('')
    setPreviewFailed(false)
    updateForm({ brandImageUrl: '', logoUrl: '' })
  }

  function handleLogoUrlChange(value: string) {
    setSelectedLogo(null)
    setLogoError('')
    updateForm({ brandImageUrl: value, logoUrl: value })
  }

  function changeLogoMode(nextMode: LogoMode) {
    setLogoMode(nextMode)
    if (nextMode === 'url') setSelectedLogo(null)
  }

  function handleLogoSourceKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return

    event.preventDefault()
    const nextMode: LogoMode = logoMode === 'file' ? 'url' : 'file'
    changeLogoMode(nextMode)
    window.requestAnimationFrame(() => {
      document.getElementById(`company-logo-${nextMode}-tab`)?.focus()
    })
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')

    if (selectedLogo && logoMode === 'file') {
      setError(
        'O envio do arquivo ainda depende da API de logo da imobiliária. Use uma URL para salvar a imagem agora.',
      )
      setSaving(false)
      return
    }

    try {
      if (dirtyFields.size === 0) {
        setNotice('Nenhuma alteração para salvar.')
        return
      }

      const logoChanged = dirtyFields.has('brandImageUrl') || dirtyFields.has('logoUrl')
      await updateCompanyProfile(buildUpdatePayload())
      setDirtyFields(new Set())
      setNotice(
        logoChanged
          ? savedLogoUrl
            ? 'Dados e identidade visual atualizados.'
            : 'Logo removido.'
          : 'Dados da imobiliária atualizados.',
      )
    } catch (caughtError) {
      setError(getErrorMessage(caughtError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-page-stack">
      <section className="admin-page-heading admin-page-heading--settings">
        <div>
          <h1>Minha imobiliária</h1>
          <p>Atualize os dados de contato, endereço e identidade visual da empresa.</p>
        </div>
      </section>

      <div aria-live="polite" className="admin-feedback-region">
        {notice ? <p className="notice" role="status">{notice}</p> : null}
        {error ? <p className="notice notice--error" role="alert">{error}</p> : null}
        {profileDataIncomplete ? (
          <p className="notice admin-profile-data-note" role="status">
            Alguns dados salvos não estão disponíveis nesta sessão. Somente os campos alterados serão enviados.
          </p>
        ) : null}
      </div>

      <section className="admin-settings-layout">
        <form className="panel admin-company-form" onSubmit={handleSubmit}>
          <fieldset className="admin-form-section">
            <legend>Informações da imobiliária</legend>
            <label>
              Nome da imobiliária
              <input
                autoComplete="organization"
                onChange={(event) => updateForm({ name: event.target.value })}
                required
                value={form.name}
              />
            </label>
          </fieldset>

          <fieldset className="admin-form-section">
            <legend>Contato</legend>
            <div className="form-grid">
              <label>
                E-mail corporativo
                <input
                  autoComplete="email"
                  inputMode="email"
                  onChange={(event) => updateForm({ email: event.target.value })}
                  type="email"
                  value={form.email}
                />
              </label>
              <label>
                Telefone
                <input
                  autoComplete="tel"
                  onChange={(event) => updateForm({ phone: event.target.value })}
                  type="tel"
                  value={form.phone}
                />
              </label>
            </div>
            <label>
              WhatsApp
              <input
                onChange={(event) => updateForm({ whatsapp: event.target.value })}
                type="tel"
                value={form.whatsapp}
              />
            </label>
          </fieldset>

          <fieldset className="admin-form-section">
            <legend>Endereço</legend>
            <div className="form-grid form-grid--address">
              <label>
                Rua ou avenida
                <input
                  autoComplete="street-address"
                  onChange={(event) => updateForm({ headquartersStreet: event.target.value })}
                  value={form.headquartersStreet}
                />
              </label>
              <label>
                Número
                <input
                  onChange={(event) => updateForm({ headquartersNumber: event.target.value })}
                  value={form.headquartersNumber}
                />
              </label>
            </div>
            <div className="form-grid form-grid--quarters">
              <label>
                Complemento
                <input
                  onChange={(event) => updateForm({ headquartersComplement: event.target.value })}
                  value={form.headquartersComplement}
                />
              </label>
              <label>
                Bairro
                <input
                  onChange={(event) => updateForm({ headquartersNeighborhood: event.target.value })}
                  value={form.headquartersNeighborhood}
                />
              </label>
              <label>
                Cidade
                <input
                  autoComplete="address-level2"
                  onChange={(event) => updateForm({ headquartersCity: event.target.value })}
                  value={form.headquartersCity}
                />
              </label>
              <label>
                Estado
                <input
                  autoComplete="address-level1"
                  maxLength={2}
                  onChange={(event) => updateForm({ headquartersState: event.target.value.toUpperCase() })}
                  value={form.headquartersState}
                />
              </label>
            </div>
            <label className="admin-postal-code-field">
              CEP
              <input
                autoComplete="postal-code"
                inputMode="numeric"
                onChange={(event) => updateForm({ headquartersPostalCode: event.target.value })}
                value={form.headquartersPostalCode}
              />
            </label>
          </fieldset>

          <fieldset className="admin-form-section admin-logo-section">
            <legend>Identidade visual</legend>
            <p className="admin-form-section__description">
              Use uma imagem PNG, JPG ou JPEG. Logos horizontais e verticais são exibidos sem recorte.
            </p>

            <div
              aria-label="Origem da logomarca"
              className="admin-logo-source-tabs"
              onKeyDown={handleLogoSourceKeyDown}
              role="tablist"
            >
              <button
                aria-controls="company-logo-file-panel"
                aria-selected={logoMode === 'file'}
                className={logoMode === 'file' ? 'admin-logo-source-tab admin-logo-source-tab--active' : 'admin-logo-source-tab'}
                id="company-logo-file-tab"
                onClick={() => changeLogoMode('file')}
                role="tab"
                tabIndex={logoMode === 'file' ? 0 : -1}
                type="button"
              >
                <Upload size={16} />
                Enviar arquivo
              </button>
              <button
                aria-controls="company-logo-url-panel"
                aria-selected={logoMode === 'url'}
                className={logoMode === 'url' ? 'admin-logo-source-tab admin-logo-source-tab--active' : 'admin-logo-source-tab'}
                id="company-logo-url-tab"
                onClick={() => changeLogoMode('url')}
                role="tab"
                tabIndex={logoMode === 'url' ? 0 : -1}
                type="button"
              >
                <Link2 size={16} />
                Informar URL
              </button>
            </div>

            {logoMode === 'file' ? (
              <div
                aria-labelledby="company-logo-file-tab"
                className="admin-logo-file-panel"
                id="company-logo-file-panel"
                role="tabpanel"
              >
                <input
                  accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                  className="admin-logo-file-input"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  type="file"
                />
                <div
                  className={dragActive ? 'admin-logo-dropzone admin-logo-dropzone--active' : 'admin-logo-dropzone'}
                  onDragEnter={(event) => {
                    event.preventDefault()
                    setDragActive(true)
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={handleLogoDrop}
                >
                  <Upload size={20} />
                  <div>
                    <strong>Arraste a imagem para cá</strong>
                    <span>ou escolha um arquivo de até 5 MB</span>
                  </div>
                  <button className="secondary-button" onClick={() => fileInputRef.current?.click()} type="button">
                    {selectedLogo ? 'Trocar imagem' : 'Escolher arquivo'}
                  </button>
                </div>
                <p className="admin-logo-api-note">
                  A seleção e a pré-visualização já estão prontas. O envio do arquivo aguarda uma API específica para o logo da imobiliária.
                </p>
              </div>
            ) : (
              <div
                aria-labelledby="company-logo-url-tab"
                className="admin-logo-url-panel"
                id="company-logo-url-panel"
                role="tabpanel"
              >
                <label>
                  URL da imagem
                  <input
                    inputMode="url"
                    onChange={(event) => handleLogoUrlChange(event.target.value)}
                    placeholder="https://exemplo.com/logo.png"
                    type="url"
                    value={form.brandImageUrl}
                  />
                </label>
              </div>
            )}

            {logoError ? <p aria-live="polite" className="admin-field-error" role="alert">{logoError}</p> : null}

            {logoPreviewUrl && !previewFailed ? (
              <div className="admin-logo-preview-card">
                <div className="admin-logo-preview-card__image">
                  <img
                    alt={`Pré-visualização do logo de ${form.name || 'imobiliária'}`}
                    onError={() => setPreviewFailed(true)}
                    src={logoPreviewUrl}
                  />
                </div>
                <div className="admin-logo-preview-card__meta">
                  <strong>{selectedLogo?.file.name || 'Logo atual'}</strong>
                  <span>{selectedLogo ? 'Pré-visualização local' : 'Imagem por URL'}</span>
                </div>
                <button className="admin-logo-remove" onClick={removeLogo} type="button">
                  <X size={15} />
                  Remover imagem
                </button>
              </div>
            ) : null}

            {previewFailed ? (
              <p className="admin-field-error" role="alert">
                Não foi possível carregar a imagem desta URL. Verifique o endereço informado.
              </p>
            ) : null}
          </fieldset>

          <button className="primary-button admin-submit-button" disabled={saving} type="submit">
            <Save size={17} />
            <span>{saving ? 'Salvando...' : 'Salvar alterações'}</span>
          </button>
        </form>

        <aside className="panel admin-company-summary">
          <div className="admin-brand-preview">
            {logoPreviewUrl && !previewFailed ? (
              <img alt="" onError={() => setPreviewFailed(true)} src={logoPreviewUrl} />
            ) : (
              <ImageIcon aria-hidden="true" size={28} />
            )}
          </div>
          <div className="admin-company-summary__heading">
            <span>Prévia da conta</span>
            <h2>{form.name || 'Imobiliária'}</h2>
          </div>

          <div className="admin-detail-list">
            <Detail icon={Mail} label="E-mail" value={form.email || 'Não informado'} />
            <Detail icon={Phone} label="Contato" value={form.whatsapp || form.phone || 'Não informado'} />
            <Detail icon={MapPin} label="Sede" value={buildHeadquartersAddress() || 'Endereço não informado'} />
            <Detail
              icon={UserRound}
              label="Perfil ativo"
              value={user?.accessRole === 'TECHNICAL' ? 'Técnico' : 'Imobiliária'}
            />
          </div>
        </aside>
      </section>
    </div>
  )
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2
  label: string
  value: string
}) {
  return (
    <div className="admin-detail-row">
      <Icon aria-hidden="true" size={17} />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  )
}
