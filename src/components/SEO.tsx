import { Helmet } from 'react-helmet-async'

const SITE_URL = 'https://larmap.com.br'
const SITE_NAME = 'LarMap'
const DEFAULT_TITLE = 'LarMap | Imóveis no mapa'
const DEFAULT_DESCRIPTION =
  'Encontre imóveis para compra e aluguel utilizando um mapa interativo. Explore apartamentos, casas, terrenos e lançamentos no LarMap.'
const DEFAULT_IMAGE = '/assets/Larmap-logo-casas.png'

interface SEOProps {
  canonical?: string
  description?: string
  image?: string
  title?: string
}

function toAbsoluteUrl(value: string) {
  if (/^https?:\/\//i.test(value)) return value
  return `${SITE_URL}${value.startsWith('/') ? value : `/${value}`}`
}

export function SEO({
  canonical = SITE_URL,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  title = DEFAULT_TITLE,
}: SEOProps) {
  const canonicalUrl = toAbsoluteUrl(canonical)
  const imageUrl = image ? toAbsoluteUrl(image) : ''

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={title} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      {imageUrl ? <meta property="og:image" content={imageUrl} /> : null}
      <meta name="twitter:card" content="summary_large_image" />
      <link rel="canonical" href={canonicalUrl} />
    </Helmet>
  )
}
