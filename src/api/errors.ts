export function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Algo saiu do esperado. Tente novamente.'
}
