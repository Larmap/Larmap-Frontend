import { Video } from 'lucide-react'
import type { MediaFile } from '../types'

interface VideoSelectorProps {
  media: MediaFile[]
}

export function VideoSelector({ media }: VideoSelectorProps) {
  const videos = media.filter((item) => item.type === 'video')

  return (
    <div className="blog-media-list">
      {videos.map((video) => (
        <article className="blog-media-file" key={video.id}>
          <div className="blog-media-file__preview">
            {video.thumbnailUrl ? <img alt="" src={video.thumbnailUrl} /> : <Video size={22} />}
          </div>
          <div>
            <strong>{video.name}</strong>
            <span>{video.size}</span>
          </div>
        </article>
      ))}
    </div>
  )
}
