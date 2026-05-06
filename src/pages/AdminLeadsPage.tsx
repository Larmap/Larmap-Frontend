import { CheckCircle2, Mail, MessageSquareText, Phone, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { ApiError, leadsApi } from '../api/client'
import { useAdminWorkspace } from '../components/AdminShell'
import { useAuth } from '../context/AuthContext'
import type { Lead, LeadStatus } from '../types/api'
import { updateLocalLead } from '../utils/localLeads'

const leadStatusLabels: Record<LeadStatus, string> = {
  NEW: 'Novo',
  IN_SERVICE: 'Em atendimento',
  NEGOTIATING: 'Em negociação',
  FINISHED: 'Finalizado',
  LOST: 'Perdido',
}

const sourceLabels: Record<string, string> = {
  INTEREST: 'Tenho interesse',
  CONTACT: 'Contato',
  WHATSAPP: 'WhatsApp',
  PHONE: 'Ver telefone',
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value))
}

export function AdminLeadsPage() {
  const { token } = useAuth()
  const { leads, reload, setLeads } = useAdminWorkspace()
  const [notice, setNotice] = useState('')

  async function updateLead(lead: Lead, input: Partial<Lead>) {
    const nextLead = {
      ...lead,
      ...input,
      updatedAt: new Date().toISOString(),
    }

    updateLocalLead(lead.id, input)
    setLeads(leads.map((item) => (item.id === lead.id ? nextLead : item)))
    setNotice('')

    if (!token) return

    try {
      await leadsApi.update(token, lead.id, input)
    } catch (error) {
      if (error instanceof ApiError && [404, 405, 501].includes(error.status)) {
        setNotice('Lead atualizado visualmente. Endpoint de leads ainda não está disponível no backend.')
      } else {
        setNotice('Não foi possível sincronizar o lead agora.')
      }
    }
  }

  return (
    <div className="admin-page-stack">
      <section className="admin-page-heading">
        <div>
          <span className="eyebrow">Atendimento</span>
          <h1>Leads e contatos</h1>
        </div>
        <button className="secondary-button" onClick={reload} type="button">
          <RefreshCw size={17} />
          <span>Atualizar</span>
        </button>
      </section>

      {notice ? <p className="notice">{notice}</p> : null}

      <section className="admin-leads-board">
        <article className="panel admin-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">{leads.filter((lead) => !lead.viewed).length} novos</span>
              <h2>Leads recentes</h2>
            </div>
            <div className="metric-icon metric-icon--warning">
              <MessageSquareText size={18} />
            </div>
          </div>

          {leads.length ? (
            <div className="admin-lead-list">
              {leads.map((lead) => (
                <article className={lead.viewed ? 'admin-lead-card' : 'admin-lead-card admin-lead-card--new'} key={lead.id}>
                  <div className="admin-lead-card__main">
                    <div>
                      <strong>{lead.interestedName ?? 'Interessado não identificado'}</strong>
                      <span>{lead.propertyTitle ?? 'Imóvel não informado'}</span>
                    </div>
                    <span className={`admin-lead-status admin-lead-status--${lead.status.toLowerCase()}`}>
                      {leadStatusLabels[lead.status]}
                    </span>
                  </div>

                  <div className="admin-lead-card__meta">
                    <span>{sourceLabels[lead.source] ?? lead.source}</span>
                    <span>{lead.agentName ?? 'Sem corretor responsável'}</span>
                    <span>{formatDateTime(lead.createdAt)}</span>
                  </div>

                  <div className="admin-lead-card__contact">
                    <Phone size={14} />
                    <span>{lead.whatsapp || lead.phone || 'Contato não capturado'}</span>
                  </div>
                  {lead.email ? (
                    <div className="admin-lead-card__contact">
                      <Mail size={14} />
                      <span>{lead.email}</span>
                    </div>
                  ) : null}

                  <div className="admin-lead-card__actions">
                    <select
                      onChange={(event) => updateLead(lead, { status: event.target.value as LeadStatus, viewed: true })}
                      value={lead.status}
                    >
                      {Object.entries(leadStatusLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <button className="secondary-button" onClick={() => updateLead(lead, { viewed: true, status: lead.status === 'NEW' ? 'IN_SERVICE' : lead.status })} type="button">
                      <CheckCircle2 size={16} />
                      <span>Marcar atendido</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="admin-empty">
              <strong>Nenhum lead registrado</strong>
              <p>Cliques de interesse, contato, WhatsApp e telefone serão representados nesta lista.</p>
            </div>
          )}
        </article>
      </section>
    </div>
  )
}
