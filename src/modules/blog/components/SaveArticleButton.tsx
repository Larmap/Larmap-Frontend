import { Bookmark } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { AuthPromptDialog } from '../../../components/AuthPromptDialog'
import { useAuth } from '../../../context/AuthContext'
import {
  isArticleSaved,
  SAVED_ARTICLES_CHANGED_EVENT,
  toggleSavedArticle,
} from '../../../hooks/useSavedArticles'
import { canUsePublicFavorites } from '../../../utils/userAccess'
import type { BlogPost } from '../types'

interface SaveArticleButtonProps {
  compact?: boolean
  post: BlogPost
}

export function SaveArticleButton({ compact = false, post }: SaveArticleButtonProps) {
  const { isAuthenticated, user } = useAuth()
  const [authPromptOpen, setAuthPromptOpen] = useState(false)
  const [saved, setSaved] = useState(() => Boolean(user && isArticleSaved(user.id, post.id)))
  const canShow = canUsePublicFavorites(isAuthenticated, user)

  const syncSavedState = useCallback(() => {
    setSaved(Boolean(user && isArticleSaved(user.id, post.id)))
  }, [post.id, user])

  useEffect(() => {
    syncSavedState()

    function handleSavedArticlesChange(event: Event) {
      const detail = (event as CustomEvent<{ userId?: string }>).detail
      if (!user || detail?.userId === user.id) syncSavedState()
    }

    window.addEventListener(SAVED_ARTICLES_CHANGED_EVENT, handleSavedArticlesChange)
    return () => window.removeEventListener(SAVED_ARTICLES_CHANGED_EVENT, handleSavedArticlesChange)
  }, [syncSavedState, user])

  if (!canShow || post.status !== 'published') return null

  function handleSave() {
    if (!isAuthenticated || !user) {
      setAuthPromptOpen(true)
      return
    }

    const nextItems = toggleSavedArticle(user.id, post)
    setSaved(nextItems.some((item) => item.id === post.id))
  }

  const label = saved ? 'Remover dos artigos salvos' : 'Salvar artigo'

  return (
    <>
      <button
        aria-label={label}
        aria-pressed={saved}
        className={[
          'save-article-button',
          compact ? 'save-article-button--compact' : '',
          saved ? 'save-article-button--active' : '',
        ].filter(Boolean).join(' ')}
        onClick={handleSave}
        title={label}
        type="button"
      >
        <Bookmark size={compact ? 17 : 18} />
        {compact ? null : <span>{saved ? 'Artigo salvo' : 'Salvar artigo'}</span>}
      </button>

      {authPromptOpen ? (
        <AuthPromptDialog
          description="Entre ou crie sua conta pessoal para salvar este conteúdo do LarMap Explica."
          onClose={() => setAuthPromptOpen(false)}
          title="Salve este artigo"
        />
      ) : null}
    </>
  )
}
