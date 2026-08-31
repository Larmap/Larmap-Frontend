import { useMemo } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { createBlogEditorExtensions } from './blogEditorExtensions'
import { toEditorContent } from '../utils/content'
import type { BlogContent } from '../types'

interface BlogPostContentProps {
  className?: string
  content: BlogContent
}

/**
 * Renderizador único para conteúdo público, preview e conteúdo legado.
 * Tiptap JSON é convertido em nodes pelo EditorContent; HTML antigo passa
 * pelo parser do mesmo schema, sem ser injetado diretamente no DOM.
 */
export function BlogPostContent({ className = 'blog-post-content', content }: BlogPostContentProps) {
  const contentKey = useMemo(() => (typeof content === 'string' ? content : JSON.stringify(content ?? null)), [content])
  const editorContent = useMemo(() => toEditorContent(content), [contentKey])
  const extensions = useMemo(() => createBlogEditorExtensions(), [])
  const editor = useEditor(
    {
      content: editorContent,
      editable: false,
      editorProps: {
        attributes: {
          'aria-readonly': 'true',
          class: className,
        },
      },
      extensions,
      immediatelyRender: false,
    },
    [contentKey],
  )

  if (!editor) return null
  return <EditorContent editor={editor} />
}
