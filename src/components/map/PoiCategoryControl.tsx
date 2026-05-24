import { Loader2, RefreshCw } from 'lucide-react'
import { allPoiCategories, poiCategoryLabels } from '../../constants/pois'
import type { PoiCategory } from '../../types/pois'

interface PoiCategoryControlProps {
  categories: PoiCategory[]
  onCategoriesChange: (categories: PoiCategory[]) => void
  loading?: boolean
  error?: string
  empty?: boolean
  disabled?: boolean
  compact?: boolean
  className?: string
  onRefresh?: () => void
}

export function PoiCategoryControl({
  categories,
  className = '',
  compact = false,
  disabled = false,
  empty = false,
  error = '',
  loading = false,
  onCategoriesChange,
  onRefresh,
}: PoiCategoryControlProps) {
  function toggleCategory(category: PoiCategory) {
    if (disabled) return

    onCategoriesChange(
      categories.includes(category)
        ? categories.filter((item) => item !== category)
        : [...categories, category],
    )
  }

  const classes = [
    'poi-category-control',
    compact ? 'poi-category-control--compact' : '',
    disabled ? 'poi-category-control--disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes}>
      <div className="poi-category-control__header">
        <strong>Pontos proximos</strong>
        <div className="poi-category-control__status">
          {loading ? <Loader2 className="spin" size={14} /> : null}
          {onRefresh ? (
            <button
              aria-label="Atualizar pontos de interesse"
              disabled={disabled || loading}
              onClick={onRefresh}
              type="button"
            >
              <RefreshCw size={13} />
            </button>
          ) : null}
        </div>
      </div>

      <div className="poi-category-control__chips">
        {allPoiCategories.map((category) => (
          <button
            aria-pressed={categories.includes(category)}
            className={
              categories.includes(category)
                ? `poi-category-chip poi-category-chip--active poi-category-chip--${category}`
                : `poi-category-chip poi-category-chip--${category}`
            }
            disabled={disabled}
            key={category}
            onClick={() => toggleCategory(category)}
            type="button"
          >
            <span />
            {poiCategoryLabels[category]}
          </button>
        ))}
      </div>

      {error ? <small className="poi-category-control__message">{error}</small> : null}
      {!error && empty ? (
        <small className="poi-category-control__message">Nenhum ponto encontrado nesta area.</small>
      ) : null}
      {disabled ? (
        <small className="poi-category-control__message">Ative locais visiveis para exibir os pontos.</small>
      ) : null}
    </div>
  )
}
