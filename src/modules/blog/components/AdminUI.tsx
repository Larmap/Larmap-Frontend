import { AlertCircle, Check, LoaderCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import type { BlogStatus } from '../types'

export const adminTokens = {
  adminBackground: '#f6f7f8',
  adminSurface: '#ffffff',
  adminBorder: '#e2e6e4',
  adminText: '#17231d',
  adminMutedText: '#66736c',
  brandGreen: '#1b713f',
  brandGreenHover: '#155c33',
  brandBlue: '#176b9b',
  focusRing: 'rgba(27, 113, 63, 0.22)',
  danger: '#b42318',
} as const

interface AdminPageHeaderProps {
  action?: ReactNode
  description: string
  meta?: string
  title: string
}

export function AdminPageHeader({ action, description, meta, title }: AdminPageHeaderProps) {
  return (
    <header className="admin-page-header">
      <div className="admin-page-header__copy">
        {meta ? <span className="admin-page-header__meta">{meta}</span> : null}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action ? <div className="admin-page-header__action">{action}</div> : null}
    </header>
  )
}

export function AdminSurface({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`admin-surface ${className}`.trim()}>{children}</section>
}

export function EmptyState({
  action,
  description,
  icon,
  title,
}: {
  action?: ReactNode
  description: string
  icon?: ReactNode
  title: string
}) {
  return (
    <div className="admin-empty-state">
      {icon ? <span className="admin-empty-state__icon">{icon}</span> : null}
      <strong>{title}</strong>
      <p>{description}</p>
      {action}
    </div>
  )
}

export function StatusIndicator({ status }: { status: BlogStatus }) {
  const labels: Record<BlogStatus, string> = {
    draft: 'Rascunho',
    published: 'Publicado',
    scheduled: 'Agendado',
  }

  return (
    <span className={`admin-status admin-status--${status}`}>
      <span aria-hidden="true" className="admin-status__dot" />
      {labels[status]}
    </span>
  )
}

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function SaveStatus({ state }: { state: SaveState }) {
  const content: Record<SaveState, { icon: ReactNode; label: string }> = {
    idle: { icon: null, label: '' },
    saving: { icon: <LoaderCircle className="admin-save-status__spin" size={14} />, label: 'Salvando...' },
    saved: { icon: <Check size={14} />, label: 'Alterações salvas' },
    error: { icon: <AlertCircle size={14} />, label: 'Não foi possível salvar' },
  }

  if (state === 'idle') return null

  return (
    <span aria-live="polite" className={`admin-save-status admin-save-status--${state}`}>
      {content[state].icon}
      {content[state].label}
    </span>
  )
}

export function ConfirmDialog({
  cancelLabel = 'Cancelar',
  confirmLabel,
  description,
  onCancel,
  onConfirm,
  open,
  title,
}: {
  cancelLabel?: string
  confirmLabel: string
  description: string
  onCancel: () => void
  onConfirm: () => void
  open: boolean
  title: string
}) {
  if (!open) return null

  return (
    <div className="admin-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <div aria-describedby="admin-confirm-description" aria-modal="true" className="admin-dialog" role="dialog">
        <h2>{title}</h2>
        <p id="admin-confirm-description">{description}</p>
        <div className="admin-dialog__actions">
          <button className="admin-button admin-button--secondary" onClick={onCancel} type="button">
            {cancelLabel}
          </button>
          <button className="admin-button admin-button--danger" onClick={onConfirm} type="button">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function AdminToast({ message, tone = 'success' }: { message: string; tone?: 'success' | 'error' }) {
  if (!message) return null
  return (
    <div aria-live="polite" className={`admin-toast admin-toast--${tone}`} role="status">
      {tone === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
      <span>{message}</span>
    </div>
  )
}
