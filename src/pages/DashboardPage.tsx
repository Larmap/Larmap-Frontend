import {
  Activity,
  Building2,
  ExternalLink,
  MapPinned,
  Plus,
  Server,
  UserPlus,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE_URL, ApiError, healthApi, propertiesApi, usersApi } from '../api/client'
import { getErrorMessage } from '../api/errors'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'
import type { Property, PropertyStatus, User } from '../types/api'

type ApiState = 'checking' | 'online' | 'offline'

const statusOrder: PropertyStatus[] = ['AVAILABLE', 'NEGOTIATING', 'SOLD']

function formatDate(value?: string) {
  if (!value) return 'Sem data'

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(value))
}

export function DashboardPage() {
  const { token, company } = useAuth()
  const [apiState, setApiState] = useState<ApiState>('checking')
  const [users, setUsers] = useState<User[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [usersTotal, setUsersTotal] = useState(0)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!token) return
    const authToken = token

    let ignore = false

    async function loadDashboard() {
      setNotice('')
      setApiState('checking')

      try {
        await healthApi.check()
        if (!ignore) setApiState('online')
      } catch {
        if (!ignore) setApiState('offline')
      }

      try {
        const usersResponse = await usersApi.list(authToken, 5, 0)
        if (!ignore) {
          setUsers(usersResponse.users)
          setUsersTotal(usersResponse.total)
        }
      } catch (caughtError) {
        if (!ignore) setNotice(getErrorMessage(caughtError))
      }

      try {
        const propertiesResponse = await propertiesApi.list(authToken)
        if (!ignore) setProperties(propertiesResponse)
      } catch (caughtError) {
        if (!ignore && caughtError instanceof ApiError && caughtError.status !== 404) {
          setNotice(getErrorMessage(caughtError))
        }
      }
    }

    loadDashboard()

    return () => {
      ignore = true
    }
  }, [token])

  const statusCounts = properties.reduce<Record<PropertyStatus, number>>(
    (accumulator, property) => {
      accumulator[property.status] += 1
      return accumulator
    },
    { AVAILABLE: 0, NEGOTIATING: 0, SOLD: 0 },
  )

  const recentProperties = useMemo(
    () =>
      [...properties]
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        .slice(0, 5),
    [properties],
  )

  return (
    <div className="page-stack">
      <section className="page-heading dashboard-heading">
        <div>
          <span className="eyebrow">Painel da imobiliária</span>
          <h1>{company?.name ?? 'SmartMap'}</h1>
        </div>
        <div className={`api-state api-state--${apiState}`}>
          <Server size={17} />
          <span>
            {apiState === 'online'
              ? 'API online'
              : apiState === 'offline'
                ? 'API offline'
                : 'Verificando API'}
          </span>
        </div>
      </section>

      {notice ? <p className="notice notice--error">{notice}</p> : null}

      <section className="quick-actions" aria-label="Ações rápidas">
        <Link className="quick-action" to="/app/properties">
          <Plus size={18} />
          <span>Cadastrar imóvel</span>
        </Link>
        <Link className="quick-action" to="/app/users">
          <UserPlus size={18} />
          <span>Adicionar corretor</span>
        </Link>
        <Link className="quick-action" rel="noreferrer" to="/mapa" target="_blank">
          <ExternalLink size={18} />
          <span>Abrir mapa público</span>
        </Link>
      </section>

      <section className="metric-grid" aria-label="Indicadores principais">
        <article className="metric-card">
          <div className="metric-icon">
            <MapPinned size={19} />
          </div>
          <span>Imóveis</span>
          <strong>{properties.length}</strong>
        </article>

        <article className="metric-card">
          <div className="metric-icon metric-icon--success">
            <Building2 size={19} />
          </div>
          <span>Disponíveis</span>
          <strong>{statusCounts.AVAILABLE}</strong>
        </article>

        <article className="metric-card">
          <div className="metric-icon metric-icon--warning">
            <Activity size={19} />
          </div>
          <span>Em negociação</span>
          <strong>{statusCounts.NEGOTIATING}</strong>
        </article>

        <article className="metric-card">
          <div className="metric-icon metric-icon--blue">
            <Users size={19} />
          </div>
          <span>Equipe</span>
          <strong>{usersTotal}</strong>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Mapa</span>
          <h2>Imóveis recentes</h2>
            </div>
            <Link className="text-link" to="/app/properties">
              Gerenciar
            </Link>
          </div>

          {recentProperties.length ? (
            <div className="compact-list">
              {recentProperties.map((property) => (
                <div className="compact-row compact-row--property" key={property.id}>
                  <div>
                    <strong>{property.title}</strong>
                    <span>
                      {property.latitude.toFixed(4)}, {property.longitude.toFixed(4)} - {formatDate(property.createdAt)}
                    </span>
                  </div>
                  <StatusBadge value={property.status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state empty-state--compact">
              <MapPinned size={28} />
              <strong>Nenhum imóvel cadastrado</strong>
              <p>Use a ação rápida para criar o primeiro ponto do mapa.</p>
            </div>
          )}
        </article>

        <div className="dashboard-side">
          <article className="panel">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Status</span>
                <h2>Resumo dos imóveis</h2>
              </div>
            </div>

            <div className="status-summary">
              {statusOrder.map((status) => (
                <div key={status}>
                  <StatusBadge value={status} />
                  <strong>{statusCounts[status]}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-header">
              <div>
                <span className="eyebrow">Equipe</span>
                <h2>Usuários recentes</h2>
              </div>
              <Link className="text-link" to="/app/users">
                Ver equipe
              </Link>
            </div>

            {users.length ? (
              <div className="compact-list">
                {users.map((user) => (
                  <div className="compact-row" key={user.id}>
                    <div>
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                    </div>
                    <StatusBadge kind="role" value={user.role} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-copy">Nenhum usuário carregado.</p>
            )}
          </article>

          <article className="panel api-panel">
            <span className="eyebrow">Integração</span>
            <strong>{API_BASE_URL.replace(/^https?:\/\//, '')}</strong>
          </article>
        </div>
      </section>
    </div>
  )
}
