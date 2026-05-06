export interface BrazilPostalCodeResult {
  postalCode: string
  street: string
  neighborhood: string
  city: string
  state: string
}

interface ViaCepResponse {
  cep?: string
  logradouro?: string
  bairro?: string
  localidade?: string
  uf?: string
  erro?: boolean
}

export function onlyDigits(value: string) {
  return value.replace(/\D/g, '')
}

export function formatBrazilPostalCode(value: string) {
  const digits = onlyDigits(value).slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

export async function lookupBrazilPostalCode(
  postalCode: string,
  signal?: AbortSignal,
): Promise<BrazilPostalCodeResult | null> {
  const digits = onlyDigits(postalCode)
  if (digits.length !== 8) return null

  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
    headers: {
      Accept: 'application/json',
    },
    signal,
  })

  if (!response.ok) {
    throw new Error('Nao foi possivel validar o CEP agora.')
  }

  const payload = (await response.json()) as ViaCepResponse
  if (payload.erro) return null

  return {
    postalCode: payload.cep ?? formatBrazilPostalCode(digits),
    street: payload.logradouro ?? '',
    neighborhood: payload.bairro ?? '',
    city: payload.localidade ?? '',
    state: payload.uf ?? '',
  }
}
