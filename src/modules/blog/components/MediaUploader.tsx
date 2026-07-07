import { UploadCloud } from 'lucide-react'
import type { ChangeEvent } from 'react'

interface MediaUploaderProps {
  accept?: string
  copy?: string
  onUpload: (files: File[]) => void
}

export function MediaUploader({
  accept = 'image/*,video/*,application/pdf,.pdf',
  copy = 'Imagens, vídeos ou PDFs',
  onUpload,
}: MediaUploaderProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (files.length) onUpload(files)
    event.target.value = ''
  }

  return (
    <label className="blog-media-uploader">
      <input accept={accept} multiple onChange={handleChange} type="file" />
      <span className="blog-media-uploader__icon">
        <UploadCloud size={21} />
      </span>
      <span>
        <strong>Enviar Arquivo</strong>
        <small>{copy}</small>
      </span>
    </label>
  )
}
