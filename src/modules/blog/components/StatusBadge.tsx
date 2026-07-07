import { BLOG_STATUS_LABELS } from '../constants'
import type { BlogStatus } from '../types'

interface StatusBadgeProps {
  status: BlogStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <span className={`blog-status-badge blog-status-badge--${status}`}>{BLOG_STATUS_LABELS[status]}</span>
}
