import { Eye, Image as ImageIcon, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AdminPageHeader, AdminToast, ConfirmDialog, SaveStatus, type SaveState } from '../components/AdminUI'
import { BlogEditor } from '../components/BlogEditor'
import { ImageSelector } from '../components/ImageSelector'
import { OrganizationPanel, PublicationPanel } from '../components/PublicationPanels'
import { blogService } from '../services/blog.service'
import type { BlogPost, BlogPostFormValues, BlogPostInput, BlogStatus, MediaFile } from '../types'
import { buildPublishDateTime, createBlogSlug, tagsTextToNames } from '../utils'
import { useBlogAdminWorkspace } from './AdminBlogShell'

function pad(value: number) { return String(value).padStart(2, '0') }
function getDefaultSchedule() {
  const date = new Date(); date.setDate(date.getDate() + 2); date.setHours(9, 0, 0, 0)
  return { date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`, time: `${pad(date.getHours())}:${pad(date.getMinutes())}` }
}
function toLocalDateInput(value?: string) { if (!value) return getDefaultSchedule().date; const date = new Date(value); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` }
function toLocalTimeInput(value?: string) { if (!value) return getDefaultSchedule().time; const date = new Date(value); return `${pad(date.getHours())}:${pad(date.getMinutes())}` }
function getFirstImage(media: MediaFile[]) { return media.find((item) => item.type === 'image') }
function createEmptyForm(media: MediaFile[]): BlogPostFormValues {
  const schedule = getDefaultSchedule()
  return { authorId: '', categoryId: '', content: '<p>Comece a escrever o conteúdo da publicação.</p>', coverImageId: getFirstImage(media)?.id ?? '', coverImageUrl: '', publishDate: schedule.date, publishImmediately: true, publishTime: schedule.time, slug: '', summary: '', tagsText: '', title: '' }
}
function createFormFromPost(post: BlogPost, media: MediaFile[]): BlogPostFormValues {
  const matchedCover = media.find((item) => item.url === post.coverImage.url)
  const scheduleSource = post.scheduledFor ?? post.publishedAt ?? post.updatedAt
  return { authorId: post.author.id, categoryId: post.category.id, content: post.content, coverImageId: matchedCover?.id ?? '', coverImageUrl: matchedCover ? '' : post.coverImage.url, publishDate: toLocalDateInput(scheduleSource), publishImmediately: post.status !== 'scheduled', publishTime: toLocalTimeInput(scheduleSource), slug: post.slug, summary: post.summary, tagsText: post.tags.map((tag) => tag.name).join(', '), title: post.title }
}

export function AdminBlogPostFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { authors, categories, media, reload } = useBlogAdminWorkspace()
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null)
  const [form, setForm] = useState<BlogPostFormValues>(() => createEmptyForm(media))
  const [error, setError] = useState('')
  const [loadingPost, setLoadingPost] = useState(Boolean(id))
  const [saving, setSaving] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [isDirty, setIsDirty] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [pendingPath, setPendingPath] = useState('')

  useEffect(() => {
    let active = true
    async function loadPost() {
      if (!id) { setLoadingPost(false); return }
      setLoadingPost(true)
      const post = await blogService.getPost(id)
      if (active) { setEditingPost(post); setError(post ? '' : 'Publicação não encontrada.'); setLoadingPost(false) }
    }
    void loadPost()
    return () => { active = false }
  }, [id])

  useEffect(() => {
    if (editingPost) { setForm(createFormFromPost(editingPost, media)); return }
    setForm((current) => ({ ...current, authorId: current.authorId || authors[0]?.id || '', categoryId: current.categoryId || categories[0]?.id || '', coverImageId: current.coverImageId || getFirstImage(media)?.id || '' }))
  }, [authors, categories, editingPost, media])

  useEffect(() => {
    if (!isDirty) return
    setSaveState('saving')
    const timeout = window.setTimeout(() => setSaveState('saved'), 700)
    return () => window.clearTimeout(timeout)
  }, [form, isDirty])

  useEffect(() => {
    function warnBeforeUnload(event: BeforeUnloadEvent) {
      if (!isDirty) return
      event.preventDefault()
      event.returnValue = 'Existem alterações que ainda não foram salvas.'
    }
    function interceptNavigation(event: MouseEvent) {
      if (!isDirty || event.defaultPrevented) return
      const anchor = (event.target as Element).closest('a')
      const href = anchor?.getAttribute('href')
      if (!href?.startsWith('/') || anchor?.getAttribute('target') === '_blank') return
      event.preventDefault(); setPendingPath(href)
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    document.addEventListener('click', interceptNavigation)
    return () => { window.removeEventListener('beforeunload', warnBeforeUnload); document.removeEventListener('click', interceptNavigation) }
  }, [isDirty])

  function updateForm(next: Partial<BlogPostFormValues>) { setForm((current) => ({ ...current, ...next })); setIsDirty(true) }
  function handleTitleChange(value: string) { updateForm({ slug: createBlogSlug(value), title: value }) }

  function buildPayload(statusOverride?: BlogStatus): BlogPostInput | null {
    const title = form.title.trim(); const content = form.content.trim(); const summary = form.summary.trim()
    if (!title || !summary || !content || !form.categoryId || !form.authorId) { setError('Preencha título, resumo, categoria, autor e conteúdo.'); return null }
    const status = statusOverride ?? (form.publishImmediately ? 'published' : 'scheduled')
    const scheduledFor = status === 'scheduled' ? buildPublishDateTime(form.publishDate, form.publishTime) : undefined
    if (status === 'scheduled' && !scheduledFor) { setError('Informe data e horário para agendar a publicação.'); return null }
    return { authorId: form.authorId, categoryId: form.categoryId, content, coverImageId: form.coverImageUrl.trim() ? undefined : form.coverImageId, coverImageUrl: form.coverImageUrl.trim() || undefined, scheduledFor, slug: form.slug || createBlogSlug(title), status, summary, tags: tagsTextToNames(form.tagsText), title }
  }

  async function savePost(statusOverride?: BlogStatus) {
    const payload = buildPayload(statusOverride); if (!payload) return
    setSaving(true); setError(''); setSaveState('saving')
    try {
      if (editingPost) await blogService.updatePost(editingPost.id, payload)
      else await blogService.createPost(payload)
      await reload(); setIsDirty(false); setSaveState('saved')
      const message = payload.status === 'draft' ? 'Rascunho salvo.' : payload.status === 'scheduled' ? 'Publicação agendada.' : 'Publicação publicada.'
      navigate('/admin/blog/posts', { state: { notice: message } })
    } catch (caughtError) { setSaveState('error'); setError(caughtError instanceof Error ? caughtError.message : 'Não foi possível salvar a publicação.') }
    finally { setSaving(false) }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void savePost() }
  const selectedCover = media.find((item) => item.id === form.coverImageId)

  return (
    <div className="blog-admin-stack blog-admin-editor-page">
      <AdminPageHeader
        action={<div className="admin-page-header__tools"><SaveStatus state={saveState} /><button className="admin-button admin-button--secondary" onClick={() => setPreviewOpen(true)} type="button"><Eye size={16} /> Pré-visualizar</button></div>}
        description={editingPost ? 'Revise, organize e atualize este conteúdo no LarMap Explica.' : 'Escreva, organize e publique um novo conteúdo no LarMap Explica.'}
        title={editingPost ? 'Editar publicação' : 'Criar nova publicação'}
      />
      {error ? <AdminToast message={error} tone="error" /> : null}
      {loadingPost ? <p className="admin-loading">Carregando publicação...</p> : (
        <form className="admin-editor-layout" onSubmit={handleSubmit}>
          <main className="admin-editor-main">
            <label className="admin-title-field"><span className="sr-only">Título</span><input minLength={3} onChange={(event) => handleTitleChange(event.target.value)} placeholder="Título da publicação" required value={form.title} /></label>
            <label className="admin-slug-field"><span>larmap.com.br/blog/</span><input aria-label="Slug da publicação" onChange={(event) => updateForm({ slug: createBlogSlug(event.target.value) })} value={form.slug} /></label>
            <label className="admin-field admin-summary-field"><span>Resumo</span><textarea maxLength={220} onChange={(event) => updateForm({ summary: event.target.value })} placeholder="Apresente o conteúdo em poucas palavras." required rows={4} value={form.summary} /><small>{form.summary.length} / 220 caracteres</small></label>
            <section className="admin-editor-section"><div className="admin-section-heading"><div><h2>Conteúdo</h2><p>Estruture o texto e adicione os recursos necessários.</p></div></div><BlogEditor onChange={(content) => updateForm({ content })} value={form.content} /></section>
          </main>
          <aside className="admin-editor-sidebar">
            <PublicationPanel currentStatus={editingPost?.status ?? 'draft'} form={form} onDraft={() => void savePost('draft')} onUpdate={updateForm} saving={saving} />
            <section className="admin-side-panel"><div className="admin-side-panel__heading"><h2>Imagem de capa</h2><ImageIcon size={17} /></div><ImageSelector customUrl={form.coverImageUrl} media={media} onCustomUrlChange={(value) => updateForm({ coverImageId: value ? '' : form.coverImageId, coverImageUrl: value })} onSelect={(coverImageId) => updateForm({ coverImageId, coverImageUrl: '' })} selectedId={form.coverImageId} /></section>
            <OrganizationPanel authors={authors} categories={categories} form={form} onUpdate={updateForm} />
          </aside>
        </form>
      )}

      {previewOpen ? <div className="admin-dialog-backdrop"><div aria-modal="true" className="admin-dialog admin-preview-dialog" role="dialog"><div className="admin-dialog__header"><div><h2>Pré-visualização</h2><p>Aproximação da aparência pública do conteúdo.</p></div><button aria-label="Fechar" className="admin-icon-button" onClick={() => setPreviewOpen(false)} type="button"><X size={19} /></button></div><article>{selectedCover?.url || form.coverImageUrl ? <img alt="" src={form.coverImageUrl || selectedCover?.url} /> : null}<span>{categories.find((item) => item.id === form.categoryId)?.name}</span><h1>{form.title || 'Título da publicação'}</h1><p>{form.summary || 'O resumo da publicação aparecerá aqui.'}</p><div dangerouslySetInnerHTML={{ __html: form.content }} /></article></div></div> : null}
      <ConfirmDialog confirmLabel="Sair" description="Existem alterações que ainda não foram salvas. Deseja sair mesmo assim?" onCancel={() => setPendingPath('')} onConfirm={() => { const path = pendingPath; setPendingPath(''); setIsDirty(false); navigate(path) }} open={Boolean(pendingPath)} title="Sair sem salvar?" />
    </div>
  )
}
