import { Link } from 'react-router-dom'

interface BrandLogoProps {
  className?: string
  compact?: boolean
  to?: string
}

export function BrandLogo({ className = '', compact = false, to }: BrandLogoProps) {
  const classes = ['brand-logo', compact ? 'brand-logo--compact' : '', className]
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
      <span className="brand-logo__name">
        <span className="brand-logo__name-lar">Lar</span>
        <span className="brand-logo__name-map">Map</span>
      </span>
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
