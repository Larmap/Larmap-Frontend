#!/usr/bin/env node

/**
 * Migração futura dos mocks do LarMap Explica para a API real.
 *
 * Segurança por padrão:
 * - o modo padrão é dry-run;
 * - nenhuma requisição mutável passa sem EXECUTE + CONFIRM=YES;
 * - não há acesso direto a banco ou backend local neste script;
 * - os arquivos de mock são somente lidos.
 *
 * Node recomendado: >= 22 (fetch, Blob e FormData nativos).
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import vm from 'node:vm'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const FRONTEND_ROOT = path.resolve(SCRIPT_DIR, '..')
const MOCK_ROOT = path.join(FRONTEND_ROOT, 'src', 'modules', 'blog', 'mocks')
const DEFAULT_MANIFEST_PATH = path.join(SCRIPT_DIR, '.blog-migration-manifest.json')
const STATUS_VALUES = ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED']

const mode = (process.env.BLOG_MIGRATION_MODE ?? 'dry-run').trim().toLowerCase()
const confirmed = process.env.BLOG_MIGRATION_CONFIRM === 'YES'
const isExecute = mode === 'execute'
const writesAllowed = isExecute && confirmed

if (!['dry-run', 'execute'].includes(mode)) {
  throw new Error('BLOG_MIGRATION_MODE deve ser dry-run ou execute.')
}

if (isExecute && !confirmed) {
  throw new Error(
    'Modo execute bloqueado: defina BLOG_MIGRATION_CONFIRM=YES. Nenhuma escrita foi feita.',
  )
}

const apiUrl = normalizeApiBaseUrl(requiredEnv('LARMAP_API_URL'))
const migrationToken = requiredEnv('LARMAP_MIGRATION_TOKEN')
const manifestPath = path.resolve(
  FRONTEND_ROOT,
  process.env.BLOG_MIGRATION_MANIFEST ?? path.relative(FRONTEND_ROOT, DEFAULT_MANIFEST_PATH),
)
const imageMode = (process.env.BLOG_MIGRATION_IMAGE_MODE ?? 'external').trim().toLowerCase()
const createMissingCategories = process.env.BLOG_MIGRATION_CREATE_MISSING_CATEGORIES === 'YES'
const imageUrlMap = readJsonEnv('BLOG_MIGRATION_IMAGE_URL_MAP_JSON')

if (!['external', 'hosted', 'upload'].includes(imageMode)) {
  throw new Error('BLOG_MIGRATION_IMAGE_MODE deve ser external, hosted ou upload.')
}

function requiredEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}`)
  return value
}

function readJsonEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) return {}

  try {
    const parsed = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('o valor precisa ser um objeto JSON')
    }
    return parsed
  } catch (error) {
    throw new Error(`Não foi possível ler ${name}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function normalizeApiBaseUrl(value) {
  const base = value.replace(/\/+$/, '')
  return base.endsWith('/api') ? base : `${base}/api`
}

function normalizeIdentity(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function createBlogSlug(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function readMockModule(fileName, exportName, context) {
  const filePath = path.join(MOCK_ROOT, fileName)
  let source = readFileSync(filePath, 'utf8')

  // Os mocks são módulos TS simples. Removemos apenas imports/types para
  // avaliá-los com o Node sem instalar um runtime adicional de TypeScript.
  source = source.replace(/^\s*import\s+.*?from\s+['"][^'"]+['"]\s*;?\s*$/gm, '')
  source = source.replace(/\bexport\s+(?=(?:const|function)\b)/g, '')
  source = source.replace(
    /(const\s+(?:blogAuthorsMock|blogCategoriesMock|blogMediaMock|blogPostsMock))\s*:\s*[^=]+=/g,
    '$1 =',
  )
  source = source.replace(
    /\b(function\s+[A-Za-z_$][\w$]*\s*)\(([^)]*)\)(?:\s*:\s*[A-Za-z_$][\w$]*(?:<[^>]+>)?(?:\[\])?)?\s*\{/g,
    (_match, prefix, params) => {
      const strippedParams = params.replace(
        /([A-Za-z_$][\w$]*)\s*:\s*[A-Za-z_$][\w$]*(?:<[^>]+>)?(?:\[\])?/g,
        '$1',
      )
      return `${prefix}(${strippedParams}) {`
    },
  )

  const script = new vm.Script(`${source}\n${exportName}`, { filename: filePath })
  const value = script.runInNewContext(context)
  if (!Array.isArray(value)) throw new Error(`Export inválido no mock ${fileName}: ${exportName}`)
  return value
}

function loadMocks() {
  const context = { createBlogSlug }
  const authors = readMockModule('authors.mock.ts', 'blogAuthorsMock', context)
  const categories = readMockModule('categories.mock.ts', 'blogCategoriesMock', context)
  const media = readMockModule('media.mock.ts', 'blogMediaMock', context)
  context.blogAuthorsMock = authors
  context.blogCategoriesMock = categories
  context.blogMediaMock = media
  const posts = readMockModule('posts.mock.ts', 'blogPostsMock', context)
  return { authors, categories, media, posts }
}

function decodeHtmlEntities(value) {
  const named = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
  }

  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === '#') {
      const isHex = entity[1]?.toLowerCase() === 'x'
      const number = Number.parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10)
      return Number.isNaN(number) ? match : String.fromCodePoint(number)
    }
    return named[entity.toLowerCase()] ?? match
  })
}

function parseAttributes(raw) {
  const attributes = {}
  const attributePattern = /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
  let match

  while ((match = attributePattern.exec(raw))) {
    attributes[match[1].toLowerCase()] = decodeHtmlEntities(match[2] ?? match[3] ?? match[4] ?? '')
  }

  return attributes
}

function parseHtml(html) {
  const root = { tag: 'root', attributes: {}, children: [] }
  const stack = [root]
  const tokenPattern = /<!--[\s\S]*?-->|<![^>]*>|<\/?[A-Za-z][^>]*>|[^<]+/g
  const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'])
  let token

  while ((token = tokenPattern.exec(html))) {
    const value = token[0]
    if (value.startsWith('<!--') || value.startsWith('<!')) continue

    if (value.startsWith('</')) {
      const closingTag = value.slice(2, -1).trim().toLowerCase()
      const index = [...stack].reverse().findIndex((node) => node.tag === closingTag)
      if (index >= 0) stack.splice(stack.length - index - 1)
      continue
    }

    if (value.startsWith('<')) {
      const match = value.match(/^<\s*([A-Za-z][\w:-]*)([\s\S]*?)\/?\s*>$/)
      if (!match) continue
      const tag = match[1].toLowerCase()
      const node = { tag, attributes: parseAttributes(match[2]), children: [] }
      stack.at(-1).children.push(node)
      if (!voidTags.has(tag) && !/\/\s*>$/.test(value)) stack.push(node)
      continue
    }

    stack.at(-1).children.push({ text: decodeHtmlEntities(value) })
  }

  return root
}

function normalizeText(value) {
  return value.replace(/\s+/g, ' ')
}

function cleanInlineContent(content) {
  const cleaned = content.filter((node) => node.type !== 'text' || node.text.length > 0)
  const firstText = cleaned.find((node) => node.type === 'text')
  const lastText = [...cleaned].reverse().find((node) => node.type === 'text')
  if (firstText) firstText.text = firstText.text.replace(/^\s+/, '')
  if (lastText) lastText.text = lastText.text.replace(/\s+$/, '')
  return cleaned.filter((node) => node.type !== 'text' || node.text.length > 0)
}

function parseStyle(style) {
  const result = {}
  for (const declaration of String(style ?? '').split(';')) {
    const [property, ...parts] = declaration.split(':')
    if (!property || !parts.length) continue
    result[property.trim().toLowerCase()] = parts.join(':').trim()
  }
  return result
}

function isSafeLinkHref(href) {
  const value = String(href ?? '').trim()
  if (!value || value.startsWith('#') || value.startsWith('/')) return true

  try {
    const protocol = new URL(value, 'https://larmap.com.br').protocol
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(protocol)
  } catch {
    return false
  }
}

function marksForNode(node, inheritedMarks = []) {
  const attributes = node.attributes ?? {}
  const marks = [...inheritedMarks]
  const style = parseStyle(attributes.style)
  const addMark = (type, markAttributes) => {
    if (!marks.some((mark) => mark.type === type && JSON.stringify(mark.attrs ?? {}) === JSON.stringify(markAttributes ?? {}))) {
      marks.push({ type, ...(markAttributes ? { attrs: markAttributes } : {}) })
    }
  }

  if (['strong', 'b'].includes(node.tag)) addMark('bold')
  if (['em', 'i'].includes(node.tag)) addMark('italic')
  if (node.tag === 'u' || style['text-decoration']?.includes('underline')) addMark('underline')
  if (['s', 'strike', 'del'].includes(node.tag) || style['text-decoration']?.includes('line-through')) addMark('strike')
  if (node.tag === 'code') addMark('code')
  if (node.tag === 'a' && attributes.href && isSafeLinkHref(attributes.href)) {
    addMark('link', {
      href: attributes.href,
      target: attributes.target ?? '_blank',
      rel: attributes.rel ?? 'noopener noreferrer',
    })
  }

  const textStyle = {}
  if (style.color) textStyle.color = style.color
  if (style['background-color']) textStyle.backgroundColor = style['background-color']
  if (style['font-family']) textStyle.fontFamily = style['font-family']
  if (style['font-size']) textStyle.fontSize = style['font-size']
  if (Object.keys(textStyle).length) addMark('textStyle', textStyle)
  if (node.tag === 'mark') addMark('highlight', attributes['data-color'] ? { color: attributes['data-color'] } : undefined)

  return marks
}

function inlineNodes(nodes, inheritedMarks = []) {
  const output = []

  for (const node of nodes) {
    if (typeof node.text === 'string') {
      const text = normalizeText(node.text)
      if (text) output.push({ type: 'text', text, ...(inheritedMarks.length ? { marks: inheritedMarks } : {}) })
      continue
    }

    if (node.tag === 'br') {
      output.push({ type: 'hardBreak' })
      continue
    }

    if (node.tag === 'img' && node.attributes.src) {
      output.push({
        type: 'image',
        attrs: {
          src: node.attributes.src,
          alt: node.attributes.alt ?? null,
          title: node.attributes.title ?? null,
        },
      })
      continue
    }

    output.push(...inlineNodes(node.children ?? [], marksForNode(node, inheritedMarks)))
  }

  return output
}

const blockTags = new Set([
  'address', 'article', 'aside', 'blockquote', 'code', 'div', 'dl', 'fieldset', 'figcaption',
  'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'iframe',
  'img', 'li', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'ul', 'video',
])

function isBlockNode(node) {
  return typeof node.text !== 'string' && blockTags.has(node.tag)
}

function textContent(nodes) {
  return nodes
    .map((node) => typeof node.text === 'string' ? node.text : textContent(node.children ?? []))
    .join('')
}

function paragraphFromInline(nodes) {
  const content = cleanInlineContent(inlineNodes(nodes))
  return content.length ? { type: 'paragraph', content } : null
}

function convertTable(node) {
  const rows = []
  const directRows = (node.children ?? []).filter((child) => child.tag === 'tr')
  const rowGroups = (node.children ?? []).filter((child) => ['thead', 'tbody', 'tfoot'].includes(child.tag))
  const groupedRows = rowGroups.flatMap((group) => (group.children ?? []).filter((child) => child.tag === 'tr'))

  for (const row of [...directRows, ...groupedRows]) {
    const cells = (row.children ?? [])
      .filter((child) => ['td', 'th'].includes(child.tag))
      .map((cell) => ({
        type: cell.tag === 'th' ? 'tableHeader' : 'tableCell',
        content: convertBlocks(cell.children ?? []),
      }))
    if (cells.length) rows.push({ type: 'tableRow', content: cells })
  }

  return rows.length ? { type: 'table', content: rows } : null
}

function convertListItem(node) {
  let content = convertBlocks(node.children ?? [])
  if (!content.length) {
    const paragraph = paragraphFromInline(node.children ?? [])
    content = paragraph ? [paragraph] : []
  }
  return content.length ? { type: 'listItem', content } : null
}

function convertBlock(node) {
  const attributes = node.attributes ?? {}

  if (node.tag === 'p') {
    return (node.children ?? []).some((child) => typeof child.text !== 'string' && ['img', 'iframe', 'video'].includes(child.tag))
      ? convertBlocks(node.children ?? [])
      : paragraphFromInline(node.children ?? [])
  }

  if (/^h[1-6]$/.test(node.tag)) {
    const content = cleanInlineContent(inlineNodes(node.children ?? []))
    return content.length ? { type: 'heading', attrs: { level: Number(node.tag.slice(1)) }, content } : null
  }

  if (node.tag === 'ul' || node.tag === 'ol') {
    const items = (node.children ?? []).filter((child) => child.tag === 'li').map(convertListItem).filter(Boolean)
    if (!items.length) return null
    return {
      type: node.tag === 'ul' ? 'bulletList' : 'orderedList',
      ...(node.tag === 'ol' && attributes.start ? { attrs: { start: Number(attributes.start) || 1 } } : {}),
      content: items,
    }
  }

  if (node.tag === 'blockquote') {
    const content = convertBlocks(node.children ?? [])
    return content.length ? { type: 'blockquote', content } : null
  }

  if (node.tag === 'pre') {
    const code = textContent(node.children ?? [])
    const language = attributes.class?.match(/language-([\w-]+)/)?.[1]
    return { type: 'codeBlock', ...(language ? { attrs: { language } } : {}), content: code ? [{ type: 'text', text: code }] : [] }
  }

  if (node.tag === 'hr') return { type: 'horizontalRule' }

  if (node.tag === 'img' && attributes.src) {
    return { type: 'image', attrs: { src: attributes.src, alt: attributes.alt ?? null, title: attributes.title ?? null } }
  }

  if (node.tag === 'iframe' && attributes.src) {
    return {
      type: 'youtube',
      attrs: { src: attributes.src, width: Number(attributes.width) || 640, height: Number(attributes.height) || 360, start: 0 },
    }
  }

  if (node.tag === 'table') return convertTable(node)

  if (['div', 'section', 'article', 'main', 'header', 'footer', 'aside', 'figure', 'figcaption'].includes(node.tag)) {
    return convertBlocks(node.children ?? [])
  }

  const paragraph = paragraphFromInline(node.children ?? [])
  return paragraph
}

function convertBlocks(nodes) {
  const output = []
  let inlineBuffer = []
  const flushInline = () => {
    const paragraph = paragraphFromInline(inlineBuffer)
    if (paragraph) output.push(paragraph)
    inlineBuffer = []
  }

  for (const node of nodes) {
    if (typeof node.text === 'string') {
      if (node.text.trim()) inlineBuffer.push(node)
      continue
    }

    if (isBlockNode(node)) {
      flushInline()
      const converted = convertBlock(node)
      if (Array.isArray(converted)) output.push(...converted)
      else if (converted) output.push(converted)
      continue
    }

    inlineBuffer.push(node)
  }

  flushInline()
  return output
}

function isTiptapDocument(value) {
  return Boolean(value && typeof value === 'object' && value.type === 'doc' && Array.isArray(value.content))
}

function toTiptapDocument(value) {
  if (isTiptapDocument(value)) return structuredClone(value)

  if (value == null) return { type: 'doc', content: [{ type: 'paragraph' }] }

  if (typeof value === 'string') {
    const source = value.trim()
    if (!source) return { type: 'doc', content: [{ type: 'paragraph' }] }

    if (source.startsWith('{')) {
      try {
        const parsed = JSON.parse(source)
        if (isTiptapDocument(parsed)) return structuredClone(parsed)
      } catch {
        // Segue para HTML/texto quando a string não for JSON válido.
      }
    }

    if (/<[A-Za-z][^>]*>/.test(source)) {
      return { type: 'doc', content: convertBlocks(parseHtml(source).children) }
    }

    return {
      type: 'doc',
      content: source.split(/\r?\n/).map((line) => ({ type: 'paragraph', content: line ? [{ type: 'text', text: line }] : undefined })),
    }
  }

  throw new Error('content não é string HTML/texto nem documento Tiptap JSON.')
}

function collectText(node) {
  if (!node || typeof node !== 'object') return ''
  if (node.type === 'text') return `${node.text ?? ''} `
  return Array.isArray(node.content) ? node.content.map(collectText).join('') : ''
}

function calculateBackendReadingTime(content) {
  const words = collectText(content).trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function getMockSlug(post) {
  if (typeof post.slug === 'string' && post.slug && !post.slug.includes('createBlogSlug')) return post.slug
  return createBlogSlug(post.title)
}

function getStatus(post) {
  const status = String(post.status ?? 'draft').toUpperCase()
  if (!STATUS_VALUES.includes(status)) throw new Error(`Status mock inválido: ${post.status}`)
  return status
}

function historicalFields(post) {
  return {
    createdAt: post.createdAt ?? null,
    updatedAt: post.updatedAt ?? null,
    publishedAt: post.publishedAt ?? null,
    scheduledFor: post.scheduledFor ?? null,
  }
}

function classifyImage(media) {
  const url = media?.url?.trim()
  if (!url) return { kind: 'missing', description: 'imagem ausente' }

  if (url.startsWith('/assets/')) {
    const relative = url.replace(/^\/+/, '')
    const candidates = [path.join(FRONTEND_ROOT, 'public', relative), path.join(FRONTEND_ROOT, 'src', relative)]
    const localPath = candidates.find((candidate) => existsSync(candidate))
    return localPath
      ? { kind: 'project-file', description: 'arquivo existente no projeto', localPath }
      : { kind: 'local-path', description: 'caminho local /assets/...', localPath: null }
  }

  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) return { kind: 'unsupported', description: 'URL com protocolo não suportado' }
    const hostname = parsed.hostname.toLowerCase()
    const hostedByLarMap = hostname === 'larmap.com.br' || hostname.endsWith('.larmap.com.br')
    return {
      kind: hostedByLarMap ? 'public-absolute-larmap' : 'external-public-absolute',
      description: hostedByLarMap ? 'URL pública absoluta do LarMap' : 'URL pública absoluta externa',
      url,
    }
  } catch {
    return { kind: 'unsupported', description: 'URL inválida' }
  }
}

function findImageUrlOverride(media) {
  const mapped = imageUrlMap[media?.id] ?? imageUrlMap[media?.url]
  if (!mapped) return null
  try {
    const parsed = new URL(mapped)
    if (parsed.protocol !== 'https:') throw new Error('a URL deve usar HTTPS')
  } catch (error) {
    throw new Error(`Mapeamento de imagem inválido para ${media.id}: ${error instanceof Error ? error.message : String(error)}`)
  }
  return mapped
}

function findLocalImagePath(media, classification) {
  if (classification.localPath) return classification.localPath
  const relative = String(media?.url ?? '').replace(/^\/+/, '')
  const candidates = [path.join(FRONTEND_ROOT, 'public', relative), path.join(FRONTEND_ROOT, 'src', relative)]
  return candidates.find((candidate) => existsSync(candidate)) ?? null
}

async function resolveCoverImage(media, log) {
  const override = findImageUrlOverride(media)
  if (override) return override

  const classification = classifyImage(media)
  log(`  imagem: ${classification.description}`)

  if (classification.kind === 'external-public-absolute' || classification.kind === 'public-absolute-larmap') {
    if (imageMode === 'external') return classification.url
    if (imageMode === 'hosted') {
      throw new Error(`Imagem ${media.id} exige URL HTTPS hospedada; forneça BLOG_MIGRATION_IMAGE_URL_MAP_JSON.`)
    }
    throw new Error(`Imagem externa ${media.id} não pode ser enviada sem arquivo local.`)
  }

  if (classification.kind === 'project-file' || classification.kind === 'local-path') {
    if (imageMode !== 'upload') {
      throw new Error(`Imagem ${media.id} é local; use BLOG_MIGRATION_IMAGE_MODE=upload ou forneça um mapeamento HTTPS.`)
    }
    const localPath = findLocalImagePath(media, classification)
    if (!localPath) throw new Error(`Arquivo local da imagem ${media.id} não foi encontrado.`)
    return uploadMedia(localPath, media.name, log)
  }

  throw new Error(`Imagem ${media?.id ?? 'sem id'} não pode ser resolvida: ${classification.description}.`)
}

async function uploadMedia(localPath, fileName, log) {
  if (!writesAllowed) {
    log(`  DRY RUN: faria POST /blog/media com ${localPath}`)
    return `__DRY_RUN_MEDIA_URL__/${encodeURIComponent(fileName)}`
  }

  const bytes = readFileSync(localPath)
  const form = new FormData()
  form.append('file', new Blob([bytes]), fileName)
  const data = await apiRequest('/blog/media', { method: 'POST', form })
  if (!data?.url) throw new Error(`POST /blog/media não retornou url para ${fileName}.`)
  return data.url
}

function assertWriteAllowed(method, endpoint) {
  if (method === 'GET') return
  if (!writesAllowed) {
    throw new Error(`Escrita bloqueada em ${method} ${endpoint}: execute exige EXECUTE + CONFIRM=YES.`)
  }
}

async function apiRequest(endpoint, options = {}) {
  const method = options.method ?? 'GET'
  assertWriteAllowed(method, endpoint)

  const headers = new Headers({ Authorization: `Bearer ${migrationToken}` })
  const request = { method, headers }
  if (options.form) {
    request.body = options.form
  } else if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json')
    request.body = JSON.stringify(options.body)
  }

  const response = await fetch(`${apiUrl}${endpoint}`, request)
  const text = await response.text()
  let payload = null
  try {
    payload = text ? JSON.parse(text) : null
  } catch {
    throw new Error(`Resposta não JSON em ${method} ${endpoint} (HTTP ${response.status}).`)
  }

  if (!response.ok || payload?.success === false) {
    throw new Error(
      `${method} ${endpoint} falhou (HTTP ${response.status}): ${payload?.error?.message ?? 'erro desconhecido'}`,
    )
  }

  return payload?.data ?? payload
}

async function fetchAuthors() {
  const data = await apiRequest('/blog/authors')
  if (!Array.isArray(data)) throw new Error('GET /blog/authors não retornou uma lista.')
  return data
}

async function fetchCategories() {
  const data = await apiRequest('/blog/categories')
  if (!Array.isArray(data)) throw new Error('GET /blog/categories não retornou uma lista.')
  return data
}

async function fetchAllPosts() {
  const result = []
  for (const status of STATUS_VALUES) {
    let page = 1
    while (true) {
      const query = new URLSearchParams({ status, limit: '50', page: String(page) })
      const data = await apiRequest(`/blog/posts?${query}`)
      const posts = Array.isArray(data) ? data : data?.posts
      if (!Array.isArray(posts)) throw new Error(`GET /blog/posts (${status}) não retornou posts.`)
      result.push(...posts)
      const pages = Number(data?.pagination?.pages ?? 1)
      if (page >= pages || posts.length === 0) break
      page += 1
    }
  }
  return result
}

async function fetchPostDetails(slug) {
  return apiRequest(`/blog/posts/${encodeURIComponent(slug)}`)
}

function resolveAuthor(mockAuthor, realAuthors) {
  const exactName = realAuthors.filter((author) => normalizeIdentity(author.nome ?? author.name) === normalizeIdentity(mockAuthor.name))
  const byRole = exactName.filter((author) => !mockAuthor.role || normalizeIdentity(author.cargo ?? author.role) === normalizeIdentity(mockAuthor.role))
  const candidates = byRole.length ? byRole : exactName

  if (candidates.length !== 1) {
    throw new Error(
      candidates.length === 0
        ? `Autor ausente: "${mockAuthor.name}".`
        : `Autor ambíguo: "${mockAuthor.name}" encontrou ${candidates.length} registros.`,
    )
  }

  return candidates[0]
}

async function resolveCategory(mockCategory, realCategories, log) {
  const found = realCategories.find((category) => category.slug === mockCategory.slug)
  if (found) return found

  log(`  categoria ausente: ${mockCategory.slug} (${mockCategory.name})`)
  if (!createMissingCategories) {
    throw new Error(`Categoria ${mockCategory.slug} precisa ser criada antes da migração.`)
  }

  const body = {
    name: mockCategory.name,
    description: mockCategory.description,
    color: mockCategory.color,
  }
  if (!writesAllowed) {
    log(`  DRY RUN: faria POST /blog/categories com ${JSON.stringify(body)}`)
    return { id: `__DRY_RUN_CATEGORY_ID__${mockCategory.slug}`, slug: mockCategory.slug, ...body }
  }

  const created = await apiRequest('/blog/categories', { method: 'POST', body })
  if (!created?.id || created.slug !== mockCategory.slug) {
    throw new Error(`Categoria criada com slug inesperado para ${mockCategory.slug}.`)
  }
  return created
}

function buildPayload(post, content, author, category, coverImageUrl) {
  return {
    title: post.title,
    summary: post.summary,
    content,
    coverImage: coverImageUrl,
    authorId: author.id,
    categoryIds: [category.id],
    tagNames: (post.tags ?? []).map((tag) => tag.name).filter(Boolean),
    featured: post.featured === true,
  }
}

function sameContent(existingContent, desiredContent) {
  if (isTiptapDocument(existingContent)) return canonicalJson(existingContent) === canonicalJson(desiredContent)
  if (typeof existingContent === 'string') {
    try {
      const parsed = JSON.parse(existingContent)
      return isTiptapDocument(parsed) && canonicalJson(parsed) === canonicalJson(desiredContent)
    } catch {
      return false
    }
  }
  return false
}

function verifyExistingPost(existing, desired, desiredContent, desiredCoverUrl, author, category) {
  if (existing.title !== desired.title) {
    throw new Error(`Conflito de slug: ${desired.slug} já pertence a outro título.`)
  }
  if (existing.summary !== undefined && (existing.summary ?? '') !== (desired.summary ?? '')) {
    throw new Error(`Post existente ${desired.slug} tem resumo diferente; revisão manual obrigatória.`)
  }
  if (existing.coverImage !== undefined && (existing.coverImage ?? null) !== (desiredCoverUrl ?? null)) {
    throw new Error(`Post existente ${desired.slug} tem capa diferente; revisão manual obrigatória.`)
  }
  if (existing.author?.id && existing.author.id !== author.id) {
    throw new Error(`Post existente ${desired.slug} tem autor diferente; revisão manual obrigatória.`)
  }
  if (Array.isArray(existing.categories) && existing.categories.length && !existing.categories.some((item) => item.id === category.id)) {
    throw new Error(`Post existente ${desired.slug} tem categoria diferente; revisão manual obrigatória.`)
  }
  if (Array.isArray(existing.tags)) {
    const existingTags = existing.tags.map((tag) => normalizeIdentity(tag.name)).sort()
    const desiredTags = (desired.tags ?? []).map((tag) => normalizeIdentity(tag.name)).sort()
    if (JSON.stringify(existingTags) !== JSON.stringify(desiredTags)) {
      throw new Error(`Post existente ${desired.slug} tem tags diferentes; revisão manual obrigatória.`)
    }
  }
  if (existing.featured !== undefined && Boolean(existing.featured) !== Boolean(desired.featured)) {
    throw new Error(`Post existente ${desired.slug} tem featured diferente; revisão manual obrigatória.`)
  }
  if (!sameContent(existing.content, desiredContent)) {
    throw new Error(`Post existente ${desired.slug} tem conteúdo diferente; não será sobrescrito.`)
  }
}

function targetStateMatches(existing, status, scheduledFor) {
  if (!existing) return false
  if (status === 'DRAFT') return existing.status === 'DRAFT'
  if (status === 'PUBLISHED') return existing.status === 'PUBLISHED'
  if (status === 'SCHEDULED') {
    return existing.status === 'SCHEDULED' && new Date(existing.scheduledFor ?? 0).getTime() === new Date(scheduledFor).getTime()
  }
  return existing.status === 'ARCHIVED'
}

async function applyStatus(postId, status, scheduledFor, log) {
  if (status === 'DRAFT') {
    log('  status: DRAFT (nenhuma ação adicional)')
    return
  }
  if (status === 'PUBLISHED') {
    log(writesAllowed ? '  POST /blog/posts/:id/publish' : '  DRY RUN: faria POST /blog/posts/:id/publish')
    if (writesAllowed) await apiRequest(`/blog/posts/${encodeURIComponent(postId)}/publish`, { method: 'POST' })
    return
  }
  if (status === 'SCHEDULED') {
    if (!scheduledFor) throw new Error('Post SCHEDULED não possui scheduledFor.')
    if (new Date(scheduledFor) <= new Date()) throw new Error(`scheduledFor não está no futuro: ${scheduledFor}.`)
    log(writesAllowed ? `  POST /blog/posts/:id/schedule (${scheduledFor})` : `  DRY RUN: faria POST /blog/posts/:id/schedule (${scheduledFor})`)
    if (writesAllowed) {
      await apiRequest(`/blog/posts/${encodeURIComponent(postId)}/schedule`, { method: 'POST', body: { scheduledFor } })
    }
    return
  }

  throw new Error('ARCHIVED não possui transição segura disponível na API atual; exige tratamento manual/DB.')
}

async function loadManifest() {
  try {
    const text = await readFile(manifestPath, 'utf8')
    const parsed = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('manifest precisa ser um objeto')
    return parsed
  } catch (error) {
    if (error?.code === 'ENOENT') return {}
    throw new Error(`Manifest inválido em ${manifestPath}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function saveManifest(manifest) {
  if (!writesAllowed) throw new Error('Tentativa de gravar manifest fora do modo execute confirmado.')
  await mkdir(path.dirname(manifestPath), { recursive: true })
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
}

function manifestEntry(post, databaseId) {
  return {
    databaseId,
    slug: getMockSlug(post),
    migratedAt: new Date().toISOString(),
    historical: historicalFields(post),
  }
}

function printInventory(mocks) {
  console.log(`\nInventário carregado: ${mocks.posts.length} posts, ${mocks.authors.length} autores, ${mocks.categories.length} categorias e ${mocks.media.length} mídias.`)
  console.log(`Modo: ${mode.toUpperCase()} | Escritas permitidas: ${writesAllowed ? 'SIM' : 'NÃO'}`)
}

async function migratePost(post, realAuthors, realCategories, existingPosts, manifest) {
  const log = (message) => console.log(`[${post.id}] ${message}`)
  const slug = getMockSlug(post)
  const status = getStatus(post)
  const entry = manifest[post.id]

  if (entry?.databaseId) {
    if (entry.slug && entry.slug !== slug) throw new Error(`Manifest diverge do slug do mock ${post.id}.`)
    log(`SKIP: manifest aponta para ${entry.databaseId}.`)
    return { action: 'skip-manifest', databaseId: entry.databaseId }
  }

  const mockAuthor = post.author
  const mockCategory = post.category
  if (!mockAuthor || !mockCategory) throw new Error('Post sem autor ou categoria mockados.')
  const author = resolveAuthor(mockAuthor, realAuthors)
  const category = await resolveCategory(mockCategory, realCategories, log)
  const media = post.coverImage
  const coverImageUrl = await resolveCoverImage(media, log)
  const content = toTiptapDocument(post.content)
  const backendReadingTime = calculateBackendReadingTime(content)
  if (post.readingTimeMinutes !== backendReadingTime) {
    log(`aviso: readingTime mock=${post.readingTimeMinutes}, backend calculará=${backendReadingTime}.`)
  }

  const desired = {
    id: post.id,
    title: post.title,
    slug,
    summary: post.summary ?? '',
    scheduledFor: post.scheduledFor,
    tags: post.tags ?? [],
    featured: post.featured === true,
  }
  const bySlug = existingPosts.filter((item) => item.slug === slug)
  const byTitle = existingPosts.filter((item) => normalizeIdentity(item.title) === normalizeIdentity(post.title))
  if (byTitle.some((item) => item.slug !== slug)) {
    throw new Error(`Já existe post com o mesmo título e slug diferente de ${slug}.`)
  }

  let existing = bySlug[0]
  if (existing) {
    log(`post equivalente encontrado por slug: ${existing.id}`)
    const details = await fetchPostDetails(slug)
    verifyExistingPost(details, desired, content, coverImageUrl, author, category)
    if (targetStateMatches(details, status, post.scheduledFor)) {
      log('SKIP: conteúdo e status já conferidos.')
      if (writesAllowed) {
        manifest[post.id] = manifestEntry(post, details.id)
        await saveManifest(manifest)
      }
      return { action: 'skip-existing', databaseId: details.id }
    }

    if (details.status === 'PUBLISHED' && status !== 'PUBLISHED') {
      throw new Error(`Post existente ${slug} já está publicado; não será rebaixado.`)
    }
    log(`continuação segura de post existente ${details.id}: status atual=${details.status}, destino=${status}`)
    await applyStatus(details.id, status, post.scheduledFor, log)
    if (writesAllowed) {
      manifest[post.id] = manifestEntry(post, details.id)
      await saveManifest(manifest)
    }
    return { action: 'resume-existing', databaseId: details.id }
  }

  if (status === 'ARCHIVED') throw new Error('Post ARCHIVED não pode ser criado com segurança pela API atual.')
  const payload = buildPayload(post, content, author, category, coverImageUrl)
  log(`would POST /blog/posts com slug esperado=${slug}`)

  if (!writesAllowed) {
    log(`  DRY RUN payload: ${JSON.stringify(payload)}`)
    await applyStatus('__DRY_RUN_POST_ID__', status, post.scheduledFor, log)
    return { action: 'dry-run-create', databaseId: null }
  }

  const created = await apiRequest('/blog/posts', { method: 'POST', body: payload })
  if (!created?.id) throw new Error('POST /blog/posts não retornou id.')
  if (created.slug !== slug) {
    throw new Error(`API gerou slug ${created.slug ?? '(ausente)'} em vez de ${slug}; post ${created.id} ficou sem transição.`)
  }
  await applyStatus(created.id, status, post.scheduledFor, log)
  manifest[post.id] = manifestEntry(post, created.id)
  await saveManifest(manifest)
  return { action: 'created', databaseId: created.id }
}

async function main() {
  const mocks = loadMocks()
  const manifest = await loadManifest()
  printInventory(mocks)

  console.log('Carregando autores, categorias e posts existentes via GET...')
  const [realAuthors, realCategories, existingPosts] = await Promise.all([
    fetchAuthors(),
    fetchCategories(),
    fetchAllPosts(),
  ])

  const results = []
  for (const post of mocks.posts) {
    try {
      const result = await migratePost(post, realAuthors, realCategories, existingPosts, manifest)
      results.push({ mockId: post.id, ...result, ok: true })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[${post.id}] ABORTADO: ${message}`)
      results.push({ mockId: post.id, ok: false, error: message })
    }
  }

  console.log('\nResultado:')
  console.log(JSON.stringify({ mode, writesAllowed, manifestPath, results }, null, 2))
  if (results.some((result) => !result.ok)) process.exitCode = 1
}

export { isTiptapDocument, loadMocks, toTiptapDocument }

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) main().catch((error) => {
  console.error(`Migração interrompida: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
})
