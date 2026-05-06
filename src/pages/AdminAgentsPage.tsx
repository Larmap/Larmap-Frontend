import { BarChart3 } from 'lucide-react'
import { useAdminWorkspace } from '../components/AdminShell'
import { UsersPage } from './UsersPage'

export function AdminAgentsPage() {
  const { agentPerformance } = useAdminWorkspace()

  return (
    <div className="admin-page-stack">
      <UsersPage />

      <article className="panel admin-panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Desempenho</span>
            <h2>Corretores vinculados</h2>
          </div>
          <div className="metric-icon metric-icon--blue">
            <BarChart3 size={18} />
          </div>
        </div>

        {agentPerformance.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Corretor</th>
                  <th>Imóveis</th>
                  <th>Leads</th>
                  <th>Negociações</th>
                  <th>Fechamentos</th>
                  <th>Resposta</th>
                </tr>
              </thead>
              <tbody>
                {agentPerformance.map((agent) => (
                  <tr key={agent.agentId}>
                    <td><strong>{agent.agentName}</strong></td>
                    <td>{agent.activeProperties}</td>
                    <td>{agent.leads}</td>
                    <td>{agent.negotiations}</td>
                    <td>{agent.closedDeals}</td>
                    <td>{agent.responseRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty">
            <strong>Nenhum desempenho disponível</strong>
            <p>As métricas por corretor aparecerão quando houver usuários e leads vinculados.</p>
          </div>
        )}
      </article>
    </div>
  )
}
