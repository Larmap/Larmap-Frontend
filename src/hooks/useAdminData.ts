import { useEffect, useMemo, useState } from 'react'
import {
  leadsApi,
  negotiationsApi,
  performanceApi,
  propertiesApi,
  usersApi,
} from '../api/client'
import { featureFlags } from '../config/features'
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

export interface AdminDataRequirements {
  properties?: boolean
  users?: boolean
  leads?: boolean
  negotiations?: boolean
  agentPerformance?: boolean
  propertyPerformance?: boolean
}

const initialAvailability: AdminDataAvailability = {
  properties: false,
  users: false,
  leads: false,
  negotiations: false,
  agentPerformance: false,
  propertyPerformance: false,
}

type AdminDataKey = keyof AdminDataAvailability

interface DataRequest {
  key: AdminDataKey
  label: string
  load: () => Promise<unknown>
  apply: (value: unknown, localLeads: Lead[]) => void
}

/** Administrative data is route-scoped; mounting the shell never prefetches every integration. */
export function useAdminData(
  token: string | null,
  requirements: AdminDataRequirements,
): AdminDataState {
  const [properties, setProperties] = useState<Property[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [negotiations, setNegotiations] = useState<Negotiation[]>([])
  const [agentPerformance, setAgentPerformance] = useState<PerformanceMetric[]>([])
  const [propertyPerformance, setPropertyPerformance] = useState<PropertyPerformance[]>([])
  const [loading, setLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [available, setAvailable] = useState<AdminDataAvailability>(initialAvailability)
  const [notice, setNotice] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const needsProperties = Boolean(requirements.properties)
  const needsUsers = Boolean(requirements.users)
  const needsLeads = Boolean(requirements.leads)
  const needsNegotiations = Boolean(requirements.negotiations && featureFlags.NEGOTIATIONS_API)
  const needsAgentPerformance = Boolean(requirements.agentPerformance && featureFlags.PERFORMANCE_API)
  const needsPropertyPerformance = Boolean(requirements.propertyPerformance && featureFlags.PERFORMANCE_API)

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }

    const authToken = token
    const localLeads = needsLeads ? readLocalLeads() : []
    const requests: DataRequest[] = []

    if (needsProperties) {
      requests.push({
        key: 'properties',
        label: 'Não foi possível carregar os imóveis.',
        load: () => propertiesApi.list(authToken),
        apply: (value) => setProperties(value as Property[]),
      })
    }

    if (needsUsers) {
      requests.push({
        key: 'users',
        label: 'Não foi possível carregar os corretores.',
        load: () => usersApi.list(authToken, 100, 0),
        apply: (value) => setUsers((value as { users: User[] }).users),
      })
    }

    if (needsLeads) {
      requests.push({
        key: 'leads',
        label: localLeads.length
          ? 'Não foi possível sincronizar os leads. Exibindo os dados salvos neste dispositivo.'
          : 'Não foi possível carregar os leads.',
        load: () => leadsApi.list(authToken),
        apply: (value, savedLeads) => setLeads(mergeLeadLists(value as Lead[], savedLeads)),
      })
    }

    if (needsNegotiations) {
      requests.push({
        key: 'negotiations',
        label: 'Não foi possível carregar as negociações.',
        load: () => negotiationsApi.list(authToken),
        apply: (value) => setNegotiations(value as Negotiation[]),
      })
    }

    if (needsAgentPerformance) {
      requests.push({
        key: 'agentPerformance',
        label: 'Não foi possível carregar o desempenho dos corretores.',
        load: () => performanceApi.listAgents(authToken),
        apply: (value) => setAgentPerformance(value as PerformanceMetric[]),
      })
    }

    if (needsPropertyPerformance) {
      requests.push({
        key: 'propertyPerformance',
        label: 'Não foi possível carregar o desempenho dos imóveis.',
        load: () => performanceApi.listProperties(authToken),
        apply: (value) => setPropertyPerformance(value as PropertyPerformance[]),
      })
    }

    if (!requests.length) {
      setLoading(false)
      setHasLoaded(true)
      setNotice('')
      return
    }

    let ignore = false
    setLoading(true)
    setNotice('')

    void Promise.allSettled(requests.map((request) => request.load())).then((results) => {
      if (ignore) return

      const loadNotes: string[] = []
      results.forEach((result, index) => {
        const request = requests[index]

        if (result.status === 'fulfilled') {
          request.apply(result.value, localLeads)
          setAvailable((current) => ({ ...current, [request.key]: true }))
          return
        }

        if (request.key === 'leads' && localLeads.length) {
          setLeads((current) => (current.length ? current : localLeads))
          setAvailable((current) => ({ ...current, leads: true }))
        }
        loadNotes.push(request.label)
      })

      setNotice(Array.from(new Set(loadNotes)).join(' '))
      setLoading(false)
      setHasLoaded(true)
    })

    return () => {
      ignore = true
    }
  }, [
    needsAgentPerformance,
    needsLeads,
    needsNegotiations,
    needsProperties,
    needsPropertyPerformance,
    needsUsers,
    reloadKey,
    token,
  ])

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
