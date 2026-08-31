export const config = {
  schedule: '*/10 * * * *',
}

const REQUEST_TIMEOUT_MS = 8_000

export default async function keepLarMapBackendAlive() {
  const healthUrl = process.env.LARMAP_KEEP_ALIVE_URL

  if (!healthUrl) {
    console.warn('[larmap-keep-alive] LARMAP_KEEP_ALIVE_URL is not configured.')
    return new Response(null, { status: 204 })
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(healthUrl, {
      headers: { Accept: 'application/json' },
      method: 'GET',
      signal: controller.signal,
    })

    console.info(`[larmap-keep-alive] health status=${response.status}`)
    return new Response(null, { status: 204 })
  } catch (error) {
    // A transient backend outage must not turn the scheduled invocation into a
    // deployment or scheduler failure. Do not log the configured URL.
    const reason = error instanceof Error ? error.name : 'UnknownError'
    console.warn(`[larmap-keep-alive] health request failed (${reason}).`)
    return new Response(null, { status: 204 })
  } finally {
    clearTimeout(timeoutId)
  }
}
