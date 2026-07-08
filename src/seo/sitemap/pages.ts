import { buildAbsoluteUrl, PUBLIC_PAGES, SITEMAP_FILES } from './config'
import type { SitemapFile } from './types'

export function createPagesSitemap(now = new Date()): SitemapFile {
  const lastmod = now.toISOString()

  return {
    filename: SITEMAP_FILES.pages,
    entries: PUBLIC_PAGES.map((page) => ({
      changefreq: page.changefreq,
      lastmod,
      loc: buildAbsoluteUrl(page.path),
      priority: page.priority,
    })),
  }
}
