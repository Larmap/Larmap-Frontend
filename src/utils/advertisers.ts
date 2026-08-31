import type { Property } from '../types/api'
import { getFirstString } from './properties'

export function getAdvertiserSlug(property: Property) {
  return getFirstString(property, ['agentPublicSlug'])
}
