import { ArrowRight } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import type { BlogPost } from '../types'
import { formatBlogDate, getPostDisplayDate } from '../utils'
import { ReadingTime } from './ReadingTime'

interface BlogCardProps {
  post: BlogPost
}

export function BlogCard({ post }: BlogCardProps) {
  const style = { '--blog-category-color': post.category.color } as CSSProperties

  return (
    <article className="blog-card" style={style}>
      <Link className="blog-card__media" to={`/blog/${post.slug}`}>
        <img alt={post.coverImage.alt ?? post.title} src={post.coverImage.url} />
      </Link>

      <div className="blog-card__body">
        <span className="blog-card__category">{post.category.name}</span>

        <h2>
          <Link to={`/blog/${post.slug}`}>{post.title}</Link>
        </h2>
        <p>{post.summary}</p>

        <div className="blog-card__meta">
          <span>{formatBlogDate(getPostDisplayDate(post))}</span>
          <ReadingTime minutes={post.readingTimeMinutes} />
        </div>

        <Link className="blog-card__link" to={`/blog/${post.slug}`}>
          <span>Ler mais</span>
          <ArrowRight size={16} />
        </Link>
      </div>
    </article>
  )
}
