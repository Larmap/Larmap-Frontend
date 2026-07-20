import { Image as ImageIcon, Link2, Search, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { MediaFile } from '../types'
import { EmptyState } from './AdminUI'

interface ImageSelectorProps {
  customUrl: string
  media: MediaFile[]
  onCustomUrlChange: (value: string) => void
  onSelect: (mediaId: string) => void
  selectedId: string
}

export function ImageSelector({ customUrl, media, onCustomUrlChange, onSelect, selectedId }: ImageSelectorProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [showUrl, setShowUrl] = useState(Boolean(customUrl))
  const [pendingId, setPendingId] = useState(selectedId)
  const images = useMemo(() => media.filter((item) => item.type === 'image'), [media])
  const filteredImages = images.filter((item) => item.name.toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR')))
  const selected = images.find((item) => item.id === selectedId)
  const previewUrl = customUrl || selected?.url

  function openLibrary() {
    setPendingId(selectedId)
    setOpen(true)
  }

  function confirmSelection() {
    onSelect(pendingId)
    onCustomUrlChange('')
    setShowUrl(false)
    setOpen(false)
  }

  function removeCover() {
    onSelect('')
    onCustomUrlChange('')
    setShowUrl(false)
  }

  return (
    <div className="admin-cover-picker">
      {previewUrl ? (
        <div className="admin-cover-picker__preview"><img alt={selected?.alt ?? 'Prévia da imagem de capa'} src={previewUrl} /><div><strong title={selected?.name ?? customUrl}>{selected?.name ?? 'Imagem externa'}</strong><span>{selected?.size ?? 'URL externa'}</span></div></div>
      ) : <div className="admin-cover-picker__empty"><ImageIcon size={24} /><span>Nenhuma imagem selecionada</span></div>}
      <div className="admin-cover-picker__actions">
        <button className="admin-button admin-button--secondary admin-button--small" onClick={openLibrary} type="button">Escolher na biblioteca</button>
        {previewUrl ? <button className="admin-button admin-button--ghost admin-button--small" onClick={removeCover} type="button"><Trash2 size={15} /> Remover capa</button> : null}
      </div>
      <button className="admin-link-button" onClick={() => setShowUrl((current) => !current)} type="button"><Link2 size={15} /> Usar imagem por URL</button>
      {showUrl ? <label className="admin-field"><span>URL externa</span><input onChange={(event) => { onCustomUrlChange(event.target.value); onSelect('') }} placeholder="https://..." type="url" value={customUrl} /></label> : null}

      {open ? (
        <div className="admin-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <div aria-modal="true" className="admin-dialog admin-media-picker" role="dialog">
            <div className="admin-dialog__header"><div><h2>Escolher imagem</h2><p>Selecione uma imagem da biblioteca de mídia.</p></div><button aria-label="Fechar" className="admin-icon-button" onClick={() => setOpen(false)} type="button"><X size={19} /></button></div>
            <label className="admin-search-field"><Search size={17} /><span className="sr-only">Buscar imagem</span><input onChange={(event) => setQuery(event.target.value)} placeholder="Buscar imagem" type="search" value={query} /></label>
            {filteredImages.length ? (
              <div className="admin-media-picker__grid">
                {filteredImages.map((image) => <button aria-pressed={pendingId === image.id} className={pendingId === image.id ? 'is-selected' : ''} key={image.id} onClick={() => setPendingId(image.id)} type="button"><img alt={image.alt ?? ''} src={image.url} /><span title={image.name}>{image.name}</span></button>)}
              </div>
            ) : <EmptyState description="Tente pesquisar outro nome de arquivo." title="Nenhuma imagem encontrada" />}
            <div className="admin-dialog__actions"><button className="admin-button admin-button--secondary" onClick={() => setOpen(false)} type="button">Cancelar</button><button className="admin-button admin-button--primary" disabled={!pendingId} onClick={confirmSelection} type="button">Usar imagem</button></div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
