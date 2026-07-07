import { FileText } from 'lucide-react'
import type { MediaFile } from '../types'

interface PdfSelectorProps {
  media: MediaFile[]
}

export function PdfSelector({ media }: PdfSelectorProps) {
  const pdfs = media.filter((item) => item.type === 'pdf')

  return (
    <div className="blog-media-list">
      {pdfs.map((pdf) => (
        <article className="blog-media-file" key={pdf.id}>
          <div className="blog-media-file__preview">
            <FileText size={22} />
          </div>
          <div>
            <strong>{pdf.name}</strong>
            <span>{pdf.size}</span>
          </div>
        </article>
      ))}
    </div>
  )
}
