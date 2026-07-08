export type SitemapChangeFrequency =
  | 'always'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'never'

export interface SitemapEntry {
  changefreq: SitemapChangeFrequency
  lastmod: string
  loc: string
  priority: number
}

export interface SitemapFile {
  entries: SitemapEntry[]
  filename: string
}
