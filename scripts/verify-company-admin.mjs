import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const artifactDir = fileURLToPath(new URL('../artifacts/company-admin-redesign/', import.meta.url))
const apiPort = 4193
const frontendPort = 5193
const chromePort = 9447
const baseUrl = `http://127.0.0.1:${frontendPort}`
const apiBaseUrl = `http://127.0.0.1:${apiPort}/api`
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))
let failPropertyPerformance = false
let failProperties = false
let compactAuthCompany = false
let lastCompanyPatch = null

await mkdir(artifactDir, { recursive: true })

let company = {
  id: 'company-demo',
  name: 'Imobiliária Horizonte',
  email: 'contato@horizonte.local',
  phone: '(11) 3333-4444',
  whatsapp: '(11) 99999-1111',
  logoUrl: `${baseUrl}/assets/icon-larmap-1.png`,
  brandImageUrl: `${baseUrl}/assets/icon-larmap-1.png`,
  headquartersStreet: 'Avenida das Nações',
  headquartersNumber: '1200',
  headquartersComplement: '8º andar',
  headquartersNeighborhood: 'Centro',
  headquartersCity: 'São Paulo',
  headquartersState: 'SP',
  headquartersPostalCode: '01000-000',
  headquartersAddress: 'Avenida das Nações, 1200, Centro, São Paulo, SP, 01000-000',
  createdAt: '2025-01-10T12:00:00.000Z',
  updatedAt: '2026-08-19T12:00:00.000Z',
}

const authUser = {
  id: 'user-demo',
  name: 'Marina Costa',
  email: 'admin@demo.local',
  companyId: company.id,
  accessRole: 'COMPANY',
  permissions: ['company:manage'],
}

function getAuthCompany() {
  if (!compactAuthCompany) return company
  return {
    id: company.id,
    logoUrl: company.logoUrl,
    name: company.name,
    publicSlug: 'imobiliaria-horizonte',
  }
}

const properties = [
  { id: 'p1', title: 'Apartamento Jardins', latitude: -23.56, longitude: -46.65, status: 'AVAILABLE', city: 'São Paulo', companyId: company.id, createdAt: '2026-08-18T10:00:00.000Z', updatedAt: '2026-08-18T10:00:00.000Z' },
  { id: 'p2', title: 'Casa Vila Madalena', latitude: -23.55, longitude: -46.69, status: 'NEGOTIATING', city: 'São Paulo', companyId: company.id, createdAt: '2026-08-17T10:00:00.000Z', updatedAt: '2026-08-17T10:00:00.000Z' },
  { id: 'p3', title: 'Studio Pinheiros', latitude: -23.56, longitude: -46.68, status: 'AVAILABLE', city: 'São Paulo', companyId: company.id, createdAt: '2026-08-16T10:00:00.000Z', updatedAt: '2026-08-16T10:00:00.000Z' },
  { id: 'p4', title: 'Cobertura Moema', latitude: -23.60, longitude: -46.66, status: 'SOLD', city: 'São Paulo', companyId: company.id, createdAt: '2026-08-15T10:00:00.000Z', updatedAt: '2026-08-15T10:00:00.000Z' },
]

const users = [
  { id: 'u1', name: 'Ana Lima', email: 'ana@demo.local', phone: '', role: 'agent', companyId: company.id, createdAt: '2026-01-01T10:00:00.000Z', updatedAt: '2026-01-01T10:00:00.000Z' },
  { id: 'u2', name: 'Caio Alves', email: 'caio@demo.local', phone: '', role: 'agent', companyId: company.id, createdAt: '2026-01-01T10:00:00.000Z', updatedAt: '2026-01-01T10:00:00.000Z' },
  { id: 'u3', name: 'Marina Costa', email: 'admin@demo.local', phone: '', role: 'manager', companyId: company.id, createdAt: '2026-01-01T10:00:00.000Z', updatedAt: '2026-01-01T10:00:00.000Z' },
]

const leads = [
  { id: 'l1', propertyId: 'p1', propertyTitle: 'Apartamento Jardins', interestedName: 'Rafael Souza', interestedEmail: 'rafael@example.test', agentName: 'Ana Lima', status: 'NEW', viewed: false, createdAt: '2026-08-19T12:00:00.000Z', updatedAt: '2026-08-19T12:00:00.000Z' },
  { id: 'l2', propertyId: 'p2', propertyTitle: 'Casa Vila Madalena', interestedName: 'Paula Freitas', interestedEmail: 'paula@example.test', agentName: 'Caio Alves', status: 'IN_SERVICE', viewed: true, createdAt: '2026-08-18T12:00:00.000Z', updatedAt: '2026-08-18T12:00:00.000Z' },
  { id: 'l3', propertyId: 'p3', propertyTitle: 'Studio Pinheiros', interestedName: 'João Melo', interestedEmail: 'joao@example.test', agentName: 'Ana Lima', status: 'NEGOTIATING', viewed: true, createdAt: '2026-08-17T12:00:00.000Z', updatedAt: '2026-08-17T12:00:00.000Z' },
]

const negotiations = [
  { id: 'n1', propertyId: 'p2', propertyTitle: 'Casa Vila Madalena', status: 'PROPOSAL', startedAt: '2026-08-10T12:00:00.000Z' },
  { id: 'n2', propertyId: 'p3', propertyTitle: 'Studio Pinheiros', status: 'FOLLOW_UP', startedAt: '2026-08-11T12:00:00.000Z' },
  { id: 'n3', propertyId: 'p4', propertyTitle: 'Cobertura Moema', status: 'CLOSED', startedAt: '2026-08-01T12:00:00.000Z' },
]

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json; charset=utf-8',
  })
  response.end(JSON.stringify(payload))
}

async function readJson(request) {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  if (!chunks.length) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

const apiServer = createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    sendJson(response, 204, null)
    return
  }

  const url = new URL(request.url ?? '/', apiBaseUrl)

  if (request.method === 'POST' && url.pathname === '/api/auth/login') {
    const body = await readJson(request)
    if (body.email === 'network@demo.local') {
      request.socket.destroy()
      return
    }

    if (body.email !== 'admin@demo.local' || body.password !== 'testepainel') {
      sendJson(response, 401, {
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      })
      return
    }

    sendJson(response, 200, { success: true, data: { token: 'local-admin-token', user: authUser, company: getAuthCompany() } })
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/auth/me') {
    sendJson(response, 200, { success: true, data: { user: authUser, company: getAuthCompany() } })
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/properties') {
    if (failProperties) {
      sendJson(response, 500, { success: false, error: { code: 'TEMPORARY_ERROR', message: 'Temporary error' } })
      return
    }
    sendJson(response, 200, { success: true, data: properties })
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/users') {
    sendJson(response, 200, { success: true, data: { users, total: users.length, pages: 1, currentPage: 1, itemsPerPage: 100 } })
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/leads') {
    sendJson(response, 200, { success: true, data: leads })
    return
  }

  if (request.method === 'PATCH' && url.pathname.startsWith('/api/leads/')) {
    const body = await readJson(request)
    const lead = leads.find((item) => url.pathname.endsWith(item.id)) ?? leads[0]
    Object.assign(lead, body)
    sendJson(response, 200, { success: true, data: lead })
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/negotiations') {
    sendJson(response, 200, { success: true, data: negotiations })
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/performance/agents') {
    sendJson(response, 200, { success: true, data: [
      { agentId: 'u1', agentName: 'Ana Lima', activeProperties: 2, leads: 2, negotiations: 1, closedDeals: 1, responseRate: 92 },
      { agentId: 'u2', agentName: 'Caio Alves', activeProperties: 1, leads: 1, negotiations: 1, closedDeals: 0, responseRate: 86 },
    ] })
    return
  }

  if (request.method === 'GET' && url.pathname === '/api/performance/properties') {
    if (failPropertyPerformance) {
      sendJson(response, 500, { success: false, error: { code: 'TEMPORARY_ERROR', message: 'Temporary error' } })
      return
    }
    sendJson(response, 200, { success: true, data: [
      { propertyId: 'p1', propertyTitle: 'Apartamento Jardins', views: 482, leads: 1, negotiations: 0 },
      { propertyId: 'p2', propertyTitle: 'Casa Vila Madalena', views: 367, leads: 1, negotiations: 1 },
      { propertyId: 'p3', propertyTitle: 'Studio Pinheiros', views: 251, leads: 1, negotiations: 1 },
    ] })
    return
  }

  if (request.method === 'PATCH' && url.pathname === '/api/companies/me') {
    lastCompanyPatch = await readJson(request)
    company = { ...company, ...lastCompanyPatch, updatedAt: new Date().toISOString() }
    sendJson(response, 200, { success: true, data: company })
    return
  }

  sendJson(response, 404, { success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } })
})

await new Promise((resolve) => apiServer.listen(apiPort, '127.0.0.1', resolve))

const viteOutput = []
const vite = spawn(
  process.execPath,
  ['./node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', String(frontendPort), '--strictPort'],
  {
    cwd: projectRoot,
    env: { ...process.env, VITE_API_URL: apiBaseUrl },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  },
)
vite.stdout.on('data', (chunk) => viteOutput.push(chunk.toString()))
vite.stderr.on('data', (chunk) => viteOutput.push(chunk.toString()))

async function retry(task, attempts = 50) {
  let lastError
  for (let index = 0; index < attempts; index += 1) {
    try {
      return await task()
    } catch (error) {
      lastError = error
      await wait(160)
    }
  }
  throw lastError
}

await retry(async () => {
  const response = await fetch(baseUrl)
  if (!response.ok) throw new Error('Vite ainda não respondeu.')
})

const chromeProfile = await mkdtemp(join(tmpdir(), 'larmap-company-admin-'))
const chrome = spawn(chromePath, [
  '--headless=new',
  `--remote-debugging-port=${chromePort}`,
  `--user-data-dir=${chromeProfile}`,
  '--no-first-run',
  '--disable-gpu',
  '--hide-scrollbars',
  'about:blank',
], { stdio: 'ignore', windowsHide: true })

const page = await retry(async () => {
  const response = await fetch(`http://127.0.0.1:${chromePort}/json/new?${encodeURIComponent(`${baseUrl}/admin/login`)}`, { method: 'PUT' })
  if (!response.ok) throw new Error('Chrome ainda não respondeu.')
  return response.json()
})

const socket = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})

let sequence = 0
const pending = new Map()
const browserErrors = []
socket.addEventListener('message', async (event) => {
  const message = JSON.parse(typeof event.data === 'string' ? event.data : await event.data.text())
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id)
    pending.delete(message.id)
    if (message.error) reject(new Error(message.error.message))
    else resolve(message.result)
  }
  if (message.method === 'Runtime.exceptionThrown') {
    browserErrors.push(message.params.exceptionDetails.text)
  }
})

function send(method, params = {}) {
  const id = ++sequence
  socket.send(JSON.stringify({ id, method, params }))
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    awaitPromise: true,
    expression,
    returnByValue: true,
    userGesture: true,
  })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
  return result.result.value
}

async function waitFor(expression, attempts = 45) {
  return retry(async () => {
    const value = await evaluate(expression)
    if (!value) throw new Error(`Condição ainda não atendida: ${expression}`)
    return value
  }, attempts)
}

async function navigate(path) {
  await send('Page.navigate', { url: `${baseUrl}${path}` })
  await waitFor(`document.readyState === 'complete'`)
  await wait(180)
}

async function viewport(width, height) {
  await send('Emulation.setDeviceMetricsOverride', { deviceScaleFactor: 1, height, mobile: width < 620, width })
  await wait(80)
}

async function screenshot(name) {
  const capture = await send('Page.captureScreenshot', { captureBeyondViewport: false, format: 'png' })
  await writeFile(join(artifactDir, `${name}.png`), Buffer.from(capture.data, 'base64'))
}

async function setInput(selector, value) {
  await evaluate(`(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!(element instanceof HTMLInputElement)) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(element, ${JSON.stringify(value)});
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`)
}

async function submitLogin(email, password) {
  await setInput('#admin-login-email', email)
  await setInput('#admin-login-password', password)
  await evaluate(`document.querySelector('.admin-login__form')?.requestSubmit()`)
}

async function attachCanvasLogo({ fileName, height, mimeType, width }) {
  return evaluate(`(async () => {
    const input = document.querySelector('.admin-logo-file-input');
    if (!(input instanceof HTMLInputElement)) return null;
    const canvas = document.createElement('canvas');
    canvas.width = ${width};
    canvas.height = ${height};
    const context = canvas.getContext('2d');
    context.fillStyle = '#f7fbfc';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#25834a';
    context.fillRect(8, 8, Math.max(10, canvas.width * 0.36), canvas.height - 16);
    context.fillStyle = '#0879ba';
    context.fillRect(Math.max(20, canvas.width * 0.43), 8, Math.max(10, canvas.width * 0.5), canvas.height - 16);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, ${JSON.stringify(mimeType)}, 0.9));
    const file = new File([blob], ${JSON.stringify(fileName)}, { type: ${JSON.stringify(mimeType)} });
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return { name: file.name, size: file.size, type: file.type };
  })()`)
}

async function attachSyntheticFile({ fileName, mimeType, size }) {
  return evaluate(`(() => {
    const input = document.querySelector('.admin-logo-file-input');
    if (!(input instanceof HTMLInputElement)) return false;
    const file = new File([new Uint8Array(${size})], ${JSON.stringify(fileName)}, { type: ${JSON.stringify(mimeType)} });
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`)
}

async function getLayoutCheck(viewportLabel) {
  return evaluate(`(() => {
    const documentElement = document.documentElement;
    const topbar = document.querySelector('.admin-topbar')?.getBoundingClientRect();
    const content = document.querySelector('.admin-content')?.getBoundingClientRect();
    const sidebarLogo = document.querySelector('.admin-logo .brand-logo__icon')?.getBoundingClientRect();
    return {
      viewport: ${JSON.stringify(viewportLabel)},
      horizontalOverflow: documentElement.scrollWidth > documentElement.clientWidth,
      scrollWidth: documentElement.scrollWidth,
      clientWidth: documentElement.clientWidth,
      contentStartsAfterHeader: !topbar || !content || content.top >= topbar.bottom - 1,
      sidebarHasWordmark: Boolean(document.querySelector('.admin-logo .brand-logo__name')),
      sidebarLogo: sidebarLogo ? { height: Math.round(sidebarLogo.height), width: Math.round(sidebarLogo.width) } : null,
      headerHeight: topbar ? Math.round(topbar.height) : null,
      sidebarPosition: getComputedStyle(document.querySelector('.admin-sidebar')).position,
      unlabeledIconButtons: [...document.querySelectorAll('button')].filter((button) => !button.textContent.trim() && !button.getAttribute('aria-label') && !button.getAttribute('title')).length,
    };
  })()`)
}

const report = {
  browserErrors,
  dashboardError: {},
  fileUpload: {},
  layout: [],
  login: {},
  menus: {},
  settings: {},
  screenshots: [],
}

try {
  await send('Page.enable')
  await send('Runtime.enable')

  await viewport(1366, 768)
  await navigate('/admin/login')
  await screenshot('login-1366x768')
  report.screenshots.push('login-1366x768.png')

  await submitLogin('nobody@demo.local', 'senhaerrada')
  report.login.invalid = await waitFor(`document.querySelector('#admin-login-error')?.textContent?.trim()`)

  await submitLogin('admin@demo.local', 'testepainel')
  await waitFor(`location.pathname === '/admin/dashboard' && document.querySelectorAll('.admin-dashboard-metric').length === 4`)
  report.login.validDestination = await evaluate('location.pathname')

  for (const [width, height, name] of [
    [1366, 768, 'dashboard-1366x768'],
    [1440, 900, 'dashboard-1440x900'],
    [1920, 1080, 'dashboard-1920x1080'],
    [768, 1024, 'dashboard-tablet-768x1024'],
    [390, 844, 'dashboard-mobile-390x844'],
  ]) {
    await viewport(width, height)
    await wait(100)
    await screenshot(name)
    report.screenshots.push(`${name}.png`)
    report.layout.push(await getLayoutCheck(`${width}x${height}`))
  }

  await evaluate(`document.querySelector('.admin-menu-toggle')?.click()`)
  await waitFor(`document.querySelector('.admin-sidebar')?.classList.contains('admin-sidebar--open')`)
  await wait(240)
  report.settings.mobileDrawer = await evaluate(`({ expanded: document.querySelector('.admin-menu-toggle')?.getAttribute('aria-expanded'), dialog: document.querySelector('.admin-sidebar')?.getAttribute('role') })`)
  await screenshot('dashboard-mobile-drawer-390x844')
  report.screenshots.push('dashboard-mobile-drawer-390x844.png')
  await evaluate(`document.querySelector('.admin-sidebar__close')?.click()`)
  await wait(240)
  report.settings.closedDrawer = await evaluate(`({
    visibility: getComputedStyle(document.querySelector('.admin-sidebar')).visibility,
    firstLinkVisibility: getComputedStyle(document.querySelector('.admin-sidebar a')).visibility,
  })`)

  await viewport(1440, 900)
  await navigate('/admin/dashboard')
  await evaluate(`document.querySelector('.admin-account-menu__trigger')?.click()`)
  await waitFor(`Boolean(document.querySelector('.admin-account-menu__popover'))`)
  report.menus.account = await evaluate(`[...document.querySelectorAll('.admin-account-menu__popover [role="menuitem"]')].map((item) => item.textContent.trim())`)
  await evaluate(`document.querySelector('.admin-account-menu__trigger')?.click()`)
  await evaluate(`document.querySelector('.admin-notification')?.click()`)
  await waitFor(`Boolean(document.querySelector('.admin-notification-menu'))`)
  report.menus.notifications = await evaluate(`({ dialog: document.querySelector('.admin-notification-menu')?.getAttribute('role'), items: document.querySelectorAll('.admin-notification-item').length })`)
  await evaluate(`document.querySelector('.admin-notification-menu__close')?.click()`)

  failPropertyPerformance = true
  await evaluate(`document.querySelector('.admin-dashboard-refresh')?.click()`)
  report.dashboardError.message = await waitFor(`document.querySelector('.admin-data-notice')?.textContent?.includes('desempenho dos imóveis') && document.querySelector('.admin-data-notice')?.textContent?.trim()`)
  failPropertyPerformance = false
  await evaluate(`document.querySelector('.admin-data-notice__retry')?.click()`)
  await waitFor(`!document.querySelector('.admin-data-notice')`)
  report.dashboardError.retryCleared = true

  await navigate('/admin/configuracoes')
  await waitFor(`Boolean(document.querySelector('.admin-company-form'))`)
  await screenshot('settings-1440x900')
  report.screenshots.push('settings-1440x900.png')

  await evaluate(`[...document.querySelectorAll('.admin-logo-source-tab')].find((button) => button.textContent.includes('Enviar arquivo'))?.click()`)
  await attachCanvasLogo({ fileName: 'logo-horizontal.png', height: 160, mimeType: 'image/png', width: 720 })
  await waitFor(`Boolean(document.querySelector('.admin-logo-preview-card__image img'))`)
  report.fileUpload.pngHorizontal = await evaluate(`(() => {
    const image = document.querySelector('.admin-logo-preview-card__image img');
    return { naturalHeight: image.naturalHeight, naturalWidth: image.naturalWidth, objectFit: getComputedStyle(image).objectFit };
  })()`)

  await attachCanvasLogo({ fileName: 'logo-vertical.jpeg', height: 720, mimeType: 'image/jpeg', width: 180 })
  await wait(120)
  report.fileUpload.jpegVertical = await evaluate(`(() => {
    const image = document.querySelector('.admin-logo-preview-card__image img');
    return { naturalHeight: image.naturalHeight, naturalWidth: image.naturalWidth, objectFit: getComputedStyle(image).objectFit };
  })()`)

  await attachSyntheticFile({ fileName: 'logo.gif', mimeType: 'image/gif', size: 24 })
  report.fileUpload.invalid = await waitFor(`document.querySelector('.admin-field-error')?.textContent?.trim()`)

  await attachSyntheticFile({ fileName: 'logo.png', mimeType: 'image/png', size: 5 * 1024 * 1024 + 1 })
  report.fileUpload.tooLarge = await waitFor(`document.querySelector('.admin-field-error')?.textContent?.includes('5 MB') && document.querySelector('.admin-field-error')?.textContent?.trim()`)

  await attachCanvasLogo({ fileName: 'logo-salvar.jpg', height: 240, mimeType: 'image/jpeg', width: 480 })
  await wait(120)
  await evaluate(`document.querySelector('.admin-company-form')?.requestSubmit()`)
  report.fileUpload.blockedWithoutApi = await waitFor(`document.querySelector('.notice--error')?.textContent?.trim()`)

  await evaluate(`[...document.querySelectorAll('.admin-logo-source-tab')].find((button) => button.textContent.includes('Informar URL'))?.click()`)
  await setInput('.admin-company-form input[autocomplete="organization"]', 'Imobiliária Horizonte Atualizada')
  await evaluate(`document.querySelector('.admin-company-form')?.requestSubmit()`)
  report.settings.fileToUrlAllowsSave = await waitFor(`document.querySelector('.notice:not(.notice--error)')?.textContent?.includes('atualizados') && document.querySelector('.notice:not(.notice--error)')?.textContent?.trim()`)
  await setInput('.admin-logo-url-panel input', `${baseUrl}/assets/icon-larmap.png`)
  await waitFor(`document.querySelector('.admin-logo-preview-card__image img')?.getAttribute('src')?.includes('icon-larmap.png')`)
  await evaluate(`document.querySelector('.admin-company-form')?.requestSubmit()`)
  report.settings.urlSave = await waitFor(`document.querySelector('.notice:not(.notice--error)')?.textContent?.trim()`)

  await evaluate(`[...document.querySelectorAll('.admin-logo-remove')][0]?.click()`)
  await wait(80)
  await evaluate(`document.querySelector('.admin-company-form')?.requestSubmit()`)
  report.settings.logoRemovalFeedback = await waitFor(`document.querySelector('.notice:not(.notice--error)')?.textContent?.includes('Logo removido') && document.querySelector('.notice:not(.notice--error)')?.textContent?.trim()`)
  report.settings.logoRemoved = await evaluate(`({ preview: Boolean(document.querySelector('.admin-logo-preview-card__image img')), headerUsesFallback: !document.querySelector('.admin-account-menu__avatar img') })`)

  await viewport(390, 844)
  await screenshot('settings-mobile-390x844')
  report.screenshots.push('settings-mobile-390x844.png')
  report.layout.push(await getLayoutCheck('settings 390x844'))

  compactAuthCompany = true
  lastCompanyPatch = null
  await evaluate(`localStorage.clear()`)
  await navigate('/admin/login')
  await submitLogin('admin@demo.local', 'testepainel')
  await waitFor(`location.pathname === '/admin/dashboard'`)
  await navigate('/admin/configuracoes')
  await waitFor(`Boolean(document.querySelector('.admin-profile-data-note'))`)
  const savedCompanyEmail = company.email
  const compactProfileSafetyNote = await evaluate(`document.querySelector('.admin-profile-data-note')?.textContent?.trim()`)
  await setInput('.admin-company-form input[autocomplete="organization"]', 'Imobiliária Horizonte Segura')
  await evaluate(`document.querySelector('.admin-company-form')?.requestSubmit()`)
  await waitFor(`Boolean(${JSON.stringify(true)}) && document.querySelector('.notice:not(.notice--error)')?.textContent?.includes('atualizados')`)
  report.settings.compactProfile = {
    patchKeys: Object.keys(lastCompanyPatch ?? {}).sort(),
    preservedBackendEmail: company.email === savedCompanyEmail,
    safetyNote: compactProfileSafetyNote,
  }

  failProperties = true
  await evaluate(`localStorage.clear()`)
  await navigate('/admin/login')
  await submitLogin('admin@demo.local', 'testepainel')
  await waitFor(`location.pathname === '/admin/dashboard' && document.querySelector('.admin-data-notice')?.textContent?.includes('carregar os imóveis')`)
  report.dashboardError.initialPropertiesFailure = await evaluate(`(() => {
    const card = [...document.querySelectorAll('.admin-dashboard-metric')].find((item) => item.textContent.includes('Imóveis cadastrados'));
    return {
      metric: card?.querySelector('strong')?.textContent?.trim(),
      unavailableState: [...document.querySelectorAll('.admin-dashboard-empty strong')].some((item) => item.textContent.includes('temporariamente indisponíveis')),
    };
  })()`)
  failProperties = false

  const normalBrowserErrors = [...browserErrors]
  await evaluate(`localStorage.clear()`)
  await navigate('/admin/login')
  await submitLogin('network@demo.local', 'qualquersenha')
  report.login.network = await waitFor(`document.querySelector('#admin-login-error')?.textContent?.trim()`)
  report.browserErrorsBeforeExpectedNetworkFailure = normalBrowserErrors

  const assert = (condition, message) => {
    if (!condition) throw new Error(`Falha na verificação do admin: ${message}`)
  }
  assert(normalBrowserErrors.length === 0, 'houve exceção inesperada no navegador')
  assert(report.layout.every((item) => !item.horizontalOverflow), 'há overflow horizontal')
  assert(report.layout.every((item) => item.contentStartsAfterHeader), 'há conteúdo atrás do header')
  assert(report.layout.every((item) => !item.sidebarHasWordmark), 'a sidebar contém o wordmark')
  assert(report.layout.every((item) => item.unlabeledIconButtons === 0), 'há botão de ícone sem nome acessível')
  assert(report.settings.closedDrawer.visibility === 'hidden', 'o drawer fechado continua focável/visível')
  assert(report.dashboardError.initialPropertiesFailure.metric === '—', 'falha inicial foi exibida como zero')
  assert(report.dashboardError.initialPropertiesFailure.unavailableState, 'faltou estado indisponível')
  assert(report.settings.compactProfile.patchKeys.join(',') === 'name', 'o DTO compacto enviou campos desconhecidos')
  assert(report.settings.compactProfile.preservedBackendEmail, 'o DTO compacto apagou o e-mail salvo')
  assert(report.login.invalid === 'E-mail ou senha incorretos.', 'erro de credenciais não foi normalizado')
  assert(report.login.network.startsWith('Não foi possível conectar ao LarMap.'), 'erro de rede não foi normalizado')
  assert(report.fileUpload.pngHorizontal.objectFit === 'contain', 'preview horizontal não usa contain')
  assert(report.fileUpload.jpegVertical.objectFit === 'contain', 'preview vertical não usa contain')
  assert(report.settings.logoRemovalFeedback === 'Logo removido.', 'feedback de remoção do logo está incorreto')

  await writeFile(join(artifactDir, 'verification.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} finally {
  socket.close()
  chrome.kill()
  vite.kill()
  await new Promise((resolve) => apiServer.close(resolve))
}
