import type { CreateLeadInput, Lead } from '../types/api'

const LOCAL_LEADS_KEY = 'smartmap.localLeads'
const MAX_LOCAL_LEADS = 120

function safeRead(): Lead[] {
  try {
    const raw = localStorage.getItem(LOCAL_LEADS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Lead[]
  } catch {
    return []
  }
}

function safeWrite(leads: Lead[]) {
  localStorage.setItem(LOCAL_LEADS_KEY, JSON.stringify(leads.slice(0, MAX_LOCAL_LEADS)))
}

export function readLocalLeads() {
  return safeRead()
}

export function mergeLeadLists(remoteLeads: Lead[], localLeads: Lead[]) {
  const byId = new Map<string, Lead>()

  remoteLeads.forEach((lead) => byId.set(lead.id, lead))
  localLeads.forEach((lead) => byId.set(lead.id, lead))

  return Array.from(byId.values()).sort(
    (first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
  )
}

export function buildLocalLead(input: CreateLeadInput, lead?: Partial<Lead>): Lead {
  const now = new Date().toISOString()

  return {
    agentId: input.agentId ?? lead?.agentId ?? null,
    agentName: input.agentName ?? lead?.agentName ?? null,
    createdAt: lead?.createdAt ?? now,
    email: input.email,
    id: lead?.id ?? `local-lead-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    interestedName: input.interestedName,
    phone: input.phone || input.whatsapp,
    propertyId: input.propertyId,
    propertyTitle: input.propertyTitle ?? lead?.propertyTitle,
    source: input.source,
    status: lead?.status ?? 'NEW',
    updatedAt: lead?.updatedAt ?? now,
    viewed: lead?.viewed ?? false,
    whatsapp: input.whatsapp,
  }
}

export function upsertLocalLead(lead: Lead) {
  const nextLeads = [lead, ...safeRead().filter((item) => item.id !== lead.id)]
  safeWrite(nextLeads)
  return nextLeads
}

export function updateLocalLead(leadId: string, input: Partial<Lead>) {
  const nextLeads = safeRead().map((lead) =>
    lead.id === leadId
      ? {
          ...lead,
          ...input,
          updatedAt: new Date().toISOString(),
        }
      : lead,
  )

  safeWrite(nextLeads)
  return nextLeads
}

export function updateLocalLeads(leadIds: Set<string>, input: Partial<Lead>) {
  const nextLeads = safeRead().map((lead) =>
    leadIds.has(lead.id)
      ? {
          ...lead,
          ...input,
          updatedAt: new Date().toISOString(),
        }
      : lead,
  )

  safeWrite(nextLeads)
  return nextLeads
}
