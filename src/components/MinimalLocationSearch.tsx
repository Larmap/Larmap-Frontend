import { Loader2, Search } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'

interface MinimalLocationSearchProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  buttonLabel?: string
  className?: string
  inputId: string
  loading?: boolean
  placeholder?: string
}

export function MinimalLocationSearch({
  buttonLabel = 'Buscar',
  className = '',
  inputId,
  loading = false,
  onChange,
  onSubmit,
  placeholder = 'Cidade, bairro ou endereço',
  value,
}: MinimalLocationSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isExpanded) return

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus()
    }, 180)

    function handlePointerDown(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof Node)) return
      if (!formRef.current?.contains(target)) setIsExpanded(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setIsExpanded(false)
      inputRef.current?.blur()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isExpanded])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    onSubmit(event)
    setIsExpanded(false)
    inputRef.current?.blur()
  }

  const classes = [
    'home-search',
    isExpanded ? 'home-search--expanded' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <form className={classes} onSubmit={handleSubmit} ref={formRef}>
      <div className="home-search__bar">
        <button
          aria-label={isExpanded ? 'Pesquisar localização' : 'Abrir pesquisa'}
          className="home-search__toggle"
          onClick={() => setIsExpanded(true)}
          type="button"
        >
          <Search size={18} />
        </button>
        <input
          id={inputId}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          ref={inputRef}
          tabIndex={isExpanded ? 0 : -1}
          value={value}
        />
        <button className="home-search__btn" disabled={loading} tabIndex={isExpanded ? 0 : -1} type="submit">
          {loading ? <Loader2 className="spin" size={16} /> : <Search size={16} />}
          {buttonLabel}
        </button>
      </div>
    </form>
  )
}
