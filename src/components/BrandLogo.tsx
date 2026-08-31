import { Link } from 'react-router-dom'

interface BrandLogoProps {
  className?: string
  compact?: boolean
  to?: string
  variant?: 'full' | 'symbol'
}

export function BrandLogo({
  className = '',
  compact = false,
  to,
  variant = 'full',
}: BrandLogoProps) {
  const classes = [
    'brand-logo',
    compact ? 'brand-logo--compact' : '',
    variant === 'symbol' ? 'brand-logo--symbol' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      <img
        aria-hidden="true"
        className="brand-logo__icon"
        src="/assets/icon-larmap.png"
        alt=""
      />
      {variant === 'full' ? (
        <span className="brand-logo__name">
          <span className="brand-logo__name-lar">Lar</span>
          <span className="brand-logo__name-map">Map</span>
        </span>
      ) : null}
    </>
  )

  if (to) {
    return (
      <Link aria-label="LarMap" className={classes} to={to}>
        {content}
      </Link>
    )
  }

  return (
    <div aria-label="LarMap" className={classes}>
      {content}
    </div>
  )
}
