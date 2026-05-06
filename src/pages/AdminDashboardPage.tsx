import {
  ArrowUpRight,
  BarChart3,
  Home,
  MessageSquareText,
  Plus,
  RefreshCw,
  UserCheck,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAdminWorkspace } from '../components/AdminShell'
import { StatusBadge } from '../components/StatusBadge'
import type { LeadStatus, PropertyStatus } from '../types/api'

const leadStatusLabels: Record<LeadStatus, string> = {
  NEW: 'Novo',
  IN_SERVICE: 'Em atendimento',
  NEGOTIATING: 'Em negociação',
  FINISHED: 'Finalizado',
  LOST: 'Perdido',
}

function countByStatus(properties: Array<{ status: PropertyStatus }>, status: PropertyStatus) {
  return properties.filter((property) => property.status === status).length
}

function formatDate(value?: string) {
  if (!value) return ''
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(value))
}

export function AdminDashboardPage() {
  const {
    leads,
    loading,
    negotiations,
    notice,
    properties,
    propertyPerformance,
    reload,
    users,
  } = useAdminWorkspace()

  const availableProperties = countByStatus(properties, 'AVAILABLE')
  const negotiatingProperties = countByStatus(properties, 'NEGOTIATING')
  const newLeads = leads.filter((lead) => !lead.viewed)
  const activeAgents = users.filter((user) => user.role === 'agent' || user.role === 'manager')
  const totalViews = propertyPerformance.reduce((total, item) => total + item.views, 0)
  const recentProperties = [...properties]
    .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())
    .slice(0, 4)

  return (
    <div className="admin-page-stack">
      <section className="admin-page-heading admin-dashboard-hero">
        <div>
          <span className="eyebrow">Visão geral</span>
          <h1>Painel da imobiliária</h1>
          <p>Resumo operacional da carteira, atendimento e equipe.</p>
        </div>
        <div className="heading-actions">
          <Link className="primary-button" to="/admin/imoveis">
            <Plus size={17} />
            <span>Novo imóvel</span>
          </Link>
          <button className="secondary-button" onClick={reload} type="button">
            <RefreshCw size={17} />
            <span>Atualizar</span>
          </button>
        </div>
      </section>

      {notice ? <p className="notice">{notice}</p> : null}

      <section className="admin-overview-grid" aria-label="Resumo executivo">
        <InsightCard icon={Home} label="Imóveis publicados" value={properties.length} meta={`${availableProperties} disponíveis`} />
        <InsightCard icon={MessageSquareText} label="Leads em aberto" value={newLeads.length} meta={`${leads.length} leads no total`} tone="green" />
        <InsightCard icon={UserCheck} label="Corretores ativos" value={activeAgents.length} meta="Equipe vinculada" />
        <InsightCard icon={BarChart3} label="Visualizações" value={totalViews} meta={`${negotiatingProperties} em negociação`} tone="blue" />
      </section>

      <section className="admin-dashboard-clean-grid">
        <article className="panel admin-panel admin-command-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Ações</span>
              <h2>Fluxo de trabalho</h2>
            </div>
          </div>
          <Link className="admin-action-row" to="/admin/imoveis">
            <span>Cadastrar imóvel com endereço, mídia e corretor</span>
            <ArrowUpRight size={16} />
          </Link>
          <Link className="admin-action-row" to="/admin/corretores">
            <span>Gerenciar corretores responsáveis</span>
            <ArrowUpRight size={16} />
          </Link>
          <Link className="admin-action-row" to="/admin/configuracoes">
            <span>Completar dados da imobiliária</span>
            <ArrowUpRight size={16} />
          </Link>
        </article>

        <article className="panel admin-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Carteira</span>
              <h2>Últimos imóveis</h2>
            </div>
            <Link className="text-link" to="/admin/imoveis">Ver todos</Link>
          </div>
          {recentProperties.length ? (
            <div className="admin-activity-list">
              {recentProperties.map((property) => (
                <div className="admin-activity-row" key={property.id}>
                  <div>
                    <strong>{property.title}</strong>
                    <span>{property.city ?? property.cidade ?? 'Cidade não informada'} | {formatDate(property.createdAt)}</span>
                  </div>
                  <StatusBadge value={property.status} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyAdminState title="Carteira vazia" copy="Cadastre o primeiro imóvel com endereço completo para publicá-lo no mapa." />
          )}
        </article>

        <article className="panel admin-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Atendimento</span>
              <h2>Leads recentes</h2>
            </div>
            <Link className="text-link" to="/admin/leads">Ver leads</Link>
          </div>
          {leads.length ? (
            <div className="admin-activity-list">
              {leads.slice(0, 4).map((lead) => (
                <div className={lead.viewed ? 'admin-activity-row' : 'admin-activity-row admin-activity-row--new'} key={lead.id}>
                  <div>
                    <strong>{lead.interestedName ?? 'Interessado não identificado'}</strong>
                    <span>{lead.propertyTitle ?? 'Imóvel'} | {lead.agentName ?? 'Sem corretor'}</span>
                  </div>
                  <small>{leadStatusLabels[lead.status]}</small>
                </div>
              ))}
            </div>
          ) : (
            <EmptyAdminState title="Nenhum lead recebido" copy="Os contatos gerados pelo mapa aparecerão aqui." />
          )}
        </article>

        <article className="panel admin-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Pipeline</span>
              <h2>Negociações</h2>
            </div>
          </div>
          <div className="admin-status-strip">
            <div>
              <span>Abertas</span>
              <strong>{negotiations.length}</strong>
            </div>
            <div>
              <span>Leads novos</span>
              <strong>{newLeads.length}</strong>
            </div>
            <div>
              <span>Disponíveis</span>
              <strong>{availableProperties}</strong>
            </div>
          </div>
        </article>
      </section>

      {loading ? <p className="empty-copy">Atualizando dados administrativos...</p> : null}
    </div>
  )
}

function InsightCard({
  icon: Icon,
  label,
  meta,
  tone,
  value,
}: {
  icon: typeof Home
  label: string
  meta: string
  tone?: 'green' | 'blue'
  value: number
}) {
  return (
    <article className={`admin-insight-card${tone ? ` admin-insight-card--${tone}` : ''}`}>
      <div className="metric-icon">
        <Icon size={18} />
      </div>
      <span>{label}</span>
      <strong>{value.toLocaleString('pt-BR')}</strong>
      <small>{meta}</small>
    </article>
  )
}

function EmptyAdminState({ copy, title }: { copy: string; title: string }) {
  return (
    <div className="admin-empty">
      <strong>{title}</strong>
      <p>{copy}</p>
    </div>
  )
}
