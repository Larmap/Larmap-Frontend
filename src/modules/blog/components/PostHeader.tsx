import type { CSSProperties } from 'react'
import type { BlogPost } from '../types'
import { formatBlogDate, getPostDisplayDate } from '../utils'
import { ReadingTime } from './ReadingTime'

interface PostHeaderProps {
  post: BlogPost
}

export function PostHeader({ post }: PostHeaderProps) {
  const style = { '--blog-category-color': post.category.color } as CSSProperties

  return (
    <header className="blog-post-header" style={style}>
      <div className="blog-post-header__media">
        <img alt={post.coverImage.alt ?? post.title} src={post.coverImage.url} />
      </div>

      <div className="blog-post-header__content">
        <span className="blog-post-header__category">{post.category.name}</span>
        <h1>{post.title}</h1>
        <p>{post.summary}</p>

        <div className="blog-post-header__meta">
          <img alt={`Foto de ${post.author.name}`} src={post.author.avatarUrl} />
          <span>{post.author.name}</span>
          <span>{formatBlogDate(getPostDisplayDate(post))}</span>
          <ReadingTime minutes={post.readingTimeMinutes} />
        </div>
      </div>
    </header>
  )
}
