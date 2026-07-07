import { ArrowRight } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import type { BlogPost } from '../types'
import { formatBlogDate, getPostDisplayDate } from '../utils'
import { ReadingTime } from './ReadingTime'

interface LarMapExplainSectionProps {
  posts: BlogPost[]
}

interface LarMapExplainCardProps {
  post: BlogPost
  variant: 'featured' | 'compact'
}

function LarMapExplainCard({ post, variant }: LarMapExplainCardProps) {
  const style = { '--blog-category-color': post.category.color } as CSSProperties

  return (
    <article className={`home-explain-card home-explain-card--${variant}`} style={style}>
      <Link className="home-explain-card__media" to={`/blog/${post.slug}`}>
        <img alt={post.coverImage.alt ?? post.title} src={post.coverImage.url} />
        <span className="home-explain-card__badge">Novo</span>
      </Link>

      <div className="home-explain-card__body">
        <span className="home-explain-card__category">{post.category.name}</span>
        <h3>
          <Link to={`/blog/${post.slug}`}>{post.title}</Link>
        </h3>
        <p>{post.summary}</p>

        <div className="home-explain-card__meta">
          <span>{formatBlogDate(getPostDisplayDate(post))}</span>
          <ReadingTime minutes={post.readingTimeMinutes} />
        </div>

        <Link className="home-explain-card__link" to={`/blog/${post.slug}`}>
          <span>Ler artigo</span>
          <ArrowRight size={16} />
        </Link>
      </div>
    </article>
  )
}

export function LarMapExplainSection({ posts }: LarMapExplainSectionProps) {
  if (!posts.length) return null

  const [featuredPost, ...sidePosts] = posts

  return (
    <section className="home-explain" aria-label="LarMap Explica">
      <div className="home-explain__inner">
        <div className="home-explain__intro">
          <div className="home-explain__copy">
            <h2> LarMap Explica</h2>
            <p>
              Entenda o mercado imobiliário com conteúdos preparados para ajudar você a comprar, vender e investir com
              mais segurança.
            </p>
          </div>

          <Link className="home-explain__button" to="/blog">
            <span>Explorar o Blog</span>
            <ArrowRight size={18} />
          </Link>
        </div>

        <div className="home-explain__grid">
          <LarMapExplainCard post={featuredPost} variant="featured" />

          {sidePosts.length ? (
            <div className="home-explain__side">
              {sidePosts.map((post) => (
                <LarMapExplainCard key={post.id} post={post} variant="compact" />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
