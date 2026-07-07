import { Search } from 'lucide-react'
import type { FormEvent } from 'react'

interface SearchBarProps {
  onChange: (value: string) => void
  onSearch: () => void
  placeholder?: string
  value: string
}

export function SearchBar({ onChange, onSearch, placeholder = 'Pesquisar no blog', value }: SearchBarProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSearch()
  }

  return (
    <form className="blog-search" onSubmit={handleSubmit}>
      <div className="blog-search__bar">
        <Search size={18} />
        <input
          aria-label="Pesquisar conteúdos do Blog LarMap"
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          value={value}
        />
        <button className="blog-search__button" type="submit">
          <Search size={16} />
          <span>Pesquisar</span>
        </button>
      </div>
    </form>
  )
}
