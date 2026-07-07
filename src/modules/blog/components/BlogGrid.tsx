import type { BlogPost } from '../types'
import { BlogCard } from './BlogCard'

interface BlogGridProps {
  emptyMessage?: string
  posts: BlogPost[]
}

export function BlogGrid({ emptyMessage = 'Nenhuma postagem encontrada.', posts }: BlogGridProps) {
  if (!posts.length) {
    return (
      <div className="blog-empty">
        <strong>Nada por aqui ainda</strong>
        <p>{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="blog-grid">
      {posts.map((post) => (
        <BlogCard key={post.id} post={post} />
      ))}
    </div>
  )
}
