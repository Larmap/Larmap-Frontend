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
  hasLoaded: boolean
  available: AdminDataAvailability
  notice: string
  reload: () => void
  setLeads: (leads: Lead[]) => void
}

interface AdminDataAvailability {
  properties: boolean
  users: boolean
  leads: boolean
  negotiations: boolean
  agentPerformance: boolean
  propertyPerformance: boolean
}

const initialAvailability: AdminDataAvailability = {
  properties: false,
  users: false,
  leads: false,
  negotiations: false,
  agentPerformance: false,
  propertyPerformance: false,
}

export function useAdminData(token: string | null): AdminDataState {
  const [properties, setProperties] = useState<Property[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [negotiations, setNegotiations] = useState<Negotiation[]>([])
  const [agentPerformance, setAgentPerformance] = useState<PerformanceMetric[]>([])
  const [propertyPerformance, setPropertyPerformance] = useState<PropertyPerformance[]>([])
  const [loading, setLoading] = useState(Boolean(token))
  const [hasLoaded, setHasLoaded] = useState(false)
  const [available, setAvailable] = useState<AdminDataAvailability>(initialAvailability)
  const [notice, setNotice] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!token) return
    const authToken = token
    let ignore = false

    async function load() {
      setLoading(true)
      setNotice('')

      const localLeads = readLocalLeads()
      const loadNotes: string[] = []

      const [
        propertiesResult,
        usersResult,
        leadsResult,
        negotiationsResult,
        agentPerformanceResult,
        propertyPerformanceResult,
      ] = await Promise.allSettled([
        propertiesApi.list(authToken),
        usersApi.list(authToken, 100, 0),
        leadsApi.list(authToken),
        negotiationsApi.list(authToken),
        performanceApi.listAgents(authToken),
        performanceApi.listProperties(authToken),
      ])

      if (!ignore) {
        if (propertiesResult.status === 'fulfilled') {
          setProperties(propertiesResult.value)
        } else {
          loadNotes.push('Não foi possível carregar os imóveis.')
        }

        if (usersResult.status === 'fulfilled') {
          setUsers(usersResult.value.users)
        } else {
          loadNotes.push('Não foi possível carregar os corretores.')
        }

        if (leadsResult.status === 'fulfilled') {
          setLeads(mergeLeadLists(leadsResult.value, localLeads))
        } else {
          setLeads((current) => (current.length ? current : localLeads))
          loadNotes.push(
            localLeads.length
              ? 'Não foi possível sincronizar os leads. Exibindo os dados salvos neste dispositivo.'
              : 'Não foi possível carregar os leads.',
          )
        }

        if (negotiationsResult.status === 'fulfilled') {
          setNegotiations(negotiationsResult.value)
        } else {
          loadNotes.push('Não foi possível carregar as negociações.')
        }

        if (agentPerformanceResult.status === 'fulfilled') {
          setAgentPerformance(agentPerformanceResult.value)
        } else {
          loadNotes.push('Não foi possível carregar o desempenho dos corretores.')
        }

        if (propertyPerformanceResult.status === 'fulfilled') {
          setPropertyPerformance(propertyPerformanceResult.value)
        } else {
          loadNotes.push('Não foi possível carregar o desempenho dos imóveis.')
        }

        setAvailable((current) => ({
          properties: current.properties || propertiesResult.status === 'fulfilled',
          users: current.users || usersResult.status === 'fulfilled',
          leads:
            current.leads ||
            leadsResult.status === 'fulfilled' ||
            localLeads.length > 0,
          negotiations: current.negotiations || negotiationsResult.status === 'fulfilled',
          agentPerformance:
            current.agentPerformance || agentPerformanceResult.status === 'fulfilled',
          propertyPerformance:
            current.propertyPerformance || propertyPerformanceResult.status === 'fulfilled',
        }))

        setNotice(Array.from(new Set(loadNotes)).join(' '))
        setLoading(false)
        setHasLoaded(true)
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
      available,
      loading,
      hasLoaded,
      notice,
      reload: () => setReloadKey((current) => current + 1),
      setLeads,
    }),
    [
      agentPerformance,
      available,
      hasLoaded,
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
