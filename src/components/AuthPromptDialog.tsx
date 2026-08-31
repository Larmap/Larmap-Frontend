import { Bookmark, LogIn, UserPlus, X } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { featureFlags } from '../config/features'

interface AuthPromptDialogProps {
  description?: string
  onClose: () => void
  title?: string
}

export function AuthPromptDialog({
  description = 'Entre ou crie sua conta pessoal para guardar imóveis e artigos em um só lugar.',
  onClose,
  title = 'Salve na sua conta LarMap',
}: AuthPromptDialogProps) {
  const location = useLocation()

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="account-dialog-backdrop" onMouseDown={onClose} role="presentation">
      <section
        aria-labelledby="account-dialog-title"
        aria-modal="true"
        className="account-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <button aria-label="Fechar" className="account-dialog__close" onClick={onClose} type="button">
          <X size={18} />
        </button>

        <span aria-hidden="true" className="account-dialog__icon">
          <Bookmark size={22} />
        </span>
        <div className="account-dialog__copy">
          <span className="eyebrow">Sua conta LarMap</span>
          <h2 id="account-dialog-title">{title}</h2>
          <p>{description}</p>
        </div>

        <div className="account-dialog__actions">
          <Link className="primary-button" state={{ from: location }} to="/login">
            <LogIn size={17} />
            Entrar
          </Link>
          {featureFlags.PUBLIC_REGISTRATION ? (
            <Link className="secondary-button" to="/register">
              <UserPlus size={17} />
              Criar conta
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  )
}
