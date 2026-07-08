import type { SitemapChangeFrequency } from './types'

export const SITE_URL = 'https://larmap.com.br'

export const SITEMAP_INDEX_FILE = 'sitemap.xml'
export const ROBOTS_FILE = 'robots.txt'

export const SITEMAP_FILES = {
  blog: 'sitemap-blog.xml',
  pages: 'sitemap-pages.xml',
  properties: 'sitemap-properties.xml',
  // Future sitemap modules should be registered here, for example:
  // cities: 'sitemap-cities.xml',
  // neighborhoods: 'sitemap-neighborhoods.xml',
} as const

export interface PublicPageConfig {
  changefreq: SitemapChangeFrequency
  description: string
  path: string
  priority: number
  title: string
}

export const PUBLIC_PAGES: PublicPageConfig[] = [
  {
    changefreq: 'daily',
    description: 'Encontre imóveis para compra e aluguel utilizando um mapa interativo.',
    path: '/',
    priority: 1,
    title: 'LarMap | Imóveis no mapa',
  },
  {
    changefreq: 'daily',
    description: 'Explore imóveis disponíveis para compra utilizando o mapa do LarMap.',
    path: '/compra',
    priority: 0.9,
    title: 'Imóveis à venda | LarMap',
  },
  {
    changefreq: 'daily',
    description: 'Encontre apartamentos, casas e outros imóveis para aluguel com visualização em mapa.',
    path: '/aluguel',
    priority: 0.9,
    title: 'Imóveis para alugar | LarMap',
  },
  {
    changefreq: 'daily',
    description: 'Confira os imóveis adicionados recentemente ao LarMap.',
    path: '/novidades',
    priority: 0.8,
    title: 'Novidades | LarMap',
  },
  {
    changefreq: 'daily',
    description: 'Visualize imóveis diretamente no mapa e encontre oportunidades próximas de você.',
    path: '/mapa',
    priority: 0.9,
    title: 'Mapa de imóveis | LarMap',
  },
  {
    changefreq: 'weekly',
    description: 'Notícias, dicas e conteúdos sobre mercado imobiliário, compra e aluguel de imóveis.',
    path: '/blog',
    priority: 0.8,
    title: 'Blog | LarMap',
  },
  {
    changefreq: 'monthly',
    description: 'Conheça o LarMap e nossa missão de transformar a busca por imóveis através da tecnologia.',
    path: '/sobre',
    priority: 0.6,
    title: 'Sobre o LarMap',
  },
  {
    changefreq: 'yearly',
    description: 'Conheça como tratamos seus dados pessoais e protegemos sua privacidade.',
    path: '/politica-de-privacidade',
    priority: 0.3,
    title: 'Política de Privacidade | LarMap',
  },
  {
    changefreq: 'yearly',
    description: 'Saiba como utilizamos cookies para melhorar sua experiência no LarMap.',
    path: '/politica-de-cookies',
    priority: 0.3,
    title: 'Política de Cookies | LarMap',
  },
  {
    changefreq: 'yearly',
    description: 'Leia os termos e condições de utilização da plataforma LarMap.',
    path: '/termos-de-uso',
    priority: 0.3,
    title: 'Termos de Uso | LarMap',
  },
  {
    changefreq: 'monthly',
    description: 'Cadastre sua imobiliária ou empresa e faça parte da plataforma LarMap.',
    path: '/seja-parceiro',
    priority: 0.6,
    title: 'Seja Parceiro | LarMap',
  },
]

export function buildAbsoluteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL}${normalizedPath === '/' ? '/' : normalizedPath}`
}

export function getPublicPageConfig(path: string) {
  return PUBLIC_PAGES.find((page) => page.path === path)
}
