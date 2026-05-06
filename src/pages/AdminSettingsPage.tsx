import { Building2, Image, Mail, MapPin, Phone, Save, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { getErrorMessage } from '../api/errors'
import { useAuth } from '../context/AuthContext'
import type { UpdateCompanyInput } from '../types/api'

export function AdminSettingsPage() {
  const { company, updateCompanyProfile, user } = useAuth()
  const [form, setForm] = useState<Required<UpdateCompanyInput>>({
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
  })
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function updateForm(next: Partial<Required<UpdateCompanyInput>>) {
    setForm((current) => ({ ...current, ...next }))
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')

    try {
      const headquartersAddress = buildHeadquartersAddress()
      await updateCompanyProfile({
        ...form,
        logoUrl: form.brandImageUrl,
        headquartersAddress,
      })
      setNotice('Dados da imobiliária atualizados.')
    } catch (caughtError) {
      setError(getErrorMessage(caughtError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="admin-page-stack">
      <section className="admin-page-heading">
        <div>
          <span className="eyebrow">Conta</span>
          <h1>Dados da imobiliária</h1>
        </div>
      </section>

      {notice ? <p className="notice">{notice}</p> : null}
      {error ? <p className="notice notice--error">{error}</p> : null}

      <section className="admin-settings-layout">
        <form className="panel admin-company-form" onSubmit={handleSubmit}>
          <div className="panel-header">
            <div>
              <span className="eyebrow">Cadastro obrigatório</span>
              <h2>Identidade e sede</h2>
            </div>
          </div>

          <fieldset className="admin-form-section">
            <legend>Identidade</legend>
            <label>
              Nome da imobiliária
              <input onChange={(event) => updateForm({ name: event.target.value })} required value={form.name} />
            </label>
            <div className="form-grid">
              <label>
                Email corporativo
                <input inputMode="email" onChange={(event) => updateForm({ email: event.target.value })} required type="email" value={form.email} />
              </label>
              <label>
                Foto de marca / logomarca
                <input onChange={(event) => updateForm({ brandImageUrl: event.target.value })} placeholder="URL da imagem" required value={form.brandImageUrl} />
              </label>
            </div>
            <div className="form-grid">
              <label>
                Telefone
                <input onChange={(event) => updateForm({ phone: event.target.value })} type="tel" value={form.phone} />
              </label>
              <label>
                WhatsApp
                <input onChange={(event) => updateForm({ whatsapp: event.target.value })} type="tel" value={form.whatsapp} />
              </label>
            </div>
          </fieldset>

          <fieldset className="admin-form-section">
            <legend>Endereço de sede</legend>
            <div className="form-grid form-grid--address">
              <label>
                Rua ou avenida
                <input onChange={(event) => updateForm({ headquartersStreet: event.target.value })} required value={form.headquartersStreet} />
              </label>
              <label>
                Número
                <input onChange={(event) => updateForm({ headquartersNumber: event.target.value })} required value={form.headquartersNumber} />
              </label>
            </div>
            <div className="form-grid form-grid--quarters">
              <label>
                Complemento
                <input onChange={(event) => updateForm({ headquartersComplement: event.target.value })} value={form.headquartersComplement} />
              </label>
              <label>
                Bairro
                <input onChange={(event) => updateForm({ headquartersNeighborhood: event.target.value })} required value={form.headquartersNeighborhood} />
              </label>
              <label>
                Cidade
                <input onChange={(event) => updateForm({ headquartersCity: event.target.value })} required value={form.headquartersCity} />
              </label>
              <label>
                Estado
                <input maxLength={2} onChange={(event) => updateForm({ headquartersState: event.target.value.toUpperCase() })} required value={form.headquartersState} />
              </label>
            </div>
            <label>
              CEP
              <input inputMode="numeric" onChange={(event) => updateForm({ headquartersPostalCode: event.target.value })} required value={form.headquartersPostalCode} />
            </label>
          </fieldset>

          <button className="primary-button admin-submit-button" disabled={saving} type="submit">
            <Save size={17} />
            <span>{saving ? 'Salvando...' : 'Salvar dados da imobiliária'}</span>
          </button>
        </form>

        <aside className="panel admin-company-summary">
          <div className="admin-brand-preview">
            {form.brandImageUrl ? <img alt="" src={form.brandImageUrl} /> : <Image size={30} />}
          </div>
          <div>
            <span className="eyebrow">Resumo</span>
            <h2>{form.name || 'Imobiliária'}</h2>
          </div>

          <div className="admin-detail-list">
            <Detail icon={Mail} label="Email" value={form.email || 'Não informado'} />
            <Detail icon={Phone} label="Contato" value={form.whatsapp || form.phone || 'Não informado'} />
            <Detail icon={MapPin} label="Sede" value={buildHeadquartersAddress() || 'Endereço obrigatório'} />
            <Detail icon={UserRound} label="Perfil ativo" value={user?.role === 'agent' ? 'Corretor' : 'Imobiliária/Admin'} />
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
      <Icon size={17} />
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  )
}
