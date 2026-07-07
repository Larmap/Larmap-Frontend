import type { MediaFile } from '../types'

interface ImageSelectorProps {
  customUrl: string
  media: MediaFile[]
  onCustomUrlChange: (value: string) => void
  onSelect: (mediaId: string) => void
  selectedId: string
}

export function ImageSelector({ customUrl, media, onCustomUrlChange, onSelect, selectedId }: ImageSelectorProps) {
  const images = media.filter((item) => item.type === 'image')

  return (
    <div className="blog-image-selector">
      <div className="blog-image-selector__grid">
        {images.map((image) => (
          <button
            className={selectedId === image.id ? 'blog-image-option blog-image-option--selected' : 'blog-image-option'}
            key={image.id}
            onClick={() => onSelect(image.id)}
            type="button"
          >
            <img alt={image.alt ?? image.name} src={image.url} />
            <span>{image.name}</span>
          </button>
        ))}
      </div>
      <label>
        URL externa da imagem de capa
        <input
          onChange={(event) => onCustomUrlChange(event.target.value)}
          placeholder="https://..."
          type="url"
          value={customUrl}
        />
      </label>
    </div>
  )
}
