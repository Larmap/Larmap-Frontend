import { BarChart3, Eye, TrendingUp, Users } from 'lucide-react'
import { useAdminWorkspace } from '../components/AdminShell'

export function AdminPerformancePage() {
  const { agentPerformance, propertyPerformance } = useAdminWorkspace()
  const totalViews = propertyPerformance.reduce((total, item) => total + item.views, 0)
  const totalLeads = propertyPerformance.reduce((total, item) => total + item.leads, 0)
  const totalClosedDeals = agentPerformance.reduce((total, item) => total + item.closedDeals, 0)

  return (
    <div className="admin-page-stack">
      <section className="admin-page-heading">
        <div>
          <span className="eyebrow">Métricas</span>
          <h1>Desempenho comercial</h1>
        </div>
      </section>

      <section className="admin-metric-grid admin-metric-grid--compact">
        <Metric icon={Eye} label="Visualizações totais" value={totalViews} />
        <Metric icon={TrendingUp} label="Leads gerados" value={totalLeads} />
        <Metric icon={Users} label="Corretores medidos" value={agentPerformance.length} />
        <Metric icon={BarChart3} label="Fechamentos" value={totalClosedDeals} />
      </section>

      <section className="admin-two-column">
        <article className="panel admin-panel table-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Imóveis</span>
              <h2>Desempenho por imóvel</h2>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Imóvel</th>
                  <th>Visualizações</th>
                  <th>Leads</th>
                  <th>Negociações</th>
                </tr>
              </thead>
              <tbody>
                {propertyPerformance.map((item) => (
                  <tr key={item.propertyId}>
                    <td><strong>{item.propertyTitle}</strong></td>
                    <td>{item.views}</td>
                    <td>{item.leads}</td>
                    <td>{item.negotiations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel admin-panel table-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Corretores</span>
              <h2>Desempenho por corretor</h2>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Corretor</th>
                  <th>Leads</th>
                  <th>Negociações</th>
                  <th>Fechamentos</th>
                  <th>Resposta</th>
                </tr>
              </thead>
              <tbody>
                {agentPerformance.map((item) => (
                  <tr key={item.agentId}>
                    <td><strong>{item.agentName}</strong></td>
                    <td>{item.leads}</td>
                    <td>{item.negotiations}</td>
                    <td>{item.closedDeals}</td>
                    <td>{item.responseRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
  icon: typeof Eye
  label: string
  value: number
}) {
  return (
    <article className="metric-card admin-metric-card">
      <div className="metric-icon metric-icon--blue">
        <Icon size={18} />
      </div>
      <span>{label}</span>
      <strong>{value.toLocaleString('pt-BR')}</strong>
    </article>
  )
}
