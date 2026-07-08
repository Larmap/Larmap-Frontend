import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  buildAbsoluteUrl,
  ROBOTS_FILE,
  SITEMAP_FILES,
  SITEMAP_INDEX_FILE,
  SITE_URL,
} from './config'
import { createBlogSitemap } from './blog'
import { createPagesSitemap } from './pages'
import { createPropertiesSitemap } from './properties'
import type { SitemapEntry, SitemapFile } from './types'

interface GenerateSitemapsOptions {
  outDir: string
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function formatPriority(priority: number) {
  return priority.toFixed(1)
}

function renderUrl(entry: SitemapEntry) {
  return [
    '  <url>',
    `    <loc>${escapeXml(entry.loc)}</loc>`,
    `    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`,
    `    <changefreq>${entry.changefreq}</changefreq>`,
    `    <priority>${formatPriority(entry.priority)}</priority>`,
    '  </url>',
  ].join('\n')
}

function renderSitemap(entries: SitemapEntry[]) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(renderUrl),
    '</urlset>',
    '',
  ].join('\n')
}

function renderSitemapIndex(files: SitemapFile[], now: Date) {
  const lastmod = now.toISOString()

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...files.map((file) =>
      [
        '  <sitemap>',
        `    <loc>${escapeXml(buildAbsoluteUrl(`/${file.filename}`))}</loc>`,
        `    <lastmod>${escapeXml(lastmod)}</lastmod>`,
        '  </sitemap>',
      ].join('\n'),
    ),
    '</sitemapindex>',
    '',
  ].join('\n')
}

function renderRobotsTxt() {
  return [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${SITE_URL}/${SITEMAP_INDEX_FILE}`,
    '',
  ].join('\n')
}

export async function generateSitemaps({ outDir }: GenerateSitemapsOptions) {
  const now = new Date()
  const files = [
    createPagesSitemap(now),
    await createBlogSitemap(),
    await createPropertiesSitemap(),
  ]

  await mkdir(outDir, { recursive: true })
  await Promise.all([
    ...files.map((file) => writeFile(path.join(outDir, file.filename), renderSitemap(file.entries), 'utf8')),
    writeFile(path.join(outDir, SITEMAP_INDEX_FILE), renderSitemapIndex(files, now), 'utf8'),
    writeFile(path.join(outDir, ROBOTS_FILE), renderRobotsTxt(), 'utf8'),
  ])

  console.info(
    `[sitemap] Gerados ${SITEMAP_INDEX_FILE}, ${Object.values(SITEMAP_FILES).join(', ')} e ${ROBOTS_FILE}.`,
  )
}
