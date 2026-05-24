import type { ReactNode } from 'react'

interface PublicMapFrameProps {
  children: ReactNode
  className?: string
  ariaLabel?: string
  element?: 'div' | 'section'
}

export function PublicMapFrame({
  ariaLabel,
  children,
  className = '',
  element = 'section',
}: PublicMapFrameProps) {
  const classes = ['public-map-surface', className].filter(Boolean).join(' ')

  if (element === 'div') {
    return <div className={classes}>{children}</div>
  }

  return (
    <section aria-label={ariaLabel} className={classes}>
      {children}
    </section>
  )
}
