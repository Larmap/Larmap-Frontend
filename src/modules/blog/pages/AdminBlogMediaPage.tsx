import { Image as ImageIcon } from 'lucide-react'
import { useState } from 'react'
import { MediaUploader } from '../components/MediaUploader'
import { PdfSelector } from '../components/PdfSelector'
import { VideoSelector } from '../components/VideoSelector'
import { blogService } from '../services/blog.service'
import { useBlogAdminWorkspace } from './AdminBlogShell'

export function AdminBlogMediaPage() {
  const { media, reload } = useBlogAdminWorkspace()
  const [notice, setNotice] = useState('')
  const images = media.filter((item) => item.type === 'image')

  async function handleUpload(files: File[]) {
    await Promise.all(files.map((file) => blogService.uploadMedia(file)))
    setNotice('Upload mockado concluído. Os arquivos ficam disponíveis durante a sessão atual.')
    await reload()
  }

  return (
    <div className="blog-admin-stack">
      <section className="blog-admin-heading blog-admin-heading--compact">
        <div>
          <span className="eyebrow">{media.length} arquivos</span>
          <h1>Biblioteca de mídia</h1>
          <p>Layout preparado para imagens, vídeos e documentos PDF com upload mockado.</p>
        </div>
        <MediaUploader onUpload={handleUpload} />
      </section>

      {notice ? <p className="notice">{notice}</p> : null}

      <section className="panel blog-admin-panel">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Imagens</span>
            <h2>Capas e thumbnails</h2>
          </div>
        </div>
        <div className="blog-media-grid">
          {images.map((image) => (
            <article className="blog-media-file" key={image.id}>
              <div className="blog-media-file__preview">
                <img alt={image.alt ?? image.name} src={image.url} />
              </div>
              <div>
                <strong>{image.name}</strong>
                <span>{image.size}</span>
              </div>
            </article>
          ))}
          {!images.length ? (
            <div className="admin-empty">
              <ImageIcon size={22} />
              <strong>Nenhuma imagem cadastrada</strong>
            </div>
          ) : null}
        </div>
      </section>

      <section className="blog-admin-media-columns">
        <article className="panel blog-admin-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">Vídeos</span>
              <h2>Arquivos de vídeo</h2>
            </div>
          </div>
          <VideoSelector media={media} />
        </article>

        <article className="panel blog-admin-panel">
          <div className="panel-header">
            <div>
              <span className="eyebrow">PDF</span>
              <h2>Documentos</h2>
            </div>
          </div>
          <PdfSelector media={media} />
        </article>
      </section>
    </div>
  )
}
