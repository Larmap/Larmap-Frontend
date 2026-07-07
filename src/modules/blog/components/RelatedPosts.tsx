import type { BlogPost } from '../types'
import { BlogGrid } from './BlogGrid'

interface RelatedPostsProps {
  posts: BlogPost[]
}

export function RelatedPosts({ posts }: RelatedPostsProps) {
  return (
    <section className="blog-related">
      <div className="blog-section-heading">
        <span className="eyebrow">Continue lendo</span>
        <h2>Posts relacionados</h2>
      </div>
      <BlogGrid emptyMessage="Sem posts relacionados no momento." posts={posts} />
    </section>
  )
}
