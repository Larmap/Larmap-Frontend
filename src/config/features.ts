/**
 * Feature flags for staged releases.
 *
 * Use `VITE_FEATURE_<FLAG>=true|false` in the deployment environment. The
 * unprefixed `VITE_<FLAG>` aliases are accepted only to make a later cutover
 * less error-prone. Components must consume this module instead of reading
 * `import.meta.env` directly.
 */
export type FeatureFlagName =
  | 'PUBLIC_REGISTRATION'
  | 'BLOG_ADMIN'
  | 'SERVER_SAVED_ITEMS'
  | 'PROFESSIONAL_SELF_PROFILE'
  | 'PUBLIC_COMPANY_PROFILE'
  | 'BLOG_LEGACY_MOCKS'

type FeatureFlagDefaults = Record<FeatureFlagName, boolean>

const productionDefaults: FeatureFlagDefaults = {
  PUBLIC_REGISTRATION: false,
  BLOG_ADMIN: false,
  SERVER_SAVED_ITEMS: false,
  PROFESSIONAL_SELF_PROFILE: false,
  PUBLIC_COMPANY_PROFILE: false,
  BLOG_LEGACY_MOCKS: true,
}

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback
  return value.trim().toLowerCase() === 'true'
}

function getFeatureFlag(name: FeatureFlagName) {
  // The sitemap generator imports this module from Vite's Node config, where
  // `import.meta.env` is not injected. Browser builds still receive Vite env.
  const env = (import.meta.env ?? {}) as Record<string, string | undefined>
  return parseBoolean(
    env[`VITE_FEATURE_${name}`] ?? env[`VITE_${name}`],
    productionDefaults[name],
  )
}

export const featureFlags = Object.freeze(
  Object.fromEntries(
    (Object.keys(productionDefaults) as FeatureFlagName[]).map((name) => [name, getFeatureFlag(name)]),
  ) as FeatureFlagDefaults,
)

export const isFeatureEnabled = (name: FeatureFlagName) => featureFlags[name]
