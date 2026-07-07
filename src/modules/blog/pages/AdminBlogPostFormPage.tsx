import { CalendarClock, FileText, Save, Send } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BlogEditor } from '../components/BlogEditor'
import { DateTimePicker } from '../components/DateTimePicker'
import { ImageSelector } from '../components/ImageSelector'
import { blogService } from '../services/blog.service'
import type { BlogPost, BlogPostFormValues, BlogPostInput, BlogStatus, MediaFile } from '../types'
import { buildPublishDateTime, createBlogSlug, tagsTextToNames } from '../utils'
import { useBlogAdminWorkspace } from './AdminBlogShell'

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function getDefaultSchedule() {
  const date = new Date()
  date.setDate(date.getDate() + 2)
  date.setHours(9, 0, 0, 0)

  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  }
}

function toLocalDateInput(value?: string) {
  if (!value) return getDefaultSchedule().date
  const date = new Date(value)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function toLocalTimeInput(value?: string) {
  if (!value) return getDefaultSchedule().time
  const date = new Date(value)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function getFirstImage(media: MediaFile[]) {
  return media.find((item) => item.type === 'image')
}

function createEmptyForm(media: MediaFile[]): BlogPostFormValues {
  const schedule = getDefaultSchedule()

  return {
    authorId: '',
    categoryId: '',
    content: '<p>Comece a escrever o conteúdo da postagem.</p>',
    coverImageId: getFirstImage(media)?.id ?? '',
    coverImageUrl: '',
    publishDate: schedule.date,
    publishImmediately: true,
    publishTime: schedule.time,
    slug: '',
    summary: '',
    tagsText: '',
    title: '',
  }
}

function createFormFromPost(post: BlogPost, media: MediaFile[]): BlogPostFormValues {
  const matchedCover = media.find((item) => item.url === post.coverImage.url)
  const scheduleSource = post.scheduledFor ?? post.publishedAt ?? post.updatedAt

  return {
    authorId: post.author.id,
    categoryId: post.category.id,
    content: post.content,
    coverImageId: matchedCover?.id ?? '',
    coverImageUrl: matchedCover ? '' : post.coverImage.url,
    publishDate: toLocalDateInput(scheduleSource),
    publishImmediately: post.status !== 'scheduled',
    publishTime: toLocalTimeInput(scheduleSource),
    slug: post.slug,
    summary: post.summary,
    tagsText: post.tags.map((tag) => tag.name).join(', '),
    title: post.title,
  }
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

  useEffect(() => {
    let active = true

    async function loadPost() {
      if (!id) {
        setLoadingPost(false)
        return
      }

      setLoadingPost(true)
      const post = await blogService.getPost(id)
      if (active) {
        setEditingPost(post)
        setLoadingPost(false)
      }
    }

    void loadPost()

    return () => {
      active = false
    }
  }, [id])

  useEffect(() => {
    if (editingPost) {
      setForm(createFormFromPost(editingPost, media))
      return
    }

    setForm((current) => ({
      ...current,
      authorId: current.authorId || authors[0]?.id || '',
      categoryId: current.categoryId || categories[0]?.id || '',
      coverImageId: current.coverImageId || getFirstImage(media)?.id || '',
    }))
  }, [authors, categories, editingPost, media])

  function updateForm(next: Partial<BlogPostFormValues>) {
    setForm((current) => ({ ...current, ...next }))
  }

  function handleTitleChange(value: string) {
    updateForm({
      slug: createBlogSlug(value),
      title: value,
    })
  }

  function buildPayload(statusOverride?: BlogStatus): BlogPostInput | null {
    const title = form.title.trim()
    const content = form.content.trim()
    const summary = form.summary.trim()

    if (!title || !summary || !content || !form.categoryId || !form.authorId) {
      setError('Preencha título, resumo, categoria, autor e conteúdo.')
      return null
    }

    const status = statusOverride ?? (form.publishImmediately ? 'published' : 'scheduled')
    const scheduledFor = status === 'scheduled' ? buildPublishDateTime(form.publishDate, form.publishTime) : undefined

    if (status === 'scheduled' && !scheduledFor) {
      setError('Informe data e horario para agendar a postagem.')
      return null
    }

    return {
      authorId: form.authorId,
      categoryId: form.categoryId,
      content,
      coverImageId: form.coverImageUrl.trim() ? undefined : form.coverImageId,
      coverImageUrl: form.coverImageUrl.trim() || undefined,
      scheduledFor,
      slug: form.slug || createBlogSlug(title),
      status,
      summary,
      tags: tagsTextToNames(form.tagsText),
      title,
    }
  }

  async function savePost(statusOverride?: BlogStatus) {
    const payload = buildPayload(statusOverride)
    if (!payload) return

    setSaving(true)
    setError('')

    try {
      if (editingPost) {
        await blogService.updatePost(editingPost.id, payload)
      } else {
        await blogService.createPost(payload)
      }

      await reload()
      navigate('/admin/blog/posts')
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Não foi possível salvar a postagem.')
    } finally {
      setSaving(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void savePost()
  }

  return (
    <div className="blog-admin-stack">
      <section className="blog-admin-heading blog-admin-heading--compact">
        <div>
          <span className="eyebrow">{editingPost ? 'Edição' : 'Cadastro'}</span>
          <h1>{editingPost ? 'Editar postagem' : 'Criar nova postagem'}</h1>
          <p>Conteúdo mockado e preparado para gravar via API futuramente.</p>
        </div>
      </section>

      {error ? <p className="notice notice--error">{error}</p> : null}
      {loadingPost ? <p className="blog-loading">Carregando postagem...</p> : null}

      <form className="panel blog-post-form" onSubmit={handleSubmit}>
        <fieldset className="admin-form-section">
          <legend>Informações principais</legend>
          <label>
            Título
            <input minLength={3} onChange={(event) => handleTitleChange(event.target.value)} required value={form.title} />
          </label>

          <label>
            Slug automático
            <input readOnly value={form.slug} />
          </label>

          <label>
            Resumo
            <textarea
              maxLength={280}
              onChange={(event) => updateForm({ summary: event.target.value })}
              required
              rows={3}
              value={form.summary}
            />
          </label>

          <div className="form-grid">
            <label>
              Categoria
              <select onChange={(event) => updateForm({ categoryId: event.target.value })} required value={form.categoryId}>
                <option value="">Selecione</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Autor
              <select onChange={(event) => updateForm({ authorId: event.target.value })} required value={form.authorId}>
                <option value="">Selecione</option>
                {authors.map((author) => (
                  <option key={author.id} value={author.id}>
                    {author.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            Tags
            <input
              onChange={(event) => updateForm({ tagsText: event.target.value })}
              placeholder="mercado, compra, bairro"
              value={form.tagsText}
            />
          </label>
        </fieldset>

        <fieldset className="admin-form-section">
          <legend>Imagem de capa</legend>
          <ImageSelector
            customUrl={form.coverImageUrl}
            media={media}
            onCustomUrlChange={(value) => updateForm({ coverImageId: value ? '' : form.coverImageId, coverImageUrl: value })}
            onSelect={(coverImageId) => updateForm({ coverImageId, coverImageUrl: '' })}
            selectedId={form.coverImageId}
          />
        </fieldset>

        <fieldset className="admin-form-section">
          <legend>Conteúdo</legend>
          <BlogEditor onChange={(content) => updateForm({ content })} value={form.content} />
        </fieldset>

        <fieldset className="admin-form-section">
          <legend>Publicação</legend>
          <label className="blog-checkbox-row">
            <input
              checked={form.publishImmediately}
              onChange={(event) => updateForm({ publishImmediately: event.target.checked })}
              type="checkbox"
            />
            <span>Publicar imediatamente</span>
          </label>

          {!form.publishImmediately ? (
            <DateTimePicker
              date={form.publishDate}
              onDateChange={(publishDate) => updateForm({ publishDate })}
              onTimeChange={(publishTime) => updateForm({ publishTime })}
              time={form.publishTime}
            />
          ) : null}
        </fieldset>

        <div className="blog-post-form__actions">
          <button className="secondary-button" disabled={saving} onClick={() => void savePost('draft')} type="button">
            <FileText size={17} />
            <span>Salvar rascunho</span>
          </button>
          <button className="secondary-button" disabled={saving} onClick={() => void savePost('scheduled')} type="button">
            <CalendarClock size={17} />
            <span>Agendar</span>
          </button>
          <button className="primary-button" disabled={saving} type="submit">
            {editingPost ? <Save size={17} /> : <Send size={17} />}
            <span>{saving ? 'Salvando...' : form.publishImmediately ? 'Publicar' : 'Salvar agendamento'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
