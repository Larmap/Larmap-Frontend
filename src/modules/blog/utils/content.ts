import { generateJSON, type JSONContent } from '@tiptap/core'
import { createBlogEditorExtensions } from '../components/blogEditorExtensions'
import type { BlogContent, TiptapDocument } from '../types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isTiptapDocument(value: unknown): value is TiptapDocument {
  if (!isRecord(value)) return false
  return value.type === 'doc' && Array.isArray(value.content)
}

export function createEmptyTiptapDocument(): TiptapDocument {
  return { type: 'doc', content: [{ type: 'paragraph' }] }
}

/**
 * Normaliza o conteúdo para a entrada aceita pelo EditorContent. Strings são
 * mantidas somente para que os mocks HTML continuem editáveis durante a
 * transição; novos valores saem do editor como JSON.
 */
export function toEditorContent(content: BlogContent): TiptapDocument | string {
  if (isTiptapDocument(content)) return content
  if (typeof content === 'string' && content.trim()) return content
  return createEmptyTiptapDocument()
}

/** Converte apenas o legado HTML; documentos já persistidos não são reescritos. */
export function toTiptapDocument(content: BlogContent): TiptapDocument {
  if (isTiptapDocument(content)) return content

  if (typeof content === 'string' && content.trim()) {
    const generated = generateJSON(content, createBlogEditorExtensions()) as JSONContent
    if (isTiptapDocument(generated)) return generated
  }

  return createEmptyTiptapDocument()
}

function textFromNode(node: JSONContent): string {
  if (node.type === 'text') return node.text ?? ''
  return (node.content ?? []).map(textFromNode).join(' ')
}

export function hasBlogContent(content: BlogContent): boolean {
  if (isTiptapDocument(content)) return textFromNode(content).trim().length > 0 || containsNonTextNode(content)
  return typeof content === 'string' && content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().length > 0
}

function containsNonTextNode(node: JSONContent): boolean {
  return (node.content ?? []).some((child) => {
    if (child.type === 'text') return false
    if (child.type === 'image' || child.type === 'youtube' || child.type === 'horizontalRule') return true
    return containsNonTextNode(child)
  })
}

export function getBlogContentText(content: BlogContent): string {
  if (isTiptapDocument(content)) return textFromNode(content).replace(/\s+/g, ' ').trim()
  if (typeof content === 'string') return content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  return ''
}
