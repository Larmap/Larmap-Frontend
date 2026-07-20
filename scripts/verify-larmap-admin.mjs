import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const port = 9337
const baseUrl = 'http://127.0.0.1:5173'
const artifactDir = new URL('../artifacts/admin-redesign/', import.meta.url)
await mkdir(artifactDir, { recursive: true })

const chrome = spawn(chromePath, [
  '--headless=new',
  `--remote-debugging-port=${port}`,
  '--user-data-dir=C:\\tmp\\larmap-admin-chrome-profile',
  '--no-first-run',
  '--disable-gpu',
  '--hide-scrollbars',
  'about:blank',
], { stdio: 'ignore' })

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
async function retry(task, attempts = 40) {
  for (let index = 0; index < attempts; index += 1) {
    try { return await task() } catch { await wait(150) }
  }
  throw new Error('Chrome DevTools não respondeu a tempo.')
}

const page = await retry(async () => {
  const response = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(`${baseUrl}/admin/login`)}`, { method: 'PUT' })
  if (!response.ok) throw new Error('Página não criada')
  return response.json()
})

const socket = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }) })
let sequence = 0
const pending = new Map()
const browserErrors = []
socket.addEventListener('message', async (event) => {
  const message = JSON.parse(typeof event.data === 'string' ? event.data : await event.data.text())
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id); pending.delete(message.id)
    if (message.error) reject(new Error(message.error.message)); else resolve(message.result)
  }
  if (message.method === 'Runtime.exceptionThrown') browserErrors.push(message.params.exceptionDetails.text)
})

function send(method, params = {}) {
  const id = ++sequence
  socket.send(JSON.stringify({ id, method, params }))
  return new Promise((resolve, reject) => pending.set(id, { reject, resolve }))
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { awaitPromise: true, expression, returnByValue: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
  return result.result.value
}

async function navigate(path) {
  await send('Page.navigate', { url: `${baseUrl}${path}` })
  await wait(900)
}

async function viewport(width, height) {
  await send('Emulation.setDeviceMetricsOverride', { deviceScaleFactor: 1, height, mobile: false, width })
  await wait(120)
}

async function screenshot(name) {
  const capture = await send('Page.captureScreenshot', { captureBeyondViewport: false, format: 'png' })
  await writeFile(new URL(`${name}.png`, artifactDir), Buffer.from(capture.data, 'base64'))
}

async function routeCheck(path, width, height, screenshotName) {
  await viewport(width, height)
  await navigate(path)
  const result = await evaluate(`(() => ({
    path: location.pathname,
    title: document.querySelector('h1')?.textContent?.trim() || '',
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    overflowElements: [...document.querySelectorAll('body *')].filter((element) => element.getBoundingClientRect().right > document.documentElement.clientWidth + 1).slice(0, 8).map((element) => ({ className: element.className, right: Math.round(element.getBoundingClientRect().right), tag: element.tagName })),
    unlabeledIconButtons: [...document.querySelectorAll('button')].filter((button) => !button.textContent.trim() && !button.getAttribute('aria-label') && !button.getAttribute('title')).length,
    primaryColor: getComputedStyle(document.querySelector('.admin-button--primary') || document.body).backgroundColor,
  }))()`)
  if (screenshotName) await screenshot(screenshotName)
  return { ...result, viewport: `${width}x${height}` }
}

try {
  await send('Page.enable')
  await send('Runtime.enable')
  await navigate('/admin/login')
  await evaluate(`localStorage.setItem('larmap.authToken', 'local-admin-verification'); localStorage.setItem('larmap.company', JSON.stringify({ id: 'company-local', name: 'LarMap', email: 'admin@larmap.local' })); localStorage.setItem('larmap.user', JSON.stringify({ id: 'user-local', name: 'Skiner Bold', email: 'admin@larmap.local', role: 'admin', companyId: 'company-local', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));`)

  const routes = []
  routes.push(await routeCheck('/admin/blog', 1440, 900, 'dashboard-1440'))
  routes.push(await routeCheck('/admin/blog/posts', 1024, 820, 'publicacoes-1024'))
  routes.push(await routeCheck('/admin/blog/categories', 768, 820))
  routes.push(await routeCheck('/admin/blog/media', 768, 820, 'midias-768'))
  routes.push(await routeCheck('/admin/blog/posts/new', 390, 844, 'nova-publicacao-390'))
  routes.push(await routeCheck('/admin/blog/posts/post-financiamento-imovel-2026/edit', 1440, 900))

  const editorChecks = await evaluate(`(() => ({
    titleValue: document.querySelector('.admin-title-field input')?.value || '',
    toolbarButtons: document.querySelectorAll('.blog-editor__toolbar button').length,
    toolbarVisible: Boolean(document.querySelector('.blog-editor__toolbar')),
    stickySidebar: getComputedStyle(document.querySelector('.admin-editor-sidebar')).position,
    summaryLimit: document.querySelector('.admin-summary-field textarea')?.maxLength,
    layout: ['.blog-admin-shell', '.blog-admin-workspace', '.blog-admin-content', '.admin-editor-layout', '.admin-editor-main', '.admin-editor-sidebar', '.blog-editor', '.blog-editor__toolbar'].map((selector) => { const element = document.querySelector(selector); const rect = element?.getBoundingClientRect(); return { selector, left: Math.round(rect?.left || 0), right: Math.round(rect?.right || 0), width: Math.round(rect?.width || 0), minWidth: element ? getComputedStyle(element).minWidth : '', grid: element ? getComputedStyle(element).gridTemplateColumns : '' } }),
  }))()`)

  await evaluate(`[...document.querySelectorAll('button')].find((button) => button.textContent.includes('Pré-visualizar'))?.click()`)
  await wait(80)
  const previewModal = await evaluate(`Boolean(document.querySelector('.admin-preview-dialog'))`)
  await evaluate(`document.querySelector('.admin-preview-dialog [aria-label="Fechar"]')?.click()`)
  await evaluate(`[...document.querySelectorAll('button')].find((button) => button.textContent.includes('Escolher na biblioteca'))?.click()`)
  await wait(80)
  const mediaPicker = await evaluate(`({ open: Boolean(document.querySelector('.admin-media-picker')), images: document.querySelectorAll('.admin-media-picker__grid button').length })`)
  await evaluate(`document.querySelector('.admin-media-picker [aria-label="Fechar"]')?.click()`)

  await navigate('/admin/blog/posts')
  await evaluate(`document.querySelector('.blog-admin-table tbody .admin-icon-button')?.click()`)
  await wait(60)
  await evaluate(`document.querySelector('.admin-actions-menu__danger')?.click()`)
  await wait(60)
  const deleteDialog = await evaluate(`document.querySelector('.admin-dialog h2')?.textContent?.trim() || ''`)
  await evaluate(`[...document.querySelectorAll('.admin-dialog button')].find((button) => button.textContent.includes('Cancelar'))?.click()`)

  await navigate('/admin/blog/media')
  await evaluate(`[...document.querySelectorAll('button')].find((button) => button.textContent.includes('Enviar arquivo'))?.click()`)
  await wait(60)
  const uploadDialog = await evaluate(`document.querySelector('.admin-upload-dialog')?.innerText.includes('Arraste os arquivos para esta área') || false`)
  await evaluate(`document.querySelector('.admin-upload-dialog [aria-label="Fechar"]')?.click()`)
  const interactionChecks = { deleteDialog, mediaPicker, previewModal, uploadDialog }

  await navigate('/admin/blog')
  await evaluate(`document.querySelector('.admin-user-menu__trigger')?.click()`)
  await wait(80)
  const userMenu = await evaluate(`[...document.querySelectorAll('.admin-user-menu__popover [role="menuitem"]')].map((item) => item.textContent.trim())`)

  await navigate('/admin/blog/posts/new')
  await evaluate(`(() => {
    const set = (element, value) => {
      const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value)
      element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }))
      element.dispatchEvent(new Event('change', { bubbles: true }))
    }
    set(document.querySelector('.admin-title-field input'), 'Teste editorial automatizado')
    set(document.querySelector('.admin-summary-field textarea'), 'Resumo criado para validar o fluxo editorial local.')
  })()`)
  await wait(120)
  await evaluate(`[...document.querySelectorAll('button')].find((button) => button.textContent.includes('Salvar rascunho'))?.click()`)
  await wait(700)
  const creation = await evaluate(`({ path: location.pathname, toast: document.querySelector('.admin-toast')?.textContent?.trim() || '', created: document.body.innerText.includes('Teste editorial automatizado') })`)

  await navigate('/admin/blog')
  await viewport(390, 844)
  await evaluate(`document.querySelector('.blog-admin-topbar__menu')?.click()`)
  await wait(80)
  const mobileDrawer = await evaluate(`document.querySelector('.blog-admin-sidebar')?.classList.contains('blog-admin-sidebar--open')`)

  await navigate('/blog')
  const publicRoute = await evaluate(`({ path: location.pathname, hasAdminShell: Boolean(document.querySelector('.blog-admin-shell')), hasPublicHeader: Boolean(document.querySelector('header')) })`)

  const report = { browserErrors, creation, editorChecks, interactionChecks, mobileDrawer, publicRoute, routes, userMenu }
  await writeFile(new URL('verification.json', artifactDir), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} finally {
  socket.close()
  chrome.kill()
}
