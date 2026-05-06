import type { PropertyStatus, UserRole } from '../types/api'

const propertyLabels: Record<PropertyStatus, string> = {
  AVAILABLE: 'Disponível',
  NEGOTIATING: 'Em negociação',
  SOLD: 'Vendido/alugado',
}

const roleLabels: Record<string, string> = {
  agent: 'Agente',
  manager: 'Gerente',
  admin: 'Admin',
}

interface StatusBadgeProps {
  value: PropertyStatus | UserRole | string
  kind?: 'property' | 'role'
}

export function StatusBadge({ value, kind = 'property' }: StatusBadgeProps) {
  const label =
    kind === 'property'
      ? propertyLabels[value as PropertyStatus] ?? value
      : roleLabels[value] ?? value

  return (
    <span className={`status-badge status-badge--${String(value).toLowerCase()}`}>
      {label}
    </span>
  )
}
