import { useEffect, useMemo, useState } from 'react'
import {
  leadsApi,
  negotiationsApi,
  performanceApi,
  propertiesApi,
  usersApi,
} from '../api/client'
import type {
  Lead,
  Negotiation,
  PerformanceMetric,
  Property,
  PropertyPerformance,
  User,
} from '../types/api'
import { mergeLeadLists, readLocalLeads } from '../utils/localLeads'

interface AdminDataState {
  properties: Property[]
  users: User[]
  leads: Lead[]
  negotiations: Negotiation[]
  agentPerformance: PerformanceMetric[]
  propertyPerformance: PropertyPerformance[]
  loading: boolean
  notice: string
  reload: () => void
  setLeads: (leads: Lead[]) => void
}

export function useAdminData(token: string | null): AdminDataState {
  const [properties, setProperties] = useState<Property[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [negotiations, setNegotiations] = useState<Negotiation[]>([])
  const [agentPerformance, setAgentPerformance] = useState<PerformanceMetric[]>([])
  const [propertyPerformance, setPropertyPerformance] = useState<PropertyPerformance[]>([])
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!token) return
    const authToken = token
    let ignore = false

    async function load() {
      setLoading(true)
      setNotice('')

      let nextProperties: Property[] = []
      let nextUsers: User[] = []
      let nextLeads: Lead[] = []
      let nextNegotiations: Negotiation[] = []
      let nextAgentPerformance: PerformanceMetric[] = []
      let nextPropertyPerformance: PropertyPerformance[] = []
      const loadNotes: string[] = []

      try {
        nextProperties = await propertiesApi.list(authToken)
      } catch {
        loadNotes.push('Não foi possível carregar imóveis.')
      }

      try {
        const userResponse = await usersApi.list(authToken, 100, 0)
        nextUsers = userResponse.users
      } catch {
        loadNotes.push('Não foi possível carregar corretores.')
      }

      try {
        nextLeads = mergeLeadLists(await leadsApi.list(authToken), readLocalLeads())
      } catch {
        nextLeads = readLocalLeads()
      }

      try {
        nextNegotiations = await negotiationsApi.list(authToken)
      } catch {
        nextNegotiations = []
      }

      try {
        nextAgentPerformance = await performanceApi.listAgents(authToken)
      } catch {
        nextAgentPerformance = []
      }

      try {
        nextPropertyPerformance = await performanceApi.listProperties(authToken)
      } catch {
        nextPropertyPerformance = []
      }

      if (!ignore) {
        setProperties(nextProperties)
        setUsers(nextUsers)
        setLeads(nextLeads)
        setNegotiations(nextNegotiations)
        setAgentPerformance(nextAgentPerformance)
        setPropertyPerformance(nextPropertyPerformance)
        setNotice(Array.from(new Set(loadNotes)).join(' '))
        setLoading(false)
      }
    }

    void load()

    return () => {
      ignore = true
    }
  }, [reloadKey, token])

  return useMemo(
    () => ({
      properties,
      users,
      leads,
      negotiations,
      agentPerformance,
      propertyPerformance,
      loading,
      notice,
      reload: () => setReloadKey((current) => current + 1),
      setLeads,
    }),
    [
      agentPerformance,
      leads,
      loading,
      negotiations,
      notice,
      properties,
      propertyPerformance,
      users,
    ],
  )
}
