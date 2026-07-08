import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BrandLogo } from './BrandLogo'

interface FooterLink {
  href?: string
  label: string
  to?: string
}

interface FooterSection {
  id: string
  links: FooterLink[]
  title: string
}

const footerSections: FooterSection[] = [
  {
    id: 'about',
    title: 'Sobre Nós',
    links: [
      { label: 'Conheça a LarMap', to: '/sobre' },
      { label: 'Política de Privacidade', to: '/politica-de-privacidade' },
      { label: 'Política de Cookies', to: '/politica-de-cookies' },
      { label: 'Termos de Uso', to: '/termos-de-uso' },
    ],
  },
  {
    id: 'products',
    title: 'Produtos',
    links: [
      { label: 'Imóveis para Alugar', to: '/aluguel' },
      { label: 'Imóveis para Venda', to: '/compra' },
      { label: 'LarMap Blog', to: '/blog' },
    ],
  },
  {
    id: 'work',
    title: 'Trabalhe Conosco',
    links: [
      { label: 'Sou imobiliária', to: '/seja-parceiro?tipo=imobiliaria' },
      { label: 'Sou corretor', to: '/seja-parceiro?tipo=corretor' },
      { label: 'Sou autônomo', to: '/seja-parceiro?tipo=autonomo' },
    ],
  },
  {
    id: 'contact',
    title: 'Contato',
    links: [
      { label: 'contatolarmap@gmail.com', href: 'mailto:contatolarmap@gmail.com' },
    ],
  },
]

function InstagramIcon() {
  return (
    <svg aria-hidden="true" focusable="false" height="18" viewBox="0 0 24 24" width="18">
      <rect fill="none" height="17" rx="5" stroke="currentColor" strokeWidth="2" width="17" x="3.5" y="3.5" />
      <circle cx="12" cy="12" fill="none" r="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.25" cy="6.75" fill="currentColor" r="1.25" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg aria-hidden="true" focusable="false" height="18" viewBox="0 0 24 24" width="18">
      <path
        d="M14 8.3h2.2V4.6c-.4-.1-1.7-.2-3.2-.2-3.2 0-5.3 1.9-5.3 5.5v3H4.2V17h3.5v6h4.2v-6h3.5l.6-4.1h-4.1v-2.6c0-1.2.3-2 2.1-2Z"
        fill="currentColor"
      />
    </svg>
  )
}

export function PublicFooter() {
  const [openFooterSection, setOpenFooterSection] = useState<string | null>(null)

  function toggleFooterSection(sectionId: string) {
    setOpenFooterSection((current) => (current === sectionId ? null : sectionId))
  }

  return (
    <footer className="home-footer">
      <div className="home-footer__content">
        <div className="home-footer__links" aria-label="Links do rodapé">
          {footerSections.map((section) => {
            const isOpen = openFooterSection === section.id

            return (
              <section
                className={isOpen ? 'home-footer__section home-footer__section--open' : 'home-footer__section'}
                key={section.id}
              >
                <h2 className="home-footer__section-heading">{section.title}</h2>
                <button
                  aria-controls={`home-footer-${section.id}`}
                  aria-expanded={isOpen}
                  className="home-footer__section-trigger"
                  onClick={() => toggleFooterSection(section.id)}
                  type="button"
                >
                  <span>{section.title}</span>
                  <ChevronDown aria-hidden="true" className="home-footer__section-icon" size={16} />
                </button>

                <div className="home-footer__section-body" id={`home-footer-${section.id}`}>
                  {section.links.map((link) => (
                    link.to ? (
                      <Link className="home-footer__link" key={link.label} to={link.to}>
                        {link.label}
                      </Link>
                    ) : (
                      <a className="home-footer__link" href={link.href} key={link.label} rel="noreferrer">
                        {link.label}
                      </a>
                    )
                  ))}

                  {section.id === 'contact' ? (
                    <div className="home-footer__social" aria-label="Redes sociais">
                      <span className="home-footer__social-title">Siga a LarMap em nossas redes</span>
                      <div className="home-footer__social-links">
                        <a
                          aria-label="Instagram da LarMap"
                          href="https://www.instagram.com/larmap_oficial/"
                          rel="noreferrer"
                          target="_blank"
                        >
                          <InstagramIcon />
                        </a>
                        <a
                          aria-label="Facebook da LarMap"
                          href="https://www.facebook.com/Larmapofc"
                          rel="noreferrer"
                          target="_blank"
                        >
                          <FacebookIcon />
                        </a>
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>
            )
          })}
        </div>

        <div className="home-footer__inner">
          <BrandLogo />
          <span>© {new Date().getFullYear()} LarMap. Todos os direitos reservados.</span>
        </div>
      </div>
    </footer>
  )
}
