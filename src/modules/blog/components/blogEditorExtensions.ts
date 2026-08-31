import type { Extensions } from '@tiptap/core'
import Highlight from '@tiptap/extension-highlight'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import TextAlign from '@tiptap/extension-text-align'
import { BackgroundColor, Color, FontFamily, FontSize, TextStyle } from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import Youtube from '@tiptap/extension-youtube'
import StarterKit from '@tiptap/starter-kit'

/**
 * Schema compartilhado pelo editor, pelo renderer público e pela leitura do
 * HTML legado. Manter uma única lista evita que a conversão aceite nodes que
 * o frontend depois não consegue exibir.
 */
export function createBlogEditorExtensions(): Extensions {
  return [
    StarterKit.configure({
      link: false,
      underline: false,
    }),
    Underline,
    TextStyle,
    Color,
    BackgroundColor,
    FontFamily,
    FontSize,
    Highlight.configure({ multicolor: true }),
    Link.configure({
      HTMLAttributes: {
        rel: 'noopener noreferrer',
        target: '_blank',
      },
      openOnClick: false,
    }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Image.configure({
      HTMLAttributes: {
        class: 'blog-editor-image',
      },
    }),
    Youtube.configure({
      controls: true,
      height: 360,
      width: 640,
    }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    TaskList,
    TaskItem.configure({ nested: true }),
  ]
}
