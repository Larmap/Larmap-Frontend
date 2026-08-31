#!/usr/bin/env node

import assert from 'node:assert/strict'
import { isTiptapDocument, loadMocks, toTiptapDocument } from './migrate-blog-mocks.mjs'

const supportedNodes = new Set([
  'blockquote',
  'bulletList',
  'codeBlock',
  'doc',
  'hardBreak',
  'heading',
  'horizontalRule',
  'image',
  'listItem',
  'orderedList',
  'paragraph',
  'table',
  'tableCell',
  'tableHeader',
  'tableRow',
  'taskItem',
  'taskList',
  'text',
  'youtube',
])

const supportedMarks = new Set([
  'bold',
  'code',
  'highlight',
  'italic',
  'link',
  'strike',
  'textStyle',
  'underline',
])

function walk(node, nodes, marks) {
  nodes.add(node.type)
  for (const mark of node.marks ?? []) marks.add(mark.type)
  for (const child of node.content ?? []) walk(child, nodes, marks)
}

function assertSupported(document) {
  assert.equal(isTiptapDocument(document), true)
  const nodes = new Set()
  const marks = new Set()
  walk(document, nodes, marks)
  for (const node of nodes) assert.equal(supportedNodes.has(node), true, `node não suportado: ${node}`)
  for (const mark of marks) assert.equal(supportedMarks.has(mark), true, `mark não suportado: ${mark}`)
}

function findNode(node, type) {
  if (node.type === type) return node
  for (const child of node.content ?? []) {
    const found = findNode(child, type)
    if (found) return found
  }
  return undefined
}

function findMark(node, type) {
  const mark = (node.marks ?? []).find((item) => item.type === type)
  if (mark) return mark
  for (const child of node.content ?? []) {
    const found = findMark(child, type)
    if (found) return found
  }
  return undefined
}

const mocks = loadMocks()
assert.equal(mocks.posts.length, 8)

for (const post of mocks.posts) assertSupported(toTiptapDocument(post.content))

const fixture = toTiptapDocument(`
  <h2>Heading</h2>
  <p><strong>Bold</strong> <em>Italic</em> <a href="https://example.com" target="_blank" rel="noopener noreferrer">Link</a></p>
  <ol><li>Ordered</li></ol>
  <ul><li>Unordered</li></ul>
  <p><img src="https://example.com/image.jpg" alt="Imagem" title="Título" /></p>
`)
assertSupported(fixture)
assert.equal(fixture.content.some((node) => node.type === 'heading'), true)
assert.equal(fixture.content.some((node) => node.type === 'orderedList'), true)
assert.equal(fixture.content.some((node) => node.type === 'bulletList'), true)
const image = findNode(fixture, 'image')
assert.deepEqual(image?.attrs, { src: 'https://example.com/image.jpg', alt: 'Imagem', title: 'Título' })
assert.deepEqual(findMark(fixture, 'link')?.attrs, {
  href: 'https://example.com',
  rel: 'noopener noreferrer',
  target: '_blank',
})
assert.equal(findMark(toTiptapDocument('<p><a href="javascript:alert(1)">Unsafe</a></p>'), 'link'), undefined)
assert.equal(toTiptapDocument('').content[0].type, 'paragraph')
assert.equal(toTiptapDocument(null).content[0].type, 'paragraph')

console.log(`Conteúdo compatível: ${mocks.posts.length} mocks + fixture de nodes/marks validado.`)
