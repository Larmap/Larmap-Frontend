import { Link, useParams } from 'react-router-dom'
import { PublicFooter } from '../../../components/PublicFooter'
import { PublicNavbar } from '../../../components/PublicNavbar'
import { PostFooter } from '../components/PostFooter'
import { PostHeader } from '../components/PostHeader'
import { RelatedPosts } from '../components/RelatedPosts'
import { useBlogPost } from '../hooks/useBlogPost'
import { useBlogPosts } from '../hooks/useBlogPosts'
import { getRelatedBlogPosts } from '../utils'

export function BlogPostPage() {
  const { slug } = useParams()
  const { error, loading, post } = useBlogPost(slug)
  const relatedPostsQuery = useBlogPosts({ excludeSlug: slug, status: 'published' })
  const relatedPosts = post ? getRelatedBlogPosts(relatedPostsQuery.posts, post, 3) : []

  return (
    <main className="blog-page blog-page--post">
      <PublicNavbar />

      {loading ? (
        <section className="blog-post-state">
          <p className="blog-loading">Carregando postagem...</p>
        </section>
      ) : null}

      {!loading && (error || !post) ? (
        <section className="blog-post-state">
          <span className="eyebrow">Blog LarMap</span>
          <h1>Postagem não encontrada</h1>
          <p>{error || 'O conteúdo que você tentou acessar não está disponível.'}</p>
          <Link className="primary-button" to="/blog">
            Voltar ao Blog
          </Link>
        </section>
      ) : null}

      {post ? (
        <>
          <PostHeader post={post} />
          <article className="blog-post-body" dangerouslySetInnerHTML={{ __html: post.content }} />
          <div className="blog-post-shell">
            <PostFooter post={post} />
            <RelatedPosts posts={relatedPosts} />
          </div>
        </>
      ) : null}

      <PublicFooter />
    </main>
  )
}
