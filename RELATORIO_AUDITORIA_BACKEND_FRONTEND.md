# Relatorio de Auditoria Backend Frontend

Data da auditoria: 2026-05-24  
Projeto: Smartmap/LarMap Frontend  
Backend oficial: `https://smartmap-backend.onrender.com`

Restricao operacional adicionada: "Sou responsável apenas pelo frontend e não tenho acesso ao backend."

Com essa restricao, a estrategia de correcao deve priorizar ajustes no frontend, Vite e Netlify, evitando depender de mudancas no servidor Render. O objetivo passa a ser impedir que o navegador chame diretamente `https://smartmap-backend.onrender.com`, fazendo o app usar sempre caminhos relativos em `/api/...`.

## Visao geral da arquitetura

O frontend e uma aplicacao React com Vite e React Router usando `BrowserRouter`.

A integracao com o backend proprio esta concentrada em `src/api/client.ts`. Nao ha uso de `axios`; o cliente usa `fetch`.

A base da API e calculada assim:

```ts
export const API_BASE_URL = normalizeApiBaseUrl(
  import.meta.env.VITE_API_URL ??
  import.meta.env.VITE_API_BASE_URL ??
  '/api',
)
```

`normalizeApiBaseUrl` remove barras finais e garante que a base termine em `/api`. Portanto:

- `https://smartmap-backend.onrender.com` vira `https://smartmap-backend.onrender.com/api`.
- `https://smartmap-backend.onrender.com/api` permanece `https://smartmap-backend.onrender.com/api`.
- `/api` permanece `/api`.

Estado antes da correcao:

```env
VITE_API_URL=https://smartmap-backend.onrender.com/api
```

Com isso, em desenvolvimento local, o navegador chamava diretamente:

```txt
https://smartmap-backend.onrender.com/api/...
```

O proxy do Vite existia em `vite.config.ts`, mas ficava efetivamente bypassado quando `VITE_API_URL` apontava para uma URL absoluta.

Estado apos a correcao frontend/Netlify:

```env
VITE_API_URL=/api
```

Com isso, o navegador passa a chamar caminhos relativos:

```txt
/api/...
```

Em desenvolvimento, o Vite proxy encaminha para Render. Em producao, o `netlify.toml` encaminha `/api/*` para Render antes do fallback SPA.

## Fluxo de autenticacao

Arquivos principais:

- `src/pages/AdminLoginPage.tsx`
- `src/pages/LoginPage.tsx`
- `src/context/AuthContext.tsx`
- `src/api/client.ts`
- `src/components/ProtectedRoute.tsx`
- `src/components/PublicRoute.tsx`
- `src/App.tsx`

Fluxo atual:

1. Usuario acessa `/admin`.
2. `AdminEntry` em `src/App.tsx` verifica `isAuthenticated`.
3. Sem token, redireciona para `/admin/login`.
4. `AdminLoginPage` chama `login({ email, password })` vindo de `AuthContext`.
5. `AuthContext.login` chama `authApi.login`.
6. `authApi.login` faz `POST /auth/login`.
7. Antes da correcao, com URL absoluta, a URL final era:

```txt
https://smartmap-backend.onrender.com/api/auth/login
```

8. Apos a correcao frontend/Netlify, a URL chamada pelo navegador passa a ser:

```txt
/api/auth/login
```

e o proxy encaminha para:

```txt
https://smartmap-backend.onrender.com/api/auth/login
```

9. Em sucesso, o frontend salva:

- `larmap.authToken`
- `larmap.company`
- `larmap.user`

10. O token e usado depois em rotas protegidas via header:

```http
Authorization: Bearer <token>
```

O login nao usa cookie e nao define `credentials` no `fetch`.

## Mapeamento completo de chamadas API

### Cliente HTTP central

Arquivo: `src/api/client.ts`

Funcao base: `request<T>(endpoint, options)`

Base URL:

```txt
API_BASE_URL = VITE_API_URL || VITE_API_BASE_URL || /api
```

Headers enviados em todas as chamadas pelo cliente:

```http
Content-Type: application/json
```

Header adicional quando existe token:

```http
Authorization: Bearer <token>
```

Credentials/cookies:

- Nao usa `credentials: 'include'`.
- Nao depende de cookies.
- Autenticacao e por Bearer token no header.

Tratamento de erro:

- Le resposta como texto e tenta `JSON.parse`.
- Se `response.ok` for falso ou `payload.success === false`, lanca `ApiError`.
- Erros de rede/CORS caem como erro nativo do `fetch`, normalmente `TypeError: Failed to fetch`.
- Nao ha timeout no cliente central.

### Health

Arquivo: `src/api/client.ts`  
Consumidor principal: `src/pages/DashboardPage.tsx`

| Funcao | Metodo | Endpoint | URL final com `.env` atual | Auth | Headers | Tratamento |
|---|---:|---|---|---|---|---|
| `healthApi.check` | GET | `/health` | `https://smartmap-backend.onrender.com/api/health` | Nao | `Content-Type` | `DashboardPage` marca API online/offline |

Riscos:

- Envia `Content-Type: application/json` mesmo em GET, o que pode provocar preflight CORS em alguns cenarios.
- Sem timeout.

### Auth

Arquivos: `src/api/client.ts`, `src/context/AuthContext.tsx`, `src/pages/AdminLoginPage.tsx`, `src/pages/LoginPage.tsx`, `src/pages/RegisterPage.tsx`

| Funcao | Metodo | Endpoint | URL final | Auth | Headers | Tratamento |
|---|---:|---|---|---|---|---|
| `authApi.login` | POST | `/auth/login` | `https://smartmap-backend.onrender.com/api/auth/login` | Nao | `Content-Type` | `AuthContext.login` salva token/company/user; paginas exibem `getErrorMessage` |
| `authApi.register` | POST | `/auth/register` | `https://smartmap-backend.onrender.com/api/auth/register` | Nao | `Content-Type` | `AuthContext.registerCompany` tenta body completo; em 400/422 tenta fallback minimo |

Riscos:

- `Content-Type: application/json` dispara preflight CORS.
- Sem timeout.
- CORS atual do backend bloqueia o preflight no navegador.
- Login invalido testado via `curl` retornou `500 Internal Server Error`, quando o esperado seria erro de autenticacao controlado, como 401/400.

### Usuarios / Corretores

Arquivos: `src/api/client.ts`, `src/pages/UsersPage.tsx`, `src/hooks/useAdminData.ts`, `src/pages/DashboardPage.tsx`

| Funcao | Metodo | Endpoint | URL final | Auth | Headers | Tratamento |
|---|---:|---|---|---|---|---|
| `usersApi.list` | GET | `/users?limit=&offset=&role=` | `https://smartmap-backend.onrender.com/api/users?...` | Sim | `Content-Type`, `Authorization` | Paginas exibem erro ou aviso |
| `usersApi.create` | POST | `/users` | `https://smartmap-backend.onrender.com/api/users` | Sim | `Content-Type`, `Authorization` | `UsersPage` mostra erro |
| `usersApi.update` | PATCH | `/users/:id` | `https://smartmap-backend.onrender.com/api/users/:id` | Sim | `Content-Type`, `Authorization` | `UsersPage` mostra erro |
| `usersApi.remove` | DELETE | `/users/:id` | `https://smartmap-backend.onrender.com/api/users/:id` | Sim | `Content-Type`, `Authorization` | `UsersPage` mostra erro |

Riscos:

- Todas as rotas autenticadas disparam preflight por `Authorization`.
- Sem timeout.
- `GET` tambem envia `Content-Type`.

### Imoveis

Arquivos: `src/api/client.ts`, `src/pages/HomePage.tsx`, `src/pages/FavoritesPage.tsx`, `src/pages/PublicMapPage.tsx`, `src/pages/PropertiesPage.tsx`, `src/pages/AdminPropertiesPage.tsx`, `src/hooks/useAdminData.ts`, `src/pages/DashboardPage.tsx`

| Funcao | Metodo | Endpoint | URL final | Auth | Headers | Tratamento |
|---|---:|---|---|---|---|---|
| `propertiesApi.list(token)` | GET | `/properties` | `https://smartmap-backend.onrender.com/api/properties` | Sim quando token existe | `Content-Type`, `Authorization` se houver token | Avisos/fallbacks locais |
| `propertiesApi.list()` publico | GET | `/public/properties` | `https://smartmap-backend.onrender.com/api/public/properties` | Nao | `Content-Type` | Se 401/403/404/405/501, tenta proximo endpoint |
| `propertiesApi.list()` publico | GET | `/properties/public` | `https://smartmap-backend.onrender.com/api/properties/public` | Nao | `Content-Type` | Fallback |
| `propertiesApi.list()` publico | GET | `/map/properties` | `https://smartmap-backend.onrender.com/api/map/properties` | Nao | `Content-Type` | Fallback |
| `propertiesApi.list()` publico | GET | `/properties` | `https://smartmap-backend.onrender.com/api/properties` | Nao | `Content-Type` | Ultimo fallback publico |
| `propertiesApi.create` | POST | `/properties` | `https://smartmap-backend.onrender.com/api/properties` | Sim | `Content-Type`, `Authorization` | Erro na UI |
| `propertiesApi.update` | PATCH | `/properties/:id` | `https://smartmap-backend.onrender.com/api/properties/:id` | Sim | `Content-Type`, `Authorization` | Admin tem fallback visual em 404/405/501 para edicao |
| `propertiesApi.remove` | DELETE | `/properties/:id` | `https://smartmap-backend.onrender.com/api/properties/:id` | Sim | `Content-Type`, `Authorization` | Admin tem fallback visual em 404/405/501 para remocao |

Riscos:

- Ha varios endpoints publicos alternativos, o que indica contrato ainda instavel.
- `PublicMapPage` chama `propertiesApi.list(token)`. Se o usuario estiver autenticado, o mapa publico passa a usar `/properties` autenticado em vez dos fallbacks publicos.
- Fallback local `larmap.admin.localProperties` pode mascarar falhas reais do backend.
- Sem upload real de midia; o frontend trabalha com URLs e metadados locais.
- Sem timeout.

### Empresa / Company

Arquivos: `src/api/client.ts`, `src/context/AuthContext.tsx`, `src/pages/AdminSettingsPage.tsx`, `src/pages/RegisterPage.tsx`

| Funcao | Metodo | Endpoint | URL final | Auth | Headers | Tratamento |
|---|---:|---|---|---|---|---|
| `companyApi.update` | PATCH | `/companies/me` | `https://smartmap-backend.onrender.com/api/companies/me` | Sim | `Content-Type`, `Authorization` | Tenta primeiro |
| `companyApi.update` | PATCH | `/company` | `https://smartmap-backend.onrender.com/api/company` | Sim | `Content-Type`, `Authorization` | Fallback em 404/405/501 |
| `companyApi.update` | PATCH | `/companies` | `https://smartmap-backend.onrender.com/api/companies` | Sim | `Content-Type`, `Authorization` | Fallback em 404/405/501 |

Riscos:

- Tres endpoints alternativos para a mesma responsabilidade.
- Em falhas 404/405/501, `AuthContext.updateCompanyProfile` salva uma versao local no `localStorage`, podendo divergir do backend.

### Leads

Arquivos: `src/api/client.ts`, `src/pages/PublicMapPage.tsx`, `src/pages/AdminLeadsPage.tsx`, `src/components/AdminShell.tsx`, `src/hooks/useAdminData.ts`

| Funcao | Metodo | Endpoint | URL final | Auth | Headers | Tratamento |
|---|---:|---|---|---|---|---|
| `leadsApi.list` | GET | `/leads` | `https://smartmap-backend.onrender.com/api/leads` | Sim | `Content-Type`, `Authorization` | `useAdminData` cai para `larmap.localLeads` se falhar |
| `leadsApi.create` | POST | `/leads` | `https://smartmap-backend.onrender.com/api/leads` | Nao | `Content-Type` | Tenta primeiro |
| `leadsApi.create` | POST | `/public/leads` | `https://smartmap-backend.onrender.com/api/public/leads` | Nao | `Content-Type` | Fallback |
| `leadsApi.create` | POST | `/leads/public` | `https://smartmap-backend.onrender.com/api/leads/public` | Nao | `Content-Type` | Fallback |
| `leadsApi.create` | POST | `/map/leads` | `https://smartmap-backend.onrender.com/api/map/leads` | Nao | `Content-Type` | Fallback |
| `leadsApi.create` | POST | `/interests` | `https://smartmap-backend.onrender.com/api/interests` | Nao | `Content-Type` | Ultimo fallback |
| `leadsApi.update` | PATCH | `/leads/:id` | `https://smartmap-backend.onrender.com/api/leads/:id` | Sim | `Content-Type`, `Authorization` | Fallback visual/local em alguns fluxos |

Riscos:

- Endpoint recomendado para criacao publica parece ser `/public/leads`, mas o frontend tenta `/leads` antes.
- Fallback local `larmap.localLeads` pode gerar diferenca entre painel local e dados reais.
- `AdminShell` usa `Promise.allSettled` ao marcar leads como vistos; falhas ficam silenciosas.
- Sem timeout.

### Negociacoes

Arquivos: `src/api/client.ts`, `src/hooks/useAdminData.ts`

| Funcao | Metodo | Endpoint | URL final | Auth | Headers | Tratamento |
|---|---:|---|---|---|---|---|
| `negotiationsApi.list` | GET | `/negotiations` | `https://smartmap-backend.onrender.com/api/negotiations` | Sim | `Content-Type`, `Authorization` | Em falha, usa array vazio |

Riscos:

- Falhas ficam silenciosas no painel.
- Sem timeout.

### Performance

Arquivos: `src/api/client.ts`, `src/hooks/useAdminData.ts`, `src/pages/AdminPerformancePage.tsx`

| Funcao | Metodo | Endpoint | URL final | Auth | Headers | Tratamento |
|---|---:|---|---|---|---|---|
| `performanceApi.listAgents` | GET | `/performance/agents` | `https://smartmap-backend.onrender.com/api/performance/agents` | Sim | `Content-Type`, `Authorization` | Em falha, usa array vazio |
| `performanceApi.listProperties` | GET | `/performance/properties` | `https://smartmap-backend.onrender.com/api/performance/properties` | Sim | `Content-Type`, `Authorization` | Em falha, usa array vazio |

Riscos:

- Falhas ficam silenciosas.
- Sem timeout.

## Integracoes externas nao relacionadas ao backend proprio

### ViaCEP

Arquivo: `src/api/postalCode.ts`  
Consumidor: `src/pages/AdminPropertiesPage.tsx`

| Metodo | URL | Headers | Auth | Tratamento |
|---:|---|---|---|---|
| GET | `https://viacep.com.br/ws/{cep}/json/` | `Accept: application/json` | Nao | Lanca erro se `response.ok` falso; retorna `null` se CEP nao existe |

Riscos:

- Usa `AbortSignal` quando chamado pelo formulario.
- Sem timeout proprio alem do abort do caller.

### Nominatim / OpenStreetMap

Arquivo: `src/api/geocoding.ts`  
Consumidores: `src/hooks/useGeocoding.ts`, `src/pages/AdminPropertiesPage.tsx`, `src/components/CityAutocomplete.tsx`

| Funcao | Metodo | URL | Headers | Auth |
|---|---:|---|---|---|
| `searchLocation` | GET | `https://nominatim.openstreetmap.org/search?...` | `Accept`, `Accept-Language: pt-BR` | Nao |
| `searchCityLocations` | GET | `https://nominatim.openstreetmap.org/search?...` | `Accept`, `Accept-Language: pt-BR` | Nao |
| `reverseGeocodeLocation` | GET | `https://nominatim.openstreetmap.org/reverse?...` | `Accept`, `Accept-Language: pt-BR` | Nao |

Riscos:

- `reverseGeocodeLocation` existe, mas nao apareceu como consumidor direto na varredura.
- Sem timeout proprio alem de abort nos fluxos que passam `signal`.

## Problemas encontrados

### 1. CORS do backend nao retorna `Access-Control-Allow-Origin`

Testes feitos contra o backend oficial em 2026-05-24:

```txt
OPTIONS https://smartmap-backend.onrender.com/api/auth/login
Origin: http://localhost:5173
Access-Control-Request-Method: POST
Access-Control-Request-Headers: content-type
```

Resposta observada:

```http
HTTP/1.1 200 OK
access-control-allow-credentials: true
access-control-allow-headers: Content-Type,Authorization
access-control-allow-methods: GET,POST,PUT,DELETE,PATCH,OPTIONS
vary: Origin
```

Header ausente:

```http
Access-Control-Allow-Origin
```

O mesmo ocorreu para:

- `Origin: http://localhost:5173`
- `Origin: http://127.0.0.1:5173`
- `GET https://smartmap-backend.onrender.com/api/health` com `Origin`
- `POST https://smartmap-backend.onrender.com/api/auth/login` com `Origin`

Diagnostico: o backend responde alguns headers CORS, mas nao devolve o header obrigatorio `Access-Control-Allow-Origin`. O navegador bloqueia a resposta antes do frontend receber qualquer payload.

### 2. O proxy Vite nao era usado no cenario anterior

`vite.config.ts` tem proxy:

```ts
server: {
  proxy: {
    '/api': {
      target: 'https://smartmap-backend.onrender.com',
      changeOrigin: true,
      secure: true,
    },
  },
}
```

Antes da correcao, o `.env` apontava para URL absoluta:

```env
VITE_API_URL=https://smartmap-backend.onrender.com/api
```

Com URL absoluta, o browser fazia chamada cross-origin direta para Render. Portanto o proxy local do Vite nao participava.

Status apos a correcao:

```env
VITE_API_URL=/api
```

Agora o proxy Vite participa das chamadas locais em `/api/*`.

### 3. `/admin` quebrava na Netlify por falta de fallback SPA

Antes da correcao, nao foram encontrados:

- `public/_redirects`
- `netlify.toml`

O app usa `BrowserRouter`, entao `/admin`, `/admin/login`, `/admin/dashboard` etc. sao rotas client-side.

Em producao na Netlify, quando o usuario acessava diretamente `/admin`, a requisicao chegava primeiro no servidor estatico da Netlify. Como nao existia arquivo fisico `/admin` nem regra para devolver `index.html`, a Netlify retornava `Page not found` antes do React carregar.

Status apos a correcao: `netlify.toml` adiciona fallback SPA com `/* -> /index.html 200`.

### 4. Contrato de endpoints ainda instavel em alguns dominios

Ha varios fallbacks de endpoint:

- Imoveis publicos: `/public/properties`, `/properties/public`, `/map/properties`, `/properties`
- Leads publicos: `/leads`, `/public/leads`, `/leads/public`, `/map/leads`, `/interests`
- Company update: `/companies/me`, `/company`, `/companies`

Isso aumenta o risco de comportamento diferente entre ambientes e mascara endpoints ausentes.

### 5. Fallbacks locais podem mascarar erro real

O frontend usa:

- `larmap.admin.localProperties`
- `larmap.localLeads`

Esses fallbacks mantem a UI funcionando, mas podem fazer o usuario acreditar que dados foram persistidos no backend quando foram apenas salvos localmente.

### 6. Chamadas sem timeout centralizado

O cliente `request` nao usa `AbortController` nem timeout padrao. Uma requisicao pendurada depende do timeout do browser/rede.

### 7. Headers em GET podem aumentar superficie de preflight

O cliente sempre define:

```http
Content-Type: application/json
```

Inclusive em `GET` sem body. Para GET simples, esse header nao e necessario.

## Inconsistencias detectadas

### Localhost vs 127.0.0.1

Nao ha URLs `localhost` ou `127.0.0.1` hardcoded no codigo-fonte. O problema aparece na origem do browser:

- `http://localhost:5173`
- `http://127.0.0.1:5173`

Ambas precisam ser permitidas pelo CORS do backend se o frontend chamar o backend diretamente.

### URL absoluta vs caminho relativo

Existem dois modos possiveis:

1. URL absoluta via `.env`: `https://smartmap-backend.onrender.com/api`
2. Caminho relativo fallback: `/api`

No modo atual, a URL absoluta vence e bypassa o proxy Vite.

### `fetch` e axios

Nao ha `axios`. O backend proprio usa `fetch` centralizado em `src/api/client.ts`.

### Multiplos clients de API

Existe um cliente para backend proprio (`src/api/client.ts`) e dois modulos para APIs externas (`postalCode.ts`, `geocoding.ts`). Nao ha multiplos clients concorrentes para o backend Smartmap.

### Barra final

`normalizeApiBaseUrl` remove barras finais. Nao foi encontrado problema de barra dupla ou base sem `/api`.

### Endpoints divergentes

Ha divergencia intencional por fallback em:

- Imoveis publicos.
- Leads publicos.
- Atualizacao de company.

Isso deve ser tratado como divida tecnica ate o backend estabilizar os contratos.

## Diagnostico do erro de CORS

O login local deveria chamar:

```txt
https://smartmap-backend.onrender.com/api/auth/login
```

Isso esta correto de acordo com o codigo atual.

O erro nao ocorre porque a URL esteja errada. O erro ocorre porque:

1. O frontend faz `POST` com `Content-Type: application/json`.
2. O browser envia automaticamente uma requisicao `OPTIONS` de preflight.
3. O backend responde `200 OK`, mas sem `Access-Control-Allow-Origin`.
4. O browser bloqueia a chamada.
5. O frontend recebe uma falha de rede/CORS, nao a resposta real do backend.

Como o backend envia:

```http
access-control-allow-credentials: true
vary: Origin
```

ele provavelmente tenta tratar CORS por origem, mas nao esta ecoando/permitindo a origem. Com `credentials: true`, o backend nao deve usar `*`; ele deve devolver a origem permitida explicitamente, por exemplo:

```http
Access-Control-Allow-Origin: http://localhost:5173
```

ou:

```http
Access-Control-Allow-Origin: http://127.0.0.1:5173
```

conforme a origem da pagina.

## Diagnostico do erro da Netlify

O problema de `/admin` em producao e independente do CORS.

Causa:

- O app usa React Router com `BrowserRouter`.
- Rotas como `/admin` so existem no client-side.
- Netlify precisa de uma regra para servir `index.html` em rotas internas.
- Antes da correcao, nao havia `public/_redirects`.
- Antes da correcao, nao havia `netlify.toml`.

Resultado:

```txt
/admin -> Netlify procura arquivo/rota estatica -> nao encontra -> Page not found
```

Antes da correcao, o React nem chegava a carregar nesse acesso direto. A correcao aplicada adiciona o fallback em `netlify.toml`.

## Riscos tecnicos

- Backend CORS bloqueia login e demais chamadas diretas do frontend.
- Producao Netlify nao suporta refresh/acesso direto em rotas internas.
- Fallbacks locais podem causar divergencia entre UI e banco real.
- Login invalido retornando `500` sugere falha de tratamento no backend.
- Ausencia de timeout central pode deixar telas carregando por tempo indefinido.
- `Content-Type` em todas as chamadas aumenta chance de preflight desnecessario.
- Rotas publicas de leads/imoveis ainda nao parecem padronizadas.
- `PublicMapPage` muda comportamento se houver token, pois usa endpoint autenticado.
- Falhas silenciosas em performance/negociacoes/leads podem esconder problemas de integracao.

## Melhorias recomendadas

### Backend

1. Corrigir CORS no backend para permitir explicitamente:

- `http://localhost:5173`
- `http://127.0.0.1:5173`
- dominio oficial da Netlify
- dominio customizado futuro, se existir

2. Garantir que `OPTIONS` responda com:

```http
Access-Control-Allow-Origin: <origin permitida>
Access-Control-Allow-Methods: GET,POST,PUT,DELETE,PATCH,OPTIONS
Access-Control-Allow-Headers: Content-Type,Authorization
```

3. Se mantiver `Access-Control-Allow-Credentials: true`, nao usar `*`.

4. Ajustar `POST /api/auth/login` para retornar erro controlado em credenciais invalidas, nao `500`.

5. Padronizar endpoints recomendados:

- `GET /public/properties`
- `GET /properties`
- `POST /properties`
- `PATCH /properties/:id`
- `DELETE /properties/:id`
- `POST /public/leads`
- `GET /leads`
- `PATCH /leads/:id`
- `PATCH /companies/me`

### Frontend

1. Adicionar fallback SPA para Netlify.
2. Definir estrategia clara para API base local/producao.
3. Remover `Content-Type` em GET sem body.
4. Adicionar timeout/abort centralizado no `request`.
5. Padronizar erro de rede/CORS com mensagem amigavel.
6. Reduzir fallbacks de endpoint quando o backend estabilizar.
7. Tornar explicita a escolha entre API publica e autenticada no mapa.

## Estrategia ideal de padronizacao

### Base URL

Escolher uma das estrategias:

#### Estrategia A: Backend com CORS correto

Manter:

```env
VITE_API_URL=https://smartmap-backend.onrender.com/api
```

Vantagens:

- Simples.
- Funciona igual em Vite e Netlify.
- Nao depende de proxy.

Desvantagens:

- Depende de deploy do backend corrigindo CORS.
- Cada dominio frontend precisa estar na allowlist.

#### Estrategia B: Proxy local em desenvolvimento

Usar `/api` localmente, por exemplo:

```env
VITE_API_URL=/api
```

Vantagens:

- Resolve o CORS local sem mexer no backend.
- Usa o proxy ja existente em `vite.config.ts`.

Desvantagens:

- Nao resolve Netlify/producao.
- Cria diferenca entre desenvolvimento e producao.

#### Estrategia C: Proxy/rewrite na Netlify

Fazer o frontend chamar `/api` tambem em producao e configurar a Netlify para proxyar `/api/*` para Render.

Vantagens:

- Evita CORS no navegador.
- Uma base relativa funciona em local/producao se ambos tiverem proxy.

Desvantagens:

- Precisa configurar regras com cuidado para nao conflitar com o fallback SPA.
- A Netlify vira intermediaria de API.
- Ainda e recomendavel corrigir CORS no backend para outros clientes.

## Sugestoes de refatoracao

1. Ajustar `request` para montar headers condicionalmente:

- `Content-Type` apenas quando houver body.
- `Authorization` apenas quando houver token.

2. Adicionar timeout:

- `AbortController`
- timeout padrao, por exemplo 15s ou 20s
- mensagem clara para timeout

3. Separar chamadas publicas e admin:

- `propertiesApi.listPublic()`
- `propertiesApi.listAdmin(token)`
- `leadsApi.createPublic()`
- `leadsApi.listAdmin(token)`

4. Reduzir fallback de endpoint depois de o backend implementar os contratos oficiais.

5. Centralizar mensagens de erro:

- CORS/rede
- timeout
- erro de validacao
- nao autenticado
- nao autorizado

6. Criar um checklist de smoke test:

- `/`
- `/mapa`
- `/admin`
- `/admin/login`
- login valido
- refresh em `/admin/dashboard`
- criar/listar imovel
- criar/listar lead

## Lista de arquivos que precisariam ser alterados

Para corrigir apenas o problema da Netlify:

- `public/_redirects` ou `netlify.toml`

Para ajustar base/proxy local:

- `.env` ou `.env.local`
- possivelmente `.env.example`
- possivelmente `vite.config.ts`, se quiser proxy mais explicito

Para melhorar o cliente HTTP:

- `src/api/client.ts`
- possivelmente `src/api/errors.ts`

Para explicitar chamadas publicas/admin:

- `src/api/client.ts`
- `src/pages/HomePage.tsx`
- `src/pages/FavoritesPage.tsx`
- `src/pages/PublicMapPage.tsx`
- `src/pages/PropertiesPage.tsx`
- `src/pages/AdminPropertiesPage.tsx`
- `src/hooks/useAdminData.ts`
- `src/pages/DashboardPage.tsx`

Para backend/CORS:

- Depende do repositorio backend, nao esta neste workspace frontend.
- Configuracao provavel: middleware CORS do Express ou equivalente.

## Plano seguro de implementacao

1. Corrigir backend CORS primeiro, pois o login depende disso em qualquer deploy que chame Render diretamente.
2. Corrigir Netlify SPA fallback para `/admin` e demais rotas internas.
3. Validar login local em:

```txt
http://localhost:5173/admin
http://127.0.0.1:5173/admin
```

4. Validar `/admin` em producao com refresh direto.
5. Melhorar `src/api/client.ts` com timeout e headers condicionais.
6. Padronizar endpoints oficiais e remover fallbacks gradualmente.
7. Remover ou reduzir dependencias de `localStorage` para dados que devem ser persistidos no backend.

## Plano 100% frontend/Netlify

Como nao ha acesso ao backend, a correcao recomendada e transformar o frontend e a Netlify em intermediarios de rota para a API. Assim, o navegador conversa apenas com a mesma origem do frontend usando `/api/...`, e Vite/Netlify encaminham a chamada para Render.

## Validacao Netlify: `_redirects` vs `netlify.toml`

Fontes oficiais consultadas:

- Netlify Redirects and rewrites: `https://docs.netlify.com/manage/routing/redirects/overview/`
- Netlify Rewrites and proxies: `https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/`
- Netlify Redirect options: `https://docs.netlify.com/manage/routing/redirects/redirect-options/`
- Netlify File-based configuration: `https://docs.netlify.com/build/configure-builds/file-based-configuration/`
- Netlify Page not found / SPA fallback: `https://docs.netlify.com/resources/troubleshooting/errors/page-not-found-error/`

Conclusao da validacao:

- Netlify suporta oficialmente os dois formatos: `_redirects` e `netlify.toml`.
- Redirects com status `200` sao rewrites/proxies; a URL do navegador permanece igual.
- Para SPA com History API/React Router BrowserRouter, a regra `/* /index.html 200` e a regra oficial para evitar `Page not found`.
- Para proxy de API externa, a documentacao oficial mostra `/api/* https://api.example.com/:splat 200` como padrao para evitar CORS no navegador.
- O motor de redirects processa a primeira regra que casar, de cima para baixo.
- Regras em `_redirects` sao processadas antes das regras em `netlify.toml`. Por isso, misturar os dois formatos pode criar conflitos dificeis de enxergar.

### Comparacao

| Criterio | `public/_redirects` | `netlify.toml` |
|---|---|---|
| Suporte oficial | Sim | Sim |
| Sintaxe | Mais curta | Mais explicita e estruturada |
| Onde fica | Precisa estar no diretorio publicado; no Vite, normalmente `public/_redirects` e copiado para `dist` | Raiz do repositorio; Netlify le como configuracao do site |
| Build/publish junto | Nao | Sim, permite declarar `command` e `publish` no mesmo arquivo |
| Ordem entre formatos | Processado antes do `netlify.toml` | Processado depois de `_redirects` |
| Proxy externo | Sim | Sim |
| Headers em proxy | Limitado | Suporta `headers` em redirects de proxy |
| Force redirect | `200!` | `force = true` |
| Manutencao | Otimo para regras simples | Mais robusto para projeto com build Vite e deploy Netlify |

### Escolha recomendada para este projeto

Usar `netlify.toml`.

Motivos:

- O projeto ainda nao tinha `_redirects` nem `netlify.toml`, entao nao ha legado a preservar.
- `netlify.toml` permite declarar em um unico lugar o build Vite (`npm run build`), o publish directory (`dist`) e as regras de proxy/fallback.
- A sintaxe estruturada reduz ambiguidade para regras criticas como `force = true` no proxy `/api/*`.
- Evita depender da copia de `public/_redirects` para `dist`.
- Facilita deploy preview, branch deploy e reproducibilidade, pois a configuracao fica versionada na raiz.

### Limitacoes e conflitos possiveis

- Nao criar tambem `public/_redirects` com regras concorrentes. Como `_redirects` e processado antes, ele poderia interceptar `/api/*` ou `/*` antes do `netlify.toml`.
- A regra `/api/*` deve vir antes do fallback `/*`; caso contrario, chamadas de API poderiam receber `index.html`.
- `force = true` no proxy `/api/*` e intencional para garantir que nenhum arquivo estatico futuro em `/api` sombreie o proxy.
- O fallback SPA nao usa `force = true`, para nao sombrear assets reais do build.
- Se o backend retornar headers de cache como `ETag` ou `Last-Modified`, o CDN da Netlify pode cachear respostas proxied conforme os mecanismos HTTP padrao. Para endpoints mutaveis/autenticados, o ideal e o backend enviar `Cache-Control` apropriado, mas isso esta fora do controle do frontend.
- Deploy previews recebem a mesma configuracao por padrao, entao previews tambem chamarao `/api/*` via proxy para o backend oficial Render.

### Comportamento esperado em producao

Com `netlify.toml`:

```toml
[[redirects]]
  from = "/api/*"
  to = "https://smartmap-backend.onrender.com/api/:splat"
  status = 200
  force = true

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

Resultado:

- `/api/auth/login` e proxyado para `https://smartmap-backend.onrender.com/api/auth/login`.
- `/admin`, `/admin/login` e `/admin/dashboard` servem `index.html` e o React Router decide a tela.
- O navegador nao chama diretamente `https://smartmap-backend.onrender.com`.

### 1. Padronizar a base da API no frontend

Alterar a configuracao de ambiente para:

```env
VITE_API_URL=/api
```

ou remover `VITE_API_URL` para cair no fallback ja existente em `src/api/client.ts`.

Impacto:

- As chamadas passam a ser relativas, por exemplo `/api/auth/login`.
- Em local, o proxy Vite intercepta `/api`.
- Em producao, a Netlify precisa interceptar `/api`.
- O navegador deixa de fazer chamada cross-origin direta para Render.

Vantagens:

- Resolve o CORS pelo lado do frontend/infra.
- Mantem `src/api/client.ts` praticamente alinhado ao desenho atual.
- Evita hardcode da URL do backend no bundle final.

Desvantagens:

- A disponibilidade da API passa a depender tambem da regra de proxy da Netlify.
- Se outro host for usado no futuro, ele tambem precisara de regra equivalente.

### 2. Manter proxy Vite para desenvolvimento

O `vite.config.ts` ja possui proxy:

```ts
server: {
  proxy: {
    '/api': {
      target: 'https://smartmap-backend.onrender.com',
      changeOrigin: true,
      secure: true,
    },
  },
}
```

Com `VITE_API_URL=/api`, uma chamada frontend para:

```txt
/api/auth/login
```

sera encaminhada pelo Vite para:

```txt
https://smartmap-backend.onrender.com/api/auth/login
```

Impacto:

- O browser chama `http://localhost:5173/api/auth/login`.
- O Vite faz a chamada servidor-servidor para Render.
- CORS deixa de bloquear no navegador local.

### 3. Criar redirects/proxy da Netlify

Estrategia validada e aplicada: criar `netlify.toml` com esta ordem:

```toml
[[redirects]]
  from = "/api/*"
  to = "https://smartmap-backend.onrender.com/api/:splat"
  status = 200
  force = true

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

A ordem e critica:

1. Primeiro o proxy da API.
2. Depois o fallback SPA.

Se o fallback SPA vier antes, `/api/auth/login` pode retornar `index.html` em vez da API.

Impacto:

- Em producao, o navegador chama `https://dominio-do-frontend.netlify.app/api/auth/login`.
- A Netlify encaminha para `https://smartmap-backend.onrender.com/api/auth/login`.
- Rotas client-side como `/admin`, `/admin/login` e `/admin/dashboard` passam a carregar `index.html`.

Vantagens:

- Corrige o erro `Page not found` nas rotas React Router.
- Evita chamada direta do navegador ao backend.
- Nao exige alteracao no backend.

Desvantagens:

- O backend ainda pode ter CORS incorreto para outros consumidores, mas isso fica fora do escopo frontend.
- Debug de API em producao passa a envolver Netlify + Render.

### 4. Atualizar `.env.example`

Recomendar:

```env
VITE_API_URL=/api
```

e documentar que o backend real fica atras de proxy local/Netlify.

Impacto:

- Novos ambientes seguem a estrategia relativa.
- Reduz risco de alguem rebuildar o frontend com URL absoluta.

### 5. Validacao recomendada

Depois da implementacao, validar:

```txt
http://localhost:5173/admin
http://localhost:5173/admin/login
http://localhost:5173/api/health
```

Em producao Netlify, validar:

```txt
/admin
/admin/login
/admin/dashboard
/api/health
```

Tambem verificar no DevTools que as chamadas aparecem como:

```txt
/api/auth/login
```

e nao como:

```txt
https://smartmap-backend.onrender.com/api/auth/login
```

### Arquivos alterados nesta estrategia

- `.env`
- `.env.example`
- `netlify.toml`

Possivelmente nao sera necessario alterar:

- `src/api/client.ts`
- `vite.config.ts`
- layout ou componentes visuais

### Ordem frontend-only recomendada

1. Alterar `.env` para `VITE_API_URL=/api`.
2. Alterar `.env.example` para documentar `VITE_API_URL=/api`.
3. Criar `netlify.toml` com proxy `/api/*` antes do fallback SPA.
4. Rodar `npm run typecheck`.
5. Rodar build.
6. Testar localmente `/api/health` via Vite.
7. Testar `/admin` localmente.
8. Publicar na Netlify.
9. Testar `/admin` e `/api/health` em producao.

## Ordem recomendada das correcoes

Considerando a restricao atual de responsabilidade apenas sobre frontend/Netlify, a ordem aplicada/recomendada e:

1. Frontend: mudar `VITE_API_URL` para `/api`.
2. Netlify: adicionar proxy `/api/*` para Render antes do fallback SPA.
3. Netlify: adicionar fallback SPA `/* -> /index.html 200`.
4. Frontend: validar que o bundle nao contem chamada direta para `smartmap-backend.onrender.com`.
5. Frontend: validar localmente `/api/health`, `/admin` e `/admin/login`.
6. Futuro opcional: melhorar `request` com timeout e headers condicionais.
7. Futuro opcional: remover fallbacks locais quando o backend estiver completo.

Correcoes ideais de backend, como CORS nativo e erro controlado no login invalido, continuam recomendadas, mas ficam fora do escopo operacional atual.

## Separacao de responsabilidades

Depende do backend:

- CORS real para chamadas diretas ao Render.
- `POST /api/auth/login` responder corretamente.
- Contratos oficiais de auth, properties, leads, company, users, performance.
- Persistencia real de imoveis, leads e midias.

Depende apenas do frontend:

- Fallback SPA na Netlify.
- Uso de `/api` local para aproveitar proxy Vite.
- Timeout e headers condicionais no cliente.
- Mensagens de erro melhores.
- Refatoracao dos clients e remocao gradual de fallbacks.

Pode ser resolvido por infraestrutura/frontend:

- Proxy/rewrite Netlify para `/api/*`, caso a estrategia escolhida seja evitar CORS no navegador em producao.

## Conclusao

O endpoint real do backend para login continua sendo:

```txt
https://smartmap-backend.onrender.com/api/auth/login
```

Apos a correcao frontend/Netlify, o navegador nao deve chamar essa URL diretamente. Ele deve chamar:

```txt
/api/auth/login
```

e o proxy local/Netlify encaminha para o backend Render.

O CORS falhava porque o backend nao retorna `Access-Control-Allow-Origin` para a origem local, mesmo respondendo outros headers CORS. A solucao aplicada contorna isso pelo lado frontend/infra, sem alterar o backend.

O `/admin` na Netlify falhava porque o projeto nao tinha regra de fallback SPA e usa `BrowserRouter`. A solucao aplicada adiciona o fallback em `netlify.toml`.

As demais inconsistencias sao principalmente de padronizacao: fallbacks multiplos de endpoint, uso de armazenamento local como contingencia, ausencia de timeout e headers pouco seletivos.
