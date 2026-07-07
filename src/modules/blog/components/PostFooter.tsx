import type { BlogPost } from '../types'

interface PostFooterProps {
  post: BlogPost
}

export function PostFooter({ post }: PostFooterProps) {
  return (
    <footer className="blog-post-footer">
      <div className="blog-post-tags" aria-label="Tags da postagem">
        {post.tags.map((tag) => (
          <span key={tag.id}>{tag.name}</span>
        ))}
      </div>

      <section className="blog-author-box" aria-label="Autor">
        <img alt={`Foto de ${post.author.name}`} src={post.author.avatarUrl} />
        <div className="blog-author-box__content">
          <strong className="blog-author-box__name">{post.author.name}</strong>
          <span className="blog-author-box__role">{post.author.role}</span>
          <p className="blog-author-box__bio">{post.author.bio}</p>
        </div>
      </section>
    </footer>
  )
}
