import { CalendarClock, FileText, Send } from 'lucide-react'
import type { BlogAuthor, BlogCategory, BlogPostFormValues, BlogStatus } from '../types'
import { DateTimePicker } from './DateTimePicker'
import { StatusIndicator } from './AdminUI'

export function PublicationPanel({
  currentStatus,
  form,
  onDraft,
  onUpdate,
  saving,
}: {
  currentStatus: BlogStatus
  form: BlogPostFormValues
  onDraft: () => void
  onUpdate: (next: Partial<BlogPostFormValues>) => void
  saving: boolean
}) {
  return (
    <section className="admin-side-panel">
      <div className="admin-side-panel__heading"><h2>Publicação</h2><StatusIndicator status={currentStatus} /></div>
      <dl className="admin-publication-meta"><div><dt>Visibilidade</dt><dd>Pública</dd></div></dl>
      <fieldset className="admin-radio-group">
        <legend>Quando publicar</legend>
        <label><input checked={form.publishImmediately} name="publishMode" onChange={() => onUpdate({ publishImmediately: true })} type="radio" /><span><strong>Publicar agora</strong><small>O conteúdo ficará disponível imediatamente.</small></span></label>
        <label><input checked={!form.publishImmediately} name="publishMode" onChange={() => onUpdate({ publishImmediately: false })} type="radio" /><span><strong>Agendar publicação</strong><small>Escolha uma data e um horário.</small></span></label>
      </fieldset>
      {!form.publishImmediately ? <DateTimePicker date={form.publishDate} onDateChange={(publishDate) => onUpdate({ publishDate })} onTimeChange={(publishTime) => onUpdate({ publishTime })} time={form.publishTime} /> : null}
      <div className="admin-side-panel__actions">
        <button className="admin-button admin-button--secondary" disabled={saving} onClick={onDraft} type="button"><FileText size={16} /> Salvar rascunho</button>
        <button className="admin-button admin-button--primary" disabled={saving} type="submit">{form.publishImmediately ? <Send size={16} /> : <CalendarClock size={16} />}{saving ? 'Salvando...' : form.publishImmediately ? 'Publicar' : 'Agendar'}</button>
      </div>
    </section>
  )
}

export function OrganizationPanel({
  authors,
  categories,
  form,
  onUpdate,
}: {
  authors: BlogAuthor[]
  categories: BlogCategory[]
  form: BlogPostFormValues
  onUpdate: (next: Partial<BlogPostFormValues>) => void
}) {
  const selectedAuthor = authors.find((author) => author.id === form.authorId) ?? authors[0]
  return (
    <section className="admin-side-panel">
      <div className="admin-side-panel__heading"><h2>Organização</h2></div>
      <label className="admin-field"><span>Categoria</span><select onChange={(event) => onUpdate({ categoryId: event.target.value })} required value={form.categoryId}><option value="">Selecione</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <label className="admin-field"><span>Tags</span><input onChange={(event) => onUpdate({ tagsText: event.target.value })} placeholder="mercado, compra, bairro" value={form.tagsText} /><small>Separe as tags por vírgulas.</small></label>
      <div className="admin-author-field"><span>Autor</span>{authors.length > 1 ? <select onChange={(event) => onUpdate({ authorId: event.target.value })} required value={form.authorId}>{authors.map((author) => <option key={author.id} value={author.id}>{author.name}</option>)}</select> : selectedAuthor ? <div><img alt="" src={selectedAuthor.avatarUrl} /><span><strong>{selectedAuthor.name}</strong><small>{selectedAuthor.role}</small></span></div> : <p>Nenhum autor disponível.</p>}</div>
    </section>
  )
}
