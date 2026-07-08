import { blogService } from '../../modules/blog/services/blog.service'
import { buildAbsoluteUrl, SITEMAP_FILES } from './config'
import type { SitemapFile } from './types'

function getPostLastmod(updatedAt?: string, publishedAt?: string, createdAt?: string) {
  return updatedAt ?? publishedAt ?? createdAt ?? new Date().toISOString()
}

export async function createBlogSitemap(): Promise<SitemapFile> {
  try {
    const posts = await blogService.getPosts({ status: 'published' })

    return {
      filename: SITEMAP_FILES.blog,
      entries: posts.map((post) => ({
        changefreq: 'weekly',
        lastmod: getPostLastmod(post.updatedAt, post.publishedAt, post.createdAt),
        loc: buildAbsoluteUrl(`/blog/${post.slug}`),
        priority: 0.7,
      })),
    }
  } catch (error) {
    console.warn(
      `[sitemap] Aviso: não foi possível carregar posts públicos para ${SITEMAP_FILES.blog}. Gerando sitemap vazio. Detalhe: ${
        error instanceof Error ? error.message : String(error)
      }`,
    )

    return {
      filename: SITEMAP_FILES.blog,
      entries: [],
    }
  }
}
