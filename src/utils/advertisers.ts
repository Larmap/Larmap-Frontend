import type { Property } from '../types/api'
import { createSlug, getContactName, getFirstString } from './properties'

export function getAdvertiserSlug(property: Property) {
  const backendSlug = getFirstString(property, [
    'professionalSlug',
    'publicProfileSlug',
    'advertiserSlug',
    'agentSlug',
    'brokerSlug',
    'realtorSlug',
  ])

  if (backendSlug) return createSlug(backendSlug)

  return createSlug(getContactName(property))
}
