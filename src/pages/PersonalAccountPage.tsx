import { Bookmark, Building2, Home, Mail, ShieldCheck, Trash2, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { PublicFooter } from '../components/PublicFooter'
import { PublicNavbar } from '../components/PublicNavbar'
import { useAuth } from '../context/AuthContext'
import {
  getSavedArticles,
  removeSavedArticle,
  SAVED_ARTICLES_CHANGED_EVENT,
  type SavedArticleItem,
} from '../hooks/useSavedArticles'

export function PersonalAccountPage() {
  const { hash } = useLocation()
  const { adminHomePath, canAccessBlogAdmin, canAccessCompanyAdmin, company, user } = useAuth()
  const [savedArticles, setSavedArticles] = useState<SavedArticleItem[]>([])
  const isCommon = user?.accessRole === 'COMMON'
  const accountName = user?.name ?? company?.name ?? 'Conta LarMap'
  const accountEmail = user?.email ?? company?.email ?? ''
  const hasAdminAccess = canAccessCompanyAdmin() || canAccessBlogAdmin()

  useEffect(() => {
    if (!hash) return
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [hash])

  useEffect(() => {
    if (!user || !isCommon) {
      setSavedArticles([])
      return
    }
    const userId = user.id

    function syncSavedArticles() {
      setSavedArticles(getSavedArticles(userId))
    }

    syncSavedArticles()
    window.addEventListener(SAVED_ARTICLES_CHANGED_EVENT, syncSavedArticles)
    return () => window.removeEventListener(SAVED_ARTICLES_CHANGED_EVENT, syncSavedArticles)
  }, [isCommon, user])

  function handleRemoveArticle(articleId: string) {
    if (!user) return
    setSavedArticles(removeSavedArticle(user.id, articleId))
  }

  return (
    <main className="personal-account-page">
      <PublicNavbar />

      <section className="personal-account">
        <header className="personal-account__heading">
          <span className="eyebrow">Conta pessoal</span>
          <h1>Minha conta</h1>
          <p>Seus dados e conteúdos salvos no LarMap, sem recursos de administração empresarial.</p>
        </header>

        <div className="personal-account__grid">
          <section className="account-card account-card--identity" id="dados-pessoais">
            <div className="account-card__title">
              <span className="account-card__icon"><UserRound size={20} /></span>
              <div>
                <span>Dados pessoais</span>
                <h2>{accountName}</h2>
              </div>
            </div>
            <p className="account-identity__email"><Mail size={16} /> {accountEmail}</p>
            <p className="account-card__note">
              A edição de dados será habilitada quando o backend disponibilizar o contrato da conta individual.
            </p>
          </section>

          {isCommon ? (
            <section className="account-card" id="imoveis-salvos">
              <div className="account-card__title">
                <span className="account-card__icon account-card__icon--green"><Home size={20} /></span>
                <div>
                  <span>Sua seleção</span>
                  <h2>Imóveis salvos</h2>
                </div>
              </div>
              <p>Consulte os imóveis que você marcou durante sua busca.</p>
              <Link className="secondary-button account-card__action" to="/favoritos">
                Ver imóveis salvos
              </Link>
            </section>
          ) : null}

          {hasAdminAccess ? (
            <section className="account-card">
              <div className="account-card__title">
                <span className="account-card__icon account-card__icon--green"><Building2 size={20} /></span>
                <div>
                  <span>Acesso autorizado</span>
                  <h2>Área administrativa</h2>
                </div>
              </div>
              <p>Abra somente a área compatível com as permissões da sua conta.</p>
              <Link className="secondary-button account-card__action" to={adminHomePath}>
                Acessar administração
              </Link>
            </section>
          ) : null}
        </div>

        {isCommon ? (
          <section className="saved-articles-section" id="artigos-salvos">
            <div className="saved-articles-section__heading">
              <div>
                <span className="eyebrow">LarMap Explica</span>
                <h2>Artigos salvos</h2>
              </div>
              <Bookmark size={22} />
            </div>

            <p className="account-card__note account-card__note--wide">
              <ShieldCheck size={16} /> Por enquanto, esta lista fica somente neste dispositivo. A sincronização entre dispositivos depende do novo backend.
            </p>

            {savedArticles.length ? (
              <div className="saved-articles-list">
                {savedArticles.map((article) => (
                  <article className="saved-article-card" key={article.id}>
                    {article.coverImageUrl ? <img alt="" src={article.coverImageUrl} /> : null}
                    <div>
                      <h3><Link to={`/blog/${article.slug}`}>{article.title}</Link></h3>
                      <p>{article.summary}</p>
                    </div>
                    <button
                      aria-label={`Remover ${article.title} dos artigos salvos`}
                      className="icon-button icon-button--danger"
                      onClick={() => handleRemoveArticle(article.id)}
                      title="Remover artigo salvo"
                      type="button"
                    >
                      <Trash2 size={16} />
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="admin-empty favorites-empty">
                <strong>Nenhum artigo salvo</strong>
                <p>Use o ícone de marcador nos conteúdos do LarMap Explica.</p>
                <Link className="secondary-button" to="/blog">Explorar artigos</Link>
              </div>
            )}
          </section>
        ) : null}
      </section>

      <PublicFooter />
    </main>
  )
}
