import {
  AlertCircle,
  Building2,
  Eye,
  MessageSquareText,
  Plus,
  RefreshCw,
  Settings,
  UserPlus,
  UsersRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAdminWorkspace } from '../components/AdminShell'
import { StatusBadge } from '../components/StatusBadge'
import type {
  Lead,
  LeadStatus,
  NegotiationStatus,
  Property,
  PropertyStatus,
} from '../types/api'

const leadStatusLabels: Record<LeadStatus, string> = {
  NEW: 'Novo',
  IN_SERVICE: 'Em atendimento',
  NEGOTIATING: 'Em negociação',
  FINISHED: 'Finalizado',
  LOST: 'Perdido',
}

const openLeadStatuses = new Set<LeadStatus>(['NEW', 'IN_SERVICE', 'NEGOTIATING'])
const openNegotiationStatuses = new Set<NegotiationStatus>(['OPEN', 'FOLLOW_UP', 'PROPOSAL'])

function countByStatus(properties: Array<{ status: PropertyStatus }>, status: PropertyStatus) {
  return properties.filter((property) => property.status === status).length
}

function formatDate(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(date)
}

function pluralize(value: number, singular: string, plural: string) {
  return `${value.toLocaleString('pt-BR')} ${value === 1 ? singular : plural}`
}

export function AdminDashboardPage() {
  const {
    available,
    hasLoaded,
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
  const openLeads = leads.filter((lead) => openLeadStatuses.has(lead.status))
  const newLeads = leads.filter((lead) => lead.status === 'NEW')
  const registeredAgents = users.filter((user) => user.role === 'agent')
  const openNegotiations = negotiations.filter((negotiation) =>
    openNegotiationStatuses.has(negotiation.status),
  )
  const totalViews = propertyPerformance.reduce((total, item) => total + item.views, 0)
  const recentProperties = [...properties]
    .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())
    .slice(0, 4)
  const recentLeads = [...leads]
    .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())
    .slice(0, 4)
  const initialLoading = loading && !hasLoaded

  return (
    <div aria-busy={loading} className="admin-page-stack admin-dashboard-page">
      <section className="admin-page-heading admin-dashboard-heading">
        <div>
          <h1>Painel da imobiliária</h1>
          <p>Acompanhe sua carteira, equipe e oportunidades.</p>
        </div>
        <div className="heading-actions admin-dashboard-heading__actions">
          <button
            aria-label={loading ? 'Atualizando dados' : 'Atualizar dados'}
            className="secondary-button admin-dashboard-refresh"
            disabled={loading}
            onClick={reload}
            title="Atualizar dados"
            type="button"
          >
            <RefreshCw aria-hidden="true" className={loading ? 'spin' : undefined} size={17} />
          </button>
          <Link className="primary-button" to="/admin/imoveis">
            <Plus aria-hidden="true" size={17} />
            <span>Novo imóvel</span>
          </Link>
        </div>
      </section>

      {notice ? (
        <div className="admin-data-notice" role="alert">
          <AlertCircle aria-hidden="true" size={18} />
          <div className="admin-data-notice__copy">
            <strong>Alguns dados não foram atualizados.</strong>
            <p>{notice}</p>
          </div>
          <button
            className="secondary-button admin-data-notice__retry"
            disabled={loading}
            onClick={reload}
            type="button"
          >
            <RefreshCw aria-hidden="true" className={loading ? 'spin' : undefined} size={16} />
            <span>{loading ? 'Tentando novamente...' : 'Tentar novamente'}</span>
          </button>
        </div>
      ) : null}

      {initialLoading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <section aria-label="Visão geral" className="admin-overview-grid">
            <MetricCard
              icon={Building2}
              label="Imóveis cadastrados"
              meta={available.properties
                ? pluralize(availableProperties, 'disponível', 'disponíveis')
                : 'Dados indisponíveis'}
              value={available.properties ? properties.length : null}
            />
            <MetricCard
              icon={MessageSquareText}
              label="Leads em aberto"
              meta={available.leads
                ? pluralize(newLeads.length, 'novo', 'novos')
                : 'Dados indisponíveis'}
              value={available.leads ? openLeads.length : null}
            />
            <MetricCard
              icon={UsersRound}
              label="Corretores cadastrados"
              meta={available.users ? 'Perfis vinculados à imobiliária' : 'Dados indisponíveis'}
              value={available.users ? registeredAgents.length : null}
            />
            <MetricCard
              icon={Eye}
              label="Visualizações"
              meta={
                !available.propertyPerformance
                  ? 'Dados indisponíveis'
                  : propertyPerformance.length
                  ? pluralize(propertyPerformance.length, 'imóvel medido', 'imóveis medidos')
                  : 'Sem dados de desempenho'
              }
              value={available.propertyPerformance ? totalViews : null}
            />
          </section>

          <section aria-label="Atividade recente" className="admin-dashboard-activity-grid">
            <RecentPropertiesPanel available={available.properties} properties={recentProperties} />
            <RecentLeadsPanel available={available.leads} leads={recentLeads} />
          </section>

          <section className="admin-dashboard-bottom-grid">
            <article className="panel admin-panel admin-dashboard-panel admin-negotiations-panel">
              <div className="panel-header admin-dashboard-panel__header">
                <h2>Negociações</h2>
                <Link className="text-link" to="/admin/desempenho">Ver desempenho</Link>
              </div>
              <dl className="admin-negotiation-summary">
                <div>
                  <dt>Abertas</dt>
                  <dd>{available.negotiations ? openNegotiations.length.toLocaleString('pt-BR') : '—'}</dd>
                </div>
                <div>
                  <dt>Leads novos</dt>
                  <dd>{available.leads ? newLeads.length.toLocaleString('pt-BR') : '—'}</dd>
                </div>
                <div>
                  <dt>Imóveis disponíveis</dt>
                  <dd>{available.properties ? availableProperties.toLocaleString('pt-BR') : '—'}</dd>
                </div>
              </dl>
            </article>

            <article className="panel admin-panel admin-dashboard-panel admin-quick-actions-panel">
              <div className="panel-header admin-dashboard-panel__header">
                <h2>Ações rápidas</h2>
              </div>
              <nav aria-label="Ações rápidas" className="admin-quick-actions">
                <Link className="admin-quick-action" to="/admin/imoveis">
                  <Plus aria-hidden="true" size={17} />
                  <span>Novo imóvel</span>
                </Link>
                <Link className="admin-quick-action" to="/admin/corretores">
                  <UserPlus aria-hidden="true" size={17} />
                  <span>Novo corretor</span>
                </Link>
                <Link className="admin-quick-action" to="/admin/configuracoes">
                  <Settings aria-hidden="true" size={17} />
                  <span>Editar imobiliária</span>
                </Link>
              </nav>
            </article>
          </section>
        </>
      )}
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  meta,
  value,
}: {
  icon: typeof Building2
  label: string
  meta: string
  value: number | null
}) {
  return (
    <article className="admin-dashboard-metric">
      <div className="admin-dashboard-metric__header">
        <span>{label}</span>
        <Icon aria-hidden="true" size={19} />
      </div>
      <strong>{value === null ? '—' : value.toLocaleString('pt-BR')}</strong>
      <small>{meta}</small>
    </article>
  )
}

function RecentPropertiesPanel({
  available,
  properties,
}: {
  available: boolean
  properties: Property[]
}) {
  return (
    <article className="panel admin-panel admin-dashboard-panel">
      <div className="panel-header admin-dashboard-panel__header">
        <h2>Imóveis recentes</h2>
        <Link className="text-link" to="/admin/imoveis">Ver todos</Link>
      </div>
      {!available ? (
        <UnavailableAdminState copy="Tente atualizar os dados para consultar a carteira." />
      ) : properties.length ? (
        <div className="admin-dashboard-list">
          {properties.map((property) => {
            const date = formatDate(property.createdAt)
            return (
              <div className="admin-dashboard-list__row" key={property.id}>
                <div className="admin-dashboard-list__content">
                  <strong>{property.title}</strong>
                  <span>
                    {property.city ?? property.cidade ?? 'Cidade não informada'}
                    {date ? ` · ${date}` : ''}
                  </span>
                </div>
                <StatusBadge value={property.status} />
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyAdminState
          actionLabel="Cadastrar imóvel"
          actionTo="/admin/imoveis"
          copy="Cadastre seu primeiro imóvel para exibi-lo no LarMap."
          title="Nenhum imóvel cadastrado ainda"
        />
      )}
    </article>
  )
}

function RecentLeadsPanel({ available, leads }: { available: boolean; leads: Lead[] }) {
  return (
    <article className="panel admin-panel admin-dashboard-panel">
      <div className="panel-header admin-dashboard-panel__header">
        <h2>Leads recentes</h2>
        <Link className="text-link" to="/admin/leads">Ver todos</Link>
      </div>
      {!available ? (
        <UnavailableAdminState copy="Tente atualizar os dados para consultar os contatos." />
      ) : leads.length ? (
        <div className="admin-dashboard-list">
          {leads.map((lead) => {
            const date = formatDate(lead.createdAt)
            return (
              <div
                className={
                  lead.viewed
                    ? 'admin-dashboard-list__row'
                    : 'admin-dashboard-list__row admin-dashboard-list__row--new'
                }
                key={lead.id}
              >
                <div className="admin-dashboard-list__content">
                  <strong>{lead.interestedName ?? 'Interessado não identificado'}</strong>
                  <span>
                    {lead.propertyTitle ?? 'Imóvel não informado'} · {lead.agentName ?? 'Sem corretor'}
                    {date ? ` · ${date}` : ''}
                  </span>
                </div>
                <small className="admin-dashboard-list__status">{leadStatusLabels[lead.status]}</small>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyAdminState
          copy="Os contatos gerados pelos imóveis aparecerão aqui."
          title="Nenhum lead recebido ainda"
        />
      )}
    </article>
  )
}

function UnavailableAdminState({ copy }: { copy: string }) {
  return (
    <div className="admin-empty admin-dashboard-empty" role="status">
      <strong>Dados temporariamente indisponíveis</strong>
      <p>{copy}</p>
    </div>
  )
}

function EmptyAdminState({
  actionLabel,
  actionTo,
  copy,
  title,
}: {
  actionLabel?: string
  actionTo?: string
  copy: string
  title: string
}) {
  return (
    <div className="admin-empty admin-dashboard-empty">
      <strong>{title}</strong>
      <p>{copy}</p>
      {actionLabel && actionTo ? (
        <Link className="text-link admin-dashboard-empty__action" to={actionTo}>{actionLabel}</Link>
      ) : null}
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <>
      <p className="admin-dashboard-loading" role="status">Carregando dados administrativos...</p>
      <section aria-hidden="true" className="admin-overview-grid admin-overview-grid--loading">
        {Array.from({ length: 4 }, (_, index) => (
          <article className="admin-dashboard-skeleton admin-dashboard-skeleton--metric" key={index}>
            <span className="admin-dashboard-skeleton__line admin-dashboard-skeleton__line--label" />
            <span className="admin-dashboard-skeleton__line admin-dashboard-skeleton__line--value" />
            <span className="admin-dashboard-skeleton__line admin-dashboard-skeleton__line--meta" />
          </article>
        ))}
      </section>
      <section aria-hidden="true" className="admin-dashboard-activity-grid">
        {Array.from({ length: 2 }, (_, index) => (
          <article className="admin-dashboard-skeleton admin-dashboard-skeleton--panel" key={index}>
            <span className="admin-dashboard-skeleton__line admin-dashboard-skeleton__line--heading" />
            <span className="admin-dashboard-skeleton__line" />
            <span className="admin-dashboard-skeleton__line" />
            <span className="admin-dashboard-skeleton__line" />
          </article>
        ))}
      </section>
    </>
  )
}
