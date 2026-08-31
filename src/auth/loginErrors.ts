const LOGIN_ERROR_MESSAGES = {
  credentials: 'E-mail ou senha incorretos.',
  disabled: 'Esta conta está desativada.',
  forbidden: 'Você não tem permissão para acessar esta área.',
  invalidRequest: 'Não foi possível entrar. Verifique os dados informados e tente novamente.',
  network: 'Não foi possível conectar ao LarMap. Verifique sua conexão e tente novamente.',
  rateLimited: 'Muitas tentativas de login. Aguarde alguns instantes e tente novamente.',
  server: 'Não foi possível realizar o login agora. Tente novamente em alguns instantes.',
  timeout: 'A conexão com o LarMap demorou mais que o esperado. Tente novamente.',
  unexpected: 'Não foi possível entrar. Tente novamente.',
} as const

const CREDENTIAL_CODES = new Set([
  'AUTH_INVALID_CREDENTIALS',
  'INVALID_CREDENTIALS',
  'INVALID_LOGIN',
  'USER_NOT_FOUND',
])

const DISABLED_ACCOUNT_CODES = new Set([
  'ACCOUNT_DEACTIVATED',
  'ACCOUNT_DISABLED',
  'ACCOUNT_INACTIVE',
  'INACTIVE_ACCOUNT',
  'USER_DISABLED',
  'USER_INACTIVE',
])

const FORBIDDEN_CODES = new Set([
  'ACCESS_DENIED',
  'ACCESS_ROLE_REQUIRED',
  'AUTHORIZATION_REQUIRED',
  'FORBIDDEN',
  'PERMISSION_DENIED',
  'PERMISSION_REQUIRED',
  'UNAUTHORIZED',
])

const NETWORK_CODES = new Set([
  'CONNECTION_ERROR',
  'ECONNREFUSED',
  'ENETUNREACH',
  'ERR_NETWORK',
  'NETWORK_ERR',
  'NETWORK_ERROR',
  'OFFLINE',
])

const TIMEOUT_CODES = new Set([
  'ECONNABORTED',
  'ERR_TIMEOUT',
  'ETIMEDOUT',
  'REQUEST_TIMEOUT',
  'TIMEOUT',
])

const CREDENTIAL_MESSAGES = new Set([
  'email or password incorrect',
  'incorrect email or password',
  'invalid credentials',
  'invalid email or password',
  'user not found',
])

const DISABLED_ACCOUNT_MESSAGES = new Set([
  'account disabled',
  'account inactive',
  'account is disabled',
  'account is inactive',
  'user disabled',
  'user inactive',
])

const FORBIDDEN_MESSAGES = new Set([
  'access denied',
  'forbidden',
  'insufficient permissions',
  'not authorized',
  'unauthorized',
  'you are not authorized',
])

const NETWORK_MESSAGES = new Set([
  'failed to fetch',
  'load failed',
  'network error',
  'network request failed',
  'networkerror when attempting to fetch resource',
])

type UnknownRecord = Record<string, unknown>

function asRecord(value: unknown): UnknownRecord | null {
  return typeof value === 'object' && value !== null ? value as UnknownRecord : null
}

function firstString(...values: unknown[]) {
  return values.find((value): value is string => typeof value === 'string' && Boolean(value.trim())) ?? ''
}

function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/[\s-]+/g, '_')
}

function normalizeMessage(value: string) {
  return value
    .trim()
    .toLocaleLowerCase('en-US')
    .replace(/[.!]+$/g, '')
}

function readStatus(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value

    if (typeof value === 'string' && /^\d{3}$/.test(value.trim())) {
      return Number(value)
    }
  }

  return null
}

function getErrorDetails(error: unknown) {
  const root = asRecord(error)
  const response = asRecord(root?.response)
  const responseData = asRecord(response?.data)
  const responseError = asRecord(responseData?.error)

  return {
    code: normalizeCode(firstString(root?.code, responseError?.code, responseData?.code)),
    message: normalizeMessage(firstString(root?.message, responseError?.message, responseData?.message)),
    name: normalizeCode(firstString(root?.name)),
    status: readStatus(root?.status, root?.statusCode, response?.status),
  }
}

/**
 * Traduz somente categorias conhecidas de falha de autenticação. Nenhum texto
 * recebido da API, do navegador ou de uma exceção é devolvido ao usuário.
 */
export function getLoginErrorMessage(error: unknown): string {
  const { code, message, name, status } = getErrorDetails(error)

  if (
    TIMEOUT_CODES.has(code) ||
    name === 'ABORTERROR' ||
    name === 'TIMEOUTERROR' ||
    message.includes('timed out') ||
    message.includes('timeout') ||
    status === 408 ||
    status === 504
  ) {
    return LOGIN_ERROR_MESSAGES.timeout
  }

  if (
    NETWORK_CODES.has(code) ||
    name === 'NETWORKERROR' ||
    NETWORK_MESSAGES.has(message) ||
    status === 0
  ) {
    return LOGIN_ERROR_MESSAGES.network
  }

  if (DISABLED_ACCOUNT_CODES.has(code) || DISABLED_ACCOUNT_MESSAGES.has(message)) {
    return LOGIN_ERROR_MESSAGES.disabled
  }

  // "User not found" e credencial inválida compartilham a mesma resposta para
  // não confirmar se um determinado e-mail está cadastrado.
  if (CREDENTIAL_CODES.has(code) || CREDENTIAL_MESSAGES.has(message)) {
    return LOGIN_ERROR_MESSAGES.credentials
  }

  if (FORBIDDEN_CODES.has(code) || FORBIDDEN_MESSAGES.has(message) || status === 403) {
    return LOGIN_ERROR_MESSAGES.forbidden
  }

  if (status === 400 || status === 422) {
    return LOGIN_ERROR_MESSAGES.invalidRequest
  }

  if (status === 401) {
    return LOGIN_ERROR_MESSAGES.credentials
  }

  if (status === 429) {
    return LOGIN_ERROR_MESSAGES.rateLimited
  }

  if (status === 404 || status === 405 || (status !== null && status >= 500)) {
    return LOGIN_ERROR_MESSAGES.server
  }

  return LOGIN_ERROR_MESSAGES.unexpected
}
