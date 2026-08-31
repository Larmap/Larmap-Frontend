import { ApiError } from './client'

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 400 || error.status === 422) {
      return 'Confira os dados informados e tente novamente.'
    }

    if (error.status === 401) {
      return 'Sua sessão expirou. Entre novamente para continuar.'
    }

    if (error.status === 403) {
      return 'Você não tem permissão para realizar esta ação.'
    }

    if (error.status === 408 || error.status === 504) {
      return 'A conexão demorou mais que o esperado. Tente novamente.'
    }

    if (error.status >= 500) {
      return 'O LarMap está temporariamente indisponível. Tente novamente em alguns instantes.'
    }

    return 'Não foi possível concluir a ação. Tente novamente.'
  }

  if (
    error instanceof TypeError ||
    (error instanceof DOMException && ['AbortError', 'NetworkError', 'TimeoutError'].includes(error.name))
  ) {
    return 'Não foi possível conectar ao LarMap. Verifique sua conexão e tente novamente.'
  }

  // Erros comuns restantes são validações criadas pelo próprio frontend e já
  // possuem texto controlado em português.
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return 'Algo saiu do esperado. Tente novamente.'
}
