import { Grid2X2, List, Search, UploadCloud, X } from 'lucide-react'
import { useMemo, useState, type ChangeEvent, type DragEvent } from 'react'
import { AdminPageHeader, AdminSurface, AdminToast } from '../components/AdminUI'
import { AdminToolbar } from '../components/AdminToolbar'
import { MediaGrid } from '../components/MediaGrid'
import { blogService } from '../services/blog.service'
import type { MediaFileType } from '../types'
import { useBlogAdminWorkspace } from './AdminBlogShell'

type MediaFilter = 'all' | MediaFileType

export function AdminBlogMediaPage() {
  const { media, reload } = useBlogAdminWorkspace()
  const [notice, setNotice] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [type, setType] = useState<MediaFilter>('all')
  const [sort, setSort] = useState('newest')
  const [view, setView] = useState<'grid' | 'list'>('grid')

  const filteredMedia = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR')
    return media
      .filter((item) => type === 'all' || item.type === type)
      .filter((item) => !normalizedQuery || item.name.toLocaleLowerCase('pt-BR').includes(normalizedQuery))
      .sort((a, b) => (sort === 'oldest' ? 1 : -1) * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()))
  }, [media, query, sort, type])

  async function handleUpload(files: File[]) {
    if (!files.length) return
    await Promise.all(files.map((file) => blogService.uploadMedia(file)))
    setUploadOpen(false)
    setNotice(files.length === 1 ? 'Arquivo adicionado.' : 'Arquivos adicionados.')
    await reload()
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    void handleUpload(Array.from(event.target.files ?? []))
    event.target.value = ''
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    void handleUpload(Array.from(event.dataTransfer.files))
  }

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url)
    setNotice('URL copiada.')
  }

  return (
    <div className="blog-admin-stack">
      <AdminPageHeader action={<button className="admin-button admin-button--primary" onClick={() => setUploadOpen(true)} type="button"><UploadCloud size={17} /> Enviar arquivo</button>} description="Gerencie as imagens, os vídeos e os documentos utilizados nas publicações." meta={`${media.length} arquivos`} title="Biblioteca de mídia" />
      <AdminSurface className="admin-media-surface">
        <AdminToolbar>
          <label className="admin-search-field"><span className="sr-only">Buscar mídia</span><Search size={17} /><input onChange={(event) => setQuery(event.target.value)} placeholder="Buscar arquivo" type="search" value={query} /></label>
          <label><span className="sr-only">Filtrar por tipo</span><select onChange={(event) => setType(event.target.value as MediaFilter)} value={type}><option value="all">Todos</option><option value="image">Imagens</option><option value="video">Vídeos</option><option value="pdf">Documentos</option></select></label>
          <label><span className="sr-only">Ordenar mídias</span><select onChange={(event) => setSort(event.target.value)} value={sort}><option value="newest">Mais recentes</option><option value="oldest">Mais antigas</option></select></label>
          <div className="admin-view-switch" aria-label="Modo de visualização"><button aria-label="Visualização em grade" className={view === 'grid' ? 'is-active' : ''} onClick={() => setView('grid')} type="button"><Grid2X2 size={17} /></button><button aria-label="Visualização em lista" className={view === 'list' ? 'is-active' : ''} onClick={() => setView('list')} type="button"><List size={17} /></button></div>
        </AdminToolbar>
        <MediaGrid items={filteredMedia} onCopy={(item) => void copyUrl(item.url)} view={view} />
      </AdminSurface>
      <AdminToast message={notice} />

      {uploadOpen ? (
        <div className="admin-dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setUploadOpen(false)}>
          <div aria-modal="true" className="admin-dialog admin-upload-dialog" role="dialog">
            <div className="admin-dialog__header"><div><h2>Enviar arquivo</h2><p>Adicione novas mídias à biblioteca.</p></div><button aria-label="Fechar" className="admin-icon-button" onClick={() => setUploadOpen(false)} type="button"><X size={19} /></button></div>
            <label className="admin-upload-dropzone" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
              <input accept="image/*,video/*,application/pdf,.pdf" multiple onChange={handleFileInput} type="file" />
              <UploadCloud size={28} /><strong>Arraste os arquivos para esta área</strong><span>ou selecione arquivos do seu dispositivo.</span><small>Imagens, vídeos e documentos PDF. O limite depende do ambiente de publicação.</small>
            </label>
          </div>
        </div>
      ) : null}
    </div>
  )
}
