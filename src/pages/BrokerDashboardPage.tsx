import { Home, MessageSquareText, PhoneCall, TrendingUp } from 'lucide-react'
import { useAdminWorkspace } from '../components/AdminShell'
import { useAuth } from '../context/AuthContext'

export function BrokerDashboardPage() {
  const { user } = useAuth()
  const { leads, negotiations, properties, propertyPerformance } = useAdminWorkspace()
  const agentLeads = user ? leads.filter((lead) => lead.agentId === user.id || !lead.agentId) : leads
  const agentNegotiations = user
    ? negotiations.filter((negotiation) => negotiation.agentId === user.id || !negotiation.agentId)
    : negotiations

  return (
    <div className="admin-page-stack">
      <section className="admin-page-heading">
        <div>
          <span className="eyebrow">Painel do corretor</span>
          <h1>{user?.name ?? 'Carteira comercial'}</h1>
        </div>
      </section>

      <section className="admin-metric-grid admin-metric-grid--compact">
        <Metric icon={Home} label="Imóveis associados" value={properties.length} />
        <Metric icon={MessageSquareText} label="Leads recebidos" value={agentLeads.length} />
        <Metric icon={PhoneCall} label="Contatos pendentes" value={agentLeads.filter((lead) => lead.status === 'NEW').length} />
        <Metric icon={TrendingUp} label="Negociações" value={agentNegotiations.length} />
      </section>

      <section className="admin-two-column">
        <article className="panel admin-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Carteira</span>
              <h2>Imóveis associados</h2>
            </div>
          </div>
          <div className="admin-activity-list">
            {properties.slice(0, 8).map((property) => {
              const performance = propertyPerformance.find((item) => item.propertyId === property.id)

              return (
                <div className="admin-activity-row" key={property.id}>
                  <div>
                    <strong>{property.title}</strong>
                    <span>{performance?.views ?? 0} visualizações | {performance?.leads ?? 0} leads</span>
                  </div>
                  <small>{property.status}</small>
                </div>
              )
            })}
          </div>
        </article>

        <article className="panel admin-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Atendimento</span>
              <h2>Leads e negociações</h2>
            </div>
          </div>
          <div className="admin-activity-list">
            {agentLeads.slice(0, 8).map((lead) => (
              <div className={lead.viewed ? 'admin-activity-row' : 'admin-activity-row admin-activity-row--new'} key={lead.id}>
                <div>
                  <strong>{lead.interestedName ?? 'Interessado'}</strong>
                  <span>{lead.propertyTitle ?? 'Imóvel'} | {lead.whatsapp || lead.phone || 'Sem contato'}</span>
                </div>
                <small>{lead.status}</small>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Home
  label: string
  value: number
}) {
  return (
    <article className="metric-card admin-metric-card">
      <div className="metric-icon">
        <Icon size={18} />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  )
}
