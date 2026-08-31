import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  CheckSquare,
  FileText,
  Heading2,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Table2,
  Underline as UnderlineIcon,
  Undo2,
  Video,
} from 'lucide-react'
import { useEffect, useMemo, type ReactNode } from 'react'
import Placeholder from '@tiptap/extension-placeholder'
import { EditorContent, useEditor } from '@tiptap/react'
import { BLOG_FONT_OPTIONS, BLOG_FONT_SIZE_OPTIONS } from '../constants'
import { createBlogEditorExtensions } from './blogEditorExtensions'
import { toEditorContent } from '../utils/content'
import type { BlogContent, TiptapDocument } from '../types'

interface BlogEditorProps {
  onChange: (value: TiptapDocument) => void
  value: BlogContent
}

interface ToolbarButtonProps {
  active?: boolean
  children: ReactNode
  label: string
  onClick: () => void
}

interface TextStyleAttributes {
  backgroundColor?: string
  color?: string
  fontFamily?: string
  fontSize?: string
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function ToolbarButton({ active = false, children, label, onClick }: ToolbarButtonProps) {
  return (
    <button
      aria-label={label}
      className={active ? 'blog-editor__tool blog-editor__tool--active' : 'blog-editor__tool'}
      onClick={onClick}
      title={label}
      type="button"
    >
      {children}
    </button>
  )
}

export function BlogEditor({ onChange, value }: BlogEditorProps) {
  const extensions = useMemo(() => createBlogEditorExtensions(), [])
  const editorContent = useMemo(() => toEditorContent(value), [value])
  const editor = useEditor({
    content: editorContent,
    editorProps: {
      attributes: {
        class: 'blog-editor__content',
      },
    },
    extensions: [
      ...extensions,
      Placeholder.configure({
        placeholder: 'Escreva o conteúdo da postagem...',
      }),
    ],
    onUpdate: ({ editor: currentEditor }) => {
      if (currentEditor.isDestroyed) return
      onChange(currentEditor.getJSON() as TiptapDocument)
    },
    shouldRerenderOnTransaction: true,
  })

  useEffect(() => {
    if (!editor) return
    if (editor.isDestroyed) return
    const nextContent = toEditorContent(value)
    if (typeof nextContent === 'string') {
      if (editor.getHTML() === nextContent) return
    } else if (JSON.stringify(editor.getJSON()) === JSON.stringify(nextContent)) {
      return
    }
    editor.commands.setContent(nextContent, { emitUpdate: false })
  }, [editor, value])

  if (!editor) {
    return <div className="blog-editor blog-editor--loading">Carregando editor...</div>
  }

  const textStyleAttributes = editor.getAttributes('textStyle') as TextStyleAttributes
  const textColor = textStyleAttributes.color ?? '#18232d'
  const backgroundColor = textStyleAttributes.backgroundColor ?? '#ffffff'
  const fontFamily = textStyleAttributes.fontFamily ?? 'Poppins'
  const fontSize = textStyleAttributes.fontSize?.replace('px', '') ?? '16'

  function setLink() {
    const previousUrl = editor?.getAttributes('link').href as string | undefined
    const url = window.prompt('URL do link', previousUrl ?? 'https://')
    if (url === null || !editor) return

    if (!url.trim()) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
  }

  function addImage() {
    const url = window.prompt('URL da imagem', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2')
    if (!url?.trim() || !editor) return
    editor.chain().focus().setImage({ src: url.trim() }).run()
  }

  function addVideo() {
    const url = window.prompt('URL do vídeo do YouTube', 'https://www.youtube.com/watch?v=ysz5S6PUM-U')
    if (!url?.trim() || !editor) return
    editor.chain().focus().setYoutubeVideo({ src: url.trim() }).run()
  }

  function addPdf() {
    const url = window.prompt('URL do PDF', 'https://example.com/checklist-compra-imovel.pdf')
    if (!url?.trim() || !editor) return

    const fileName = url.split('/').pop() || 'documento.pdf'
    editor
      .chain()
      .focus()
      .insertContent(
        `<p><a href="${escapeHtml(url.trim())}" target="_blank" rel="noopener noreferrer">PDF: ${escapeHtml(fileName)}</a></p>`,
      )
      .run()
  }

  return (
    <div className="blog-editor">
      <div className="blog-editor__toolbar" aria-label="Ferramentas do editor">
        <div className="blog-editor__group">
          <ToolbarButton active={editor.isActive('paragraph')} label="Texto" onClick={() => editor.chain().focus().setParagraph().run()}>
            <Pilcrow size={16} />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive('heading', { level: 2 })} label="Título" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
            <Heading2 size={16} />
          </ToolbarButton>
        </div>

        <div className="blog-editor__group">
          <ToolbarButton active={editor.isActive('bold')} label="Negrito" onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold size={16} />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive('italic')} label="Itálico" onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic size={16} />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive('underline')} label="Sublinhado" onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <UnderlineIcon size={16} />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive('strike')} label="Tachado" onClick={() => editor.chain().focus().toggleStrike().run()}>
            <Strikethrough size={16} />
          </ToolbarButton>
        </div>

        <div className="blog-editor__group">
          <ToolbarButton active={editor.isActive({ textAlign: 'left' })} label="Alinhar a esquerda" onClick={() => editor.chain().focus().setTextAlign('left').run()}>
            <AlignLeft size={16} />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive({ textAlign: 'center' })} label="Centralizar" onClick={() => editor.chain().focus().setTextAlign('center').run()}>
            <AlignCenter size={16} />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive({ textAlign: 'right' })} label="Alinhar a direita" onClick={() => editor.chain().focus().setTextAlign('right').run()}>
            <AlignRight size={16} />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive({ textAlign: 'justify' })} label="Justificar" onClick={() => editor.chain().focus().setTextAlign('justify').run()}>
            <AlignJustify size={16} />
          </ToolbarButton>
        </div>

        <div className="blog-editor__group blog-editor__group--selects">
          <label>
            Fonte
            <select onChange={(event) => editor.chain().focus().setFontFamily(event.target.value).run()} value={fontFamily}>
              {BLOG_FONT_OPTIONS.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tamanho
            <select onChange={(event) => editor.chain().focus().setFontSize(`${event.target.value}px`).run()} value={fontSize}>
              {BLOG_FONT_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="blog-editor__group blog-editor__group--colors">
          <label title="Cor do texto">
            <span>Texto</span>
            <input onChange={(event) => editor.chain().focus().setColor(event.target.value).run()} type="color" value={textColor} />
          </label>
          <label title="Cor de fundo">
            <span>Fundo</span>
            <input
              onChange={(event) => editor.chain().focus().setBackgroundColor(event.target.value).run()}
              type="color"
              value={backgroundColor}
            />
          </label>
          <ToolbarButton label="Marca-texto" onClick={() => editor.chain().focus().toggleHighlight({ color: '#fff4d8' }).run()}>
            <Highlighter size={16} />
          </ToolbarButton>
        </div>

        <div className="blog-editor__group">
          <ToolbarButton active={editor.isActive('bulletList')} label="Lista" onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <List size={16} />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive('orderedList')} label="Lista numerada" onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <ListOrdered size={16} />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive('taskList')} label="Checklist" onClick={() => editor.chain().focus().toggleTaskList().run()}>
            <CheckSquare size={16} />
          </ToolbarButton>
        </div>

        <div className="blog-editor__group">
          <ToolbarButton active={editor.isActive('link')} label="Link" onClick={setLink}>
            <LinkIcon size={16} />
          </ToolbarButton>
          <ToolbarButton label="Imagem" onClick={addImage}>
            <ImageIcon size={16} />
          </ToolbarButton>
          <ToolbarButton label="Video" onClick={addVideo}>
            <Video size={16} />
          </ToolbarButton>
          <ToolbarButton label="PDF" onClick={addPdf}>
            <FileText size={16} />
          </ToolbarButton>
        </div>

        <div className="blog-editor__group">
          <ToolbarButton label="Tabela" onClick={() => editor.chain().focus().insertTable({ cols: 3, rows: 3, withHeaderRow: true }).run()}>
            <Table2 size={16} />
          </ToolbarButton>
          <ToolbarButton label="Linha horizontal" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
            <Minus size={16} />
          </ToolbarButton>
          <ToolbarButton active={editor.isActive('blockquote')} label="Citação" onClick={() => editor.chain().focus().toggleBlockquote().run()}>
            <Quote size={16} />
          </ToolbarButton>
        </div>

        <div className="blog-editor__group">
          <ToolbarButton label="Desfazer" onClick={() => editor.chain().focus().undo().run()}>
            <Undo2 size={16} />
          </ToolbarButton>
          <ToolbarButton label="Refazer" onClick={() => editor.chain().focus().redo().run()}>
            <Redo2 size={16} />
          </ToolbarButton>
        </div>
      </div>

      <EditorContent editor={editor} />
    </div>
  )
}
