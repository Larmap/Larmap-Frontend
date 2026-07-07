import { SearchBar } from './SearchBar'

interface HeroSectionProps {
  onSearch: () => void
  onSearchChange: (value: string) => void
  searchValue: string
}

export function HeroSection({ onSearch, onSearchChange, searchValue }: HeroSectionProps) {
  return (
    <section className="blog-hero">
      <div className="blog-hero__inner">
        <div className="blog-hero__copy">
          <span className="eyebrow">Conteúdo LarMap</span>
          <h1>Blog LarMap</h1>
          <p>Conteúdos sobre mercado imobiliário, financiamento, compra, aluguel, investimentos e novidades.</p>
        </div>
        <SearchBar onChange={onSearchChange} onSearch={onSearch} value={searchValue} />
      </div>
    </section>
  )
}
