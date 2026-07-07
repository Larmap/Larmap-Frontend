import { Clock3 } from 'lucide-react'

interface ReadingTimeProps {
  minutes: number
}

export function ReadingTime({ minutes }: ReadingTimeProps) {
  return (
    <span className="blog-reading-time">
      <Clock3 size={14} />
      {minutes} min de leitura
    </span>
  )
}
