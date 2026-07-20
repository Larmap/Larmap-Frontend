import { Copy, ExternalLink, FileText, MoreHorizontal, Video } from 'lucide-react'
import { useState } from 'react'
import type { MediaFile } from '../types'
import { EmptyState } from './AdminUI'

const typeLabels = { image: 'Imagem', pdf: 'Documento', video: 'Vídeo' } as const

export function MediaGrid({ items, onCopy, view }: { items: MediaFile[]; onCopy: (item: MediaFile) => void; view: 'grid' | 'list' }) {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  if (!items.length) return <EmptyState description="Tente alterar os filtros ou pesquisar outro arquivo." title="Nenhuma mídia encontrada" />

  return (
    <div className={`admin-media-grid admin-media-grid--${view}`}>
      {items.map((item) => (
        <article className="admin-media-item" key={item.id}>
          <div className="admin-media-item__preview">
            {item.type === 'image' || item.thumbnailUrl ? <img alt={item.alt ?? ''} src={item.thumbnailUrl ?? item.url} /> : item.type === 'video' ? <Video size={28} /> : <FileText size={28} />}
          </div>
          <div className="admin-media-item__info">
            <strong title={item.name}>{item.name}</strong>
            <span>{typeLabels[item.type]} · {item.size}</span>
            <time dateTime={item.createdAt}>{new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(item.createdAt)).replace('.', '')}</time>
          </div>
          <div className="admin-actions-menu admin-media-item__actions">
            <button aria-expanded={openMenu === item.id} aria-haspopup="menu" aria-label={`Ações para ${item.name}`} className="admin-icon-button" onClick={() => setOpenMenu((current) => current === item.id ? null : item.id)} type="button"><MoreHorizontal size={19} /></button>
            {openMenu === item.id ? (
              <div className="admin-actions-menu__popover" role="menu">
                <a href={item.url} onClick={() => setOpenMenu(null)} rel="noreferrer" role="menuitem" target="_blank"><ExternalLink size={15} /> Visualizar</a>
                <button onClick={() => { onCopy(item); setOpenMenu(null) }} role="menuitem" type="button"><Copy size={15} /> Copiar URL</button>
              </div>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  )
}
