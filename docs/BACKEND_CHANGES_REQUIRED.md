# LarMap — Alterações necessárias no Backend

## 1. Objetivo

O frontend LarMap está preparado para a transição para autenticação individual, controle de acesso por permissões, administração de imobiliária, administração do LarMap Explica, perfil próprio de corretores, perfis públicos e integração real do blog.

O frontend já diferencia sessões novas de sessões legadas, valida a sessão por `GET /api/auth/me`, centraliza permissões de interface e trata 401 e 403 separadamente. Segurança, isolamento multi-tenant, identidade do autor e ownership não podem ser garantidos pelo React e precisam ser impostos pelo backend.

## 2. Estado atual identificado

- `Company.password` é o único segredo de login no `prisma/schema.prisma`.
- `User` não possui senha nem autenticação individual.
- `src/services/auth/login.service.ts` procura uma `Company` por email e compara `Company.password`.
- `src/utils/jwt.ts` emite um JWT que identifica a empresa por `id` e `email`.
- `src/routes/auth.routes.ts` registra apenas `POST /register` e `POST /login`; não existe `GET /api/auth/me`.
- `User.role` é uma `String` profissional, com default `agent`; não existe autorização efetiva por role.
- `src/middlewares/auth.ts` aceita qualquer JWT válido e popula `req.user`; não verifica permissão.
- O backend local registra `/api/blog/*` em `src/index.ts` e `src/routes/blog.routes.ts`, mas o deployment atual em `smartmap-backend.onrender.com` respondeu 404 para `/api/blog/categories`. O mesmo deployment respondeu em `/api/public/properties`, indicando forte defasagem do deploy.
- `src/services/property/listPublicProperties.service.ts` retorna `agentId` e `agentName`, mas não retorna o `publicSlug` do anunciante.
- `src/routes/public.routes.ts` não possui endpoint público de imobiliária.
- `BlogAuthor` não possui relação com `User`.
- O perfil editável depende de `:userId` em `src/routes/profile.routes.ts`.

## 3. Modelo de autenticação recomendado

Adicionar ao Prisma:

```prisma
enum AccessRole {
  COMMON
  COMPANY
  BLOG
  TECHNICAL
}

model User {
  // campos existentes
  email            String       @unique
  password         String?
  companyId        String?
  company          Company?     @relation(fields: [companyId], references: [id], onDelete: SetNull)
  professionalRole String?
  accessRole       AccessRole   @default(COMMON)
  permissions      String[]     @default([])
  isActive         Boolean      @default(true)
  tokenVersion     Int          @default(1)
}
```

Regras de modelagem:

- `professionalRole` descreve a função profissional; `accessRole` controla acesso administrativo.
- Corretor comum: `accessRole = COMMON`, `professionalRole = "agent"`.
- Consumidor: `accessRole = COMMON`, `professionalRole = null`.
- Administrador de imobiliária: `accessRole = COMPANY`.
- Editor do blog: `accessRole = BLOG`.
- Usuário interno: `accessRole = TECHNICAL`.
- Um corretor não recebe administração empresarial apenas por possuir `professionalRole = "agent"`.
- `permissions` deve conter exceções ou permissões efetivas calculadas. A fonte de verdade deve permanecer no backend.
- O frontend reconhece inicialmente `company:manage`, `blog:manage` e `professional-profile:self:edit`. Quando `permissions` vier preenchido, essa lista é tratada como autoritativa; portanto os identificadores precisam ser retornados exatamente com esses nomes ou versionados em conjunto com o frontend.
- Como o login usa apenas email e senha, emails de contas autenticáveis precisam ser globalmente únicos. Antes de aplicar `@unique`, auditar colisões hoje permitidas por `@@unique([email, companyId])`.
- `companyId` precisa ser nullable para COMMON sem imobiliária. Contas COMPANY, BLOG vinculadas e corretores vinculados continuam com `companyId`.
- `password` pode ser nullable durante a migração; uma conta sem hash não pode autenticar. Depois do backfill e da definição do fluxo de convite/redefinição, avaliar torná-lo obrigatório para contas ativas.
- Migrar o valor atual de `User.role` para `professionalRole` e manter `role` temporariamente apenas para compatibilidade. Removê-lo exige uma etapa posterior.

A migration deve criar o enum e campos, tornar a relação com `Company` opcional, auditar emails duplicados e criar índices para `companyId`, `accessRole`, `isActive` e `publicSlug`. Não remover contas `Company` existentes na primeira migration.

Para preservar logins atuais, criar um `User` proprietário para cada `Company`, com `accessRole = COMPANY`, `companyId` da empresa e hash copiado de `Company.password`. A transição deve ser idempotente e executada somente após auditoria de colisões de email.

## 4. POST /api/auth/login

Contrato atual:

```http
POST /api/auth/login
Content-Type: application/json

{"email":"conta@exemplo.com","password":"senha"}
```

O `loginService` atual normaliza apenas a consulta com `input.email.toLowerCase()`, usa `comparePassword` de `src/utils/password.ts` e retorna `{ token, company }`. Email inexistente e senha inválida geram o mesmo 401 `Invalid email or password`.

Contrato esperado:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "...",
    "user": {
      "id": "user-id",
      "name": "Nome",
      "email": "conta@exemplo.com",
      "companyId": "company-id",
      "professionalRole": "agent",
      "accessRole": "COMMON",
      "permissions": [],
      "publicSlug": "nome-abc12"
    },
    "company": {
      "id": "company-id",
      "name": "Imobiliária"
    }
  }
}
```

`user` é obrigatório no contrato novo. `company` é nullable para contas sem vínculo. O backend deve retornar permissões efetivas, sem senha, hash, tokenVersion ou dados privados da empresa.

Normalizar email com `trim().toLowerCase()` antes da consulta. Não aplicar `trim` nem outra transformação à senha. Validar payload antes do service. Responder 401, com mensagem genérica, para email inexistente, senha inválida, conta inativa ou conta sem credencial habilitada.

Arquivos a alterar:

- `prisma/schema.prisma`
- `src/routes/auth.routes.ts`
- `src/controllers/auth/login.controller.ts`
- `src/services/auth/login.service.ts`
- `src/utils/password.ts`
- `src/utils/validators.ts` ou um schema dedicado em `src/schemas/auth.schema.ts`
- `src/utils/jwt.ts`
- `src/config/swagger.ts`

**BREAKING CHANGE:** o retorno deixa de representar somente uma empresa e passa a exigir `data.user`. O frontend de transição já aceita o contrato novo e o legado `{ token, company }`.

## 5. GET /api/auth/me

Adicionar:

```http
GET /api/auth/me
Authorization: Bearer <token>
```

Resposta 200:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "name": "Nome",
      "email": "conta@exemplo.com",
      "companyId": "company-id",
      "professionalRole": "agent",
      "accessRole": "COMMON",
      "permissions": [],
      "publicSlug": "nome-abc12"
    },
    "company": null
  }
}
```

O service deve buscar o `User` pelo `sub`, confirmar `isActive`, `tokenVersion` e vínculo de empresa quando necessário, calcular permissões atuais e retornar `user + company`. Usuário inexistente/inativo, token expirado ou versão divergente retorna 401.

Arquivos:

- alterar `src/routes/auth.routes.ts` para registrar `router.get('/me', requireAuth, meController)`;
- criar `src/controllers/auth/me.controller.ts`;
- criar `src/services/auth/me.service.ts`;
- alterar o middleware de `src/middlewares/auth.ts` conforme a seção seguinte;
- atualizar `src/config/swagger.ts`.

## 6. JWT e middleware

O JWT atual confunde `company.id` com o principal autenticado. O payload recomendado é:

```ts
{
  sub: user.id,
  companyId: user.companyId ?? null,
  accessRole: user.accessRole,
  tokenVersion: user.tokenVersion
}
```

Não incluir senha, hash, dados de perfil, telefone nem a lista completa de permissions no JWT. Permissions devem ser resolvidas no backend, permitindo revogação sem aguardar expiração.

Alterar `src/utils/jwt.ts` e substituir `req.user` por um principal inequívoco, por exemplo:

```ts
req.auth = {
  userId,
  companyId,
  accessRole,
  permissions
}
```

Tokens antigos devem ser rejeitados de forma controlada. Recomenda-se alterar `issuer`/`audience` ou exigir `sub` e `tokenVersion`; payloads antigos sem esses campos retornam 401. O frontend remove a sessão ao receber 401.

- 401: ausência de token, token inválido/expirado/revogado ou principal inexistente.
- 403: principal autenticado, porém sem role, permission, ownership ou tenant permitido.

## 7. Matriz de acesso

| Área | COMMON | COMPANY | BLOG | TECHNICAL |
| --- | --- | --- | --- | --- |
| Rotas públicas | Sim | Sim | Sim | Sim |
| Administração da imobiliária | Não | Própria empresa | Não | Empresa explicitamente autorizada |
| Imóveis administrativos | Não | Própria empresa | Não | Empresa explicitamente autorizada |
| Corretores | Não | Própria empresa | Não | Empresa explicitamente autorizada |
| Leads | Não | Própria empresa | Não | Empresa explicitamente autorizada |
| Configurações empresariais | Não | Própria empresa | Não | Empresa explicitamente autorizada |
| Blog admin | Não | Não | Tenant permitido | Tenant permitido |
| Perfil próprio do corretor | Se `professionalRole = agent` | Conforme ownership/admin | Não | Conforme permissão explícita |

`TECHNICAL` não pode atravessar automaticamente empresas diferentes. Toda operação tenant-scoped precisa de um `companyId` permitido, derivado do principal ou de um escopo técnico explicitamente validado.

## 8. Autorização backend

Evoluir `src/middlewares/auth.ts` para componentes equivalentes a:

- `requireAuth`: valida token, carrega a conta ativa e popula `req.auth`.
- `requireAccessRole(...roles)`: verifica o role administrativo.
- `requirePermission(permission)`: verifica a permissão efetiva.
- helpers de `requireCompanyScope`/ownership para recursos tenant-scoped.

Routers reais que precisam de proteção adicional:

- `src/routes/user.routes.ts`: COMPANY/TECHNICAL e mesmo `companyId`.
- `src/routes/property.routes.ts`: COMPANY/TECHNICAL e ownership da empresa.
- `src/routes/lead.routes.ts`: COMPANY/TECHNICAL e ownership da empresa; manter criação pública apenas na rota pública definida.
- `src/routes/company.routes.ts`: COMPANY/TECHNICAL e empresa autorizada.
- `src/routes/profile.routes.ts`: separar self-service de administração.
- `src/routes/blog.routes.ts`: BLOG/TECHNICAL nas operações administrativas.

Controllers não devem continuar interpretando `req.user!.id` como `companyId`. Devem usar `req.auth.userId` e `req.auth.companyId` explicitamente.

## 9. Blog — isolamento multi-tenant

`src/controllers/blog/posts.controller.ts` define `isAdmin = !!req.user`. Em seguida, `src/services/blog/listPosts.service.ts` permite status administrativo sem filtrar `companyId`. `src/services/blog/getPost.service.ts` também remove o filtro de `PUBLISHED` para qualquer token e não filtra tenant. Isso permite enxergar drafts de outras empresas.

Comportamento obrigatório:

- Leitura pública retorna somente `PUBLISHED`, `deletedAt = null` e publicações já liberadas.
- `DRAFT`, `SCHEDULED` e `ARCHIVED` nunca aparecem em rota pública.
- Leitura administrativa filtra sempre por `companyId` autorizado.
- `create`, `update`, `delete`, `publish`, `schedule` e `duplicate` validam ownership antes da mutação.
- `authorId` precisa pertencer ao mesmo tenant permitido.
- `src/services/blog/media.service.ts` já recebe `companyId`; manter esse filtro e validar o tenant no middleware.
- `src/services/blog/dashboard.service.ts` e a listagem de autores precisam manter o mesmo escopo.
- `BlogCategory` hoje é global. Definir explicitamente se a taxonomia é global e administrável apenas por TECHNICAL ou adicionar `companyId`, índice e unicidade composta para permitir administração por tenant. Não deixar categorias globais mutáveis por qualquer token.

Arquivos principais:

- `src/routes/blog.routes.ts`
- `src/controllers/blog/posts.controller.ts`
- `src/controllers/blog/categories.controller.ts`
- `src/controllers/blog/media.controller.ts`
- `src/services/blog/listPosts.service.ts`
- `src/services/blog/getPost.service.ts`
- `src/services/blog/createPost.service.ts`
- `src/services/blog/updatePost.service.ts`
- `src/services/blog/deletePost.service.ts`
- `src/services/blog/publishPost.service.ts`
- `src/services/blog/media.service.ts`
- `src/services/blog/category.service.ts`
- `src/services/blog/dashboard.service.ts`
- `src/jobs/publishScheduledPosts.ts`

Recomenda-se adicionar rotas paralelas `/api/blog/admin/posts` para eliminar a ambiguidade de autenticação opcional. **BREAKING CHANGE** somente se as rotas atuais forem removidas/trocadas no mesmo deploy. A migração segura é aditiva: publicar as novas rotas, atualizar o frontend e remover as antigas depois.

## 10. BlogAuthor e usuário autenticado

Adicionar relação explícita:

```prisma
model BlogAuthor {
  // campos existentes
  userId String? @unique
  user   User?   @relation(fields: [userId], references: [id], onDelete: SetNull)
}
```

Adicionar a relação inversa opcional em `User`. O campo nullable preserva autores editoriais existentes.

Regras:

- Usuário BLOG com autor vinculado cria posts com seu `BlogAuthor.id` automaticamente.
- O frontend nunca deduz autor por nome ou email.
- `GET /api/blog/authors` lista somente autores do tenant permitido.
- Adicionar `GET /api/blog/authors/me` para retornar o autor associado ao `req.auth.userId`; 404 indica que o vínculo ainda precisa ser criado.
- TECHNICAL pode selecionar outro autor apenas dentro do tenant explicitamente autorizado e se possuir permissão para isso.
- COMPANY e COMMON não administram blog.
- Ao criar/editar/duplicar, validar que `authorId` pertence ao mesmo `companyId` do post.

Alterar `prisma/schema.prisma`, `src/routes/blog.routes.ts`, `src/controllers/blog/media.controller.ts` ou separar um `authors.controller.ts`, `src/services/blog/createPost.service.ts`, `src/services/blog/updatePost.service.ts`, `src/services/blog/publishPost.service.ts` e `src/services/blog/dashboard.service.ts`.

## 11. Perfil próprio do corretor

As rotas atuais em `src/routes/profile.routes.ts` confiam em `:userId`. Os services `getProfileService`, `updateProfileService` e `uploadAvatarService` verificam a empresa, mas não distinguem o dono do perfil de um administrador.

Adicionar:

- `GET /api/profile/me`
- `PUT /api/profile/me`
- `POST /api/profile/me/avatar`

Essas rotas derivam o `userId` exclusivamente de `req.auth.userId`. Exigir `professionalRole = agent` ou permissão equivalente e ownership do próprio perfil.

Manter rotas administrativas separadas para COMPANY/TECHNICAL, preferencialmente sob `/api/users/:userId/profile`, sempre validando `target.companyId === req.auth.companyId`. Um TECHNICAL precisa de escopo de empresa explícito. Falha de ownership retorna 403, não 400.

Arquivos:

- `src/routes/profile.routes.ts`
- `src/controllers/profile/getProfile.controller.ts`
- `src/controllers/profile/updateProfile.controller.ts`
- `src/controllers/profile/uploadAvatar.controller.ts`
- `src/services/profile/getProfile.service.ts`
- `src/services/profile/updateProfile.service.ts`
- `src/services/profile/uploadAvatar.service.ts`

As novas rotas `/me` são aditivas. Remover imediatamente as rotas com `:userId` seria **BREAKING CHANGE** para a administração atual.

## 12. publicSlug nos imóveis públicos

`GET /api/public/properties` não fornece informação suficiente para montar `/profissional/{publicSlug}`. A alternativa de menor impacto é manter `agentId` e `agentName` e adicionar:

```json
{
  "id": "property-id",
  "agentId": "user-id",
  "agentName": "Nome do corretor",
  "agentPublicSlug": "nome-do-corretor-abc12"
}
```

Alterar `src/services/property/listPublicProperties.service.ts`. Como `Property.agentId` hoje é apenas `String?`, sem relação Prisma com `User`, o service pode buscar os users dos `agentId` retornados em uma consulta em lote e montar um mapa `id -> publicSlug`. Não executar uma consulta por imóvel. Como evolução estrutural, adicionar uma relação opcional `Property.agent`, avaliando antes registros órfãos.

Retornar `null` quando não houver user/slug. O frontend não deve fabricar slug.

## 13. Backfill de publicSlug

Preparar migration/script idempotente para `User.publicSlug IS NULL`:

1. Ler somente users sem slug.
2. Gerar com `generatePublicSlug` de `src/utils/slug.ts`, usando o nome e o id real do user.
3. Verificar colisão antes de gravar; em colisão, usar um sufixo determinístico adicional sem alterar slugs existentes.
4. Nunca recalcular `publicSlug` não nulo.
5. Executar primeiro em cópia/staging com backup verificado.
6. Validar unicidade e ausência de nulls nos profissionais publicáveis.
7. Garantir que uma segunda execução não produza updates.

O script deve reutilizar `src/utils/slug.ts` e ser versionado separadamente da migration estrutural. Não inserir o backfill em startup da aplicação.

## 14. Perfil público de imobiliária

Não existe contrato atual. A rota coerente com `src/routes/public.routes.ts` é:

```http
GET /api/public/companies/:publicSlug
```

Adicionar `Company.publicSlug String? @unique` e preferencialmente um `CompanyProfile` 1:1 para dados estritamente públicos: `description`, `publicPhone`, `publicWhatsapp`, `publicEmail`, `website`, `instagram`, `facebook`, `linkedin`, região/endereço público e configuração de visibilidade. O slug deve ser gerado de forma determinística e única, sem alterar slugs existentes.

O DTO pode retornar:

- `id`, `name`, `publicSlug`, `logoUrl` e descrição;
- contatos marcados como públicos;
- região/endereço autorizado;
- corretores ativos com `publicSlug`;
- imóveis públicos/ativos;
- estatísticas agregadas não sensíveis.

Nunca retornar `password`, hashes, `tokenVersion`, email privado, configurações internas, leads, negociações, dados de cobrança ou endereço não marcado como público.

Criar controller/service dedicados, por exemplo `src/controllers/company/getPublicCompany.controller.ts` e `src/services/company/getPublicCompany.service.ts`, e registrar em `src/routes/public.routes.ts`.

## 15. Deployment do Render

O código local registra `/api/blog/*`; o deployment atual retornou 404 em `/api/blog/categories`, enquanto `/api/public/properties` respondeu. Há forte indício de que `smartmap-backend.onrender.com` executa código anterior ao backend local.

Antes do deploy:

1. Confirmar o repositório conectado ao serviço Render.
2. Confirmar a branch de produção.
3. Confirmar o build command.
4. Confirmar o start command.
5. Revisar `DATABASE_URL` sem expor seu valor.
6. Revisar `JWT_SECRET` e planejar a invalidação de tokens antigos.
7. Revisar `CORS_ORIGIN` e os domínios oficiais.
8. Revisar migrations pendentes e backup antes de aplicá-las.
9. Fazer deploy do commit correto somente após validação em staging.
10. Registrar e confirmar commit/version nos logs da aplicação.

## 16. Health check e keep-alive

Já existe `GET /api/health` em `src/routes/health.ts`, registrado por `src/index.ts`. Ele é público, leve, não consulta o banco e retorna 200 com mensagem e timestamp. Pode ser utilizado futuramente para monitoramento/keep-alive sem mudança funcional.

## 17. Ordem recomendada de implementação

1. Alterar schema de autenticação e auditar colisões de email.
2. Migrar logins de `Company` para users proprietários, preservando o contrato legado durante a janela de transição.
3. Publicar o JWT novo e `GET /api/auth/me`.
4. Implantar middlewares de autorização e ownership.
5. Corrigir isolamento multi-tenant do blog.
6. Relacionar `BlogAuthor` a `User` e publicar `/api/blog/authors/me`.
7. Adicionar `/api/profile/me` e separar rotas administrativas.
8. Adicionar `agentPublicSlug` a imóveis públicos.
9. Executar o backfill idempotente de `User.publicSlug`.
10. Criar `CompanyProfile`, slug e endpoint público.
11. Corrigir a origem/branch e fazer o deployment validado.
12. Executar todos os smoke tests e testes de isolamento.

## 18. Plano de compatibilidade e breaking changes

- **Novo formato de login — BREAKING CHANGE:** publicar primeiro o frontend de transição, que aceita `{ token, user, company? }` e `{ token, company }`; depois publicar o backend novo. Remover o modo legado apenas em release posterior.
- **Invalidação dos JWTs antigos — BREAKING CHANGE:** publicar o frontend com tratamento central de 401 antes de mudar o payload/versão. Comunicar que sessões existentes precisarão de novo login.
- **Rotas administrativas do blog — BREAKING CHANGE se substituídas:** adicionar `/api/blog/admin/*` em paralelo, migrar o frontend e só então desativar a semântica administrativa das rotas atuais.
- **`/api/profile/me`:** adição não quebra compatibilidade. Manter `/:userId` para administração até o frontend migrar; remover ou mover as rotas antigas apenas depois.
- **`User.email @unique`:** pode falhar na migration se houver emails repetidos entre empresas. Resolver colisões antes da constraint.
- **`Company.password`:** não remover no primeiro deploy. Desativar o login legado somente depois de confirmar o backfill e a autenticação de todos os proprietários.

## 19. Smoke tests pós-deploy

- [ ] `GET /api/health` retorna 200.
- [ ] `GET /api/public/properties` retorna 200 e contrato público esperado.
- [ ] `GET /api/blog/categories` retorna 200.
- [ ] `GET /api/blog/posts` retorna somente posts públicos.
- [ ] `POST /api/auth/login` retorna `token`, `user` obrigatório e `company` quando aplicável.
- [ ] `GET /api/auth/me` com Bearer válido retorna a sessão atual.
- [ ] `GET /api/public/professionals/:publicSlug` retorna o profissional correto.
- [ ] Login COMMON direciona para área pública e não acessa admin.
- [ ] Login COMPANY acessa somente administração da própria empresa.
- [ ] Login BLOG acessa somente blog admin.
- [ ] Login TECHNICAL acessa áreas permitidas sem atravessar tenants automaticamente.
- [ ] COMMON recebe 403 em endpoints administrativos.
- [ ] COMPANY recebe 403 no blog admin.
- [ ] BLOG recebe 403 na administração da imobiliária.
- [ ] Usuário da empresa A não lista, lê nem altera drafts, mídias, autores ou recursos da empresa B.
- [ ] Criação de post atribui o `BlogAuthor` vinculado ao user correto.

## 20. Checklist final para o desenvolvedor backend

- [ ] Fazer backup e validar staging antes de qualquer migration.
- [ ] Auditar emails duplicados entre users e companies.
- [ ] Adicionar `AccessRole`, credencial individual, `professionalRole`, permissions, status e `tokenVersion`.
- [ ] Tornar `companyId` opcional onde o modelo de conta exigir.
- [ ] Criar users proprietários para companies existentes por script idempotente.
- [ ] Implementar o contrato novo de `POST /api/auth/login`.
- [ ] Implementar `GET /api/auth/me`.
- [ ] Alterar JWT para identificar user com `sub`.
- [ ] Rejeitar tokens antigos sem ambiguidade e retornar 401.
- [ ] Implementar `requireAuth`, role/permission e ownership com 401/403 corretos.
- [ ] Proteger users, properties, leads, company, profile e blog por tenant.
- [ ] Separar leitura pública e administrativa do blog.
- [ ] Corrigir filtros de `companyId` em listagem e leitura de posts.
- [ ] Proteger todas as mutações do blog por ownership.
- [ ] Definir escopo seguro para categorias do blog.
- [ ] Relacionar `BlogAuthor.userId` e implementar `/api/blog/authors/me`.
- [ ] Implementar as três rotas `/api/profile/me`.
- [ ] Adicionar `agentPublicSlug` ao DTO de imóveis públicos.
- [ ] Preparar e testar backfill idempotente de `User.publicSlug`.
- [ ] Modelar `CompanyProfile`, gerar `Company.publicSlug` e criar endpoint público.
- [ ] Confirmar repo, branch, build/start commands e commit do Render.
- [ ] Revisar `DATABASE_URL`, `JWT_SECRET` e `CORS_ORIGIN`.
- [ ] Aplicar migrations somente após revisão e backup.
- [ ] Executar deploy controlado do código correto.
- [ ] Executar todos os smoke tests e testes multi-tenant.
- [ ] Monitorar erros 401/403 e rollback criteria após o deploy.

## Cadastro e conta do usuário consumidor

O cadastro público em `POST /api/auth/register` deve criar exclusivamente um `User` consumidor. Ele não pode continuar criando `Company` quando chamado pelo fluxo público do site.

Contrato mínimo proposto:

```json
{
  "name": "Nome da pessoa",
  "email": "pessoa@exemplo.com",
  "password": "senha-segura"
}
```

Regras obrigatórias:

- o backend força `accessRole = COMMON`; esse valor nunca é decidido pelo frontend;
- `accessRole`, `role`, `permissions`, `companyId`, `professionalRole` ou qualquer campo administrativo recebido no request deve ser rejeitado pela validação ou ignorado antes da criação;
- `COMPANY`, `BLOG` e `TECHNICAL` não podem ser criados nem promovidos pelo cadastro público; esses acessos são concedidos somente por processo interno e auditável;
- `COMMON` não pode acessar endpoints administrativos, mesmo que manipule a URL, o request ou o armazenamento do frontend;
- o cadastro de imobiliária deve ser removido deste endpoint público e colocado em processo interno separado, sem reutilizar o formulário de consumidor;
- corretores são cadastrados exclusivamente pela imobiliária autorizada, com `companyId` derivado do administrador autenticado;
- um corretor recebe `professionalRole = "agent"` e, normalmente, `accessRole = COMMON`; ser corretor não concede automaticamente `COMPANY` nem permissão de administração empresarial;
- autenticação individual de `User` é necessária para consumidores e corretores;
- `GET /api/auth/me` é necessário e deve retornar o `User` autenticado, sua `accessRole`, permissões efetivas e `company` nullable, conforme a seção 5;
- respostas 401 devem representar credencial/sessão inválida e respostas 403 devem representar usuário autenticado sem autorização, sem invalidar a sessão.

O frontend público novo não chama o endpoint atual, pois a implementação auditada ainda cria `Company`. A integração deve ser habilitada somente depois que esse contrato seguro estiver publicado.

## Favoritos do usuário

**BACKEND NECESSÁRIO — persistência de favoritos por `User`.** O frontend mantém compatibilidade temporária, por dispositivo, com o `localStorage` existente; isso não é a fonte definitiva e não sincroniza entre dispositivos.

Estrutura Prisma adequada ao schema atual:

```prisma
model UserFavoriteProperty {
  id         String   @id @default(cuid())
  userId     String
  propertyId String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  property   Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  createdAt  DateTime @default(now())

  @@unique([userId, propertyId])
  @@index([userId, createdAt])
  @@index([propertyId])
}
```

Adicionar as relações inversas em `User` e `Property`. O `userId` nunca deve vir do body ou de parâmetro controlado pelo cliente; ele deve ser derivado exclusivamente de `req.auth.userId`.

Contrato REST proposto:

- `GET /api/users/me/favorite-properties` — lista os imóveis favoritos do próprio usuário;
- `POST /api/users/me/favorite-properties/:propertyId` — salva de forma idempotente;
- `DELETE /api/users/me/favorite-properties/:propertyId` — remove de forma idempotente.

Todas exigem autenticação individual. O backend deve validar a existência e visibilidade pública do imóvel, impedir consulta ou mutação de favoritos de outro usuário e nunca aceitar `userId` substituto no request. Uma resposta de listagem deve retornar DTOs públicos de imóveis, sem dados administrativos da imobiliária.

## Artigos salvos

Artigos salvos são uma preferência do consumidor e não têm relação com autoria, edição ou administração do LarMap Explica.

Estrutura Prisma proposta:

```prisma
model UserSavedBlogPost {
  id        String   @id @default(cuid())
  userId    String
  postId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  post      BlogPost @relation(fields: [postId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([userId, postId])
  @@index([userId, createdAt])
  @@index([postId])
}
```

Adicionar as relações inversas em `User` e `BlogPost`.

Contrato REST proposto:

- `GET /api/users/me/saved-blog-posts` — lista somente posts salvos que continuam públicos;
- `POST /api/users/me/saved-blog-posts/:postId` — salva de forma idempotente;
- `DELETE /api/users/me/saved-blog-posts/:postId` — remove de forma idempotente.

Somente `BlogPost` com `status = PUBLISHED`, `deletedAt = null` e data de publicação já liberada pode ser salvo ou retornado. O backend deriva o usuário do token, impede acesso à lista de outra conta e não concede nenhuma permissão `blog:manage` por essa relação. Se um post deixar de ser público, ele não deve aparecer na listagem, ainda que o vínculo seja mantido para possível republicação.

## Upload do logo da imobiliária

**BACKEND NECESSÁRIO — upload persistente do logo.** O frontend valida PNG/JPG/JPEG de até 5 MB e mostra a pré-visualização local, mas não envia o arquivo enquanto não existir um contrato próprio. A alternativa por URL continua persistida por `PATCH /api/companies/me` nos campos `logoUrl` e `brandImageUrl`.

As rotas existentes não devem ser reutilizadas:

- `POST /api/properties/:id/images` exige um imóvel e cria `PropertyImage`;
- `POST /api/blog/admin/media` exige `blog:manage` e cria `BlogMedia`;
- `POST /api/profile/me/avatar` atualiza o perfil de um usuário, não a empresa.

Contrato recomendado:

```http
POST /api/companies/me/logo
Authorization: Bearer <token>
Content-Type: multipart/form-data

logo=<arquivo PNG, JPG ou JPEG; máximo 5 MB>
```

Regras obrigatórias:

- exigir COMPANY ou TECHNICAL com `company:manage` e escopo da empresa atual;
- campo multipart singular `logo`;
- aceitar `image/png` e `image/jpeg`, conferindo também assinatura/extensão segura;
- armazenar em pasta própria por empresa, sem base64 no banco;
- substituir o ativo anterior de forma atômica e retornar a empresa atualizada no envelope padrão;
- persistir a URL final em `logoUrl` e definir explicitamente se `brandImageUrl` será alias ou campo separado;
- implementar `DELETE /api/companies/me/logo` para remoção persistente e segura;
- rejeitar payloads acima de 5 MB e formatos inválidos com mensagens/códigos estáveis.

Também é necessário disponibilizar `GET /api/companies/me` com os dados administrativos completos. O DTO compacto de `GET /api/auth/me` não contém e-mail, contatos e endereço suficientes para preencher o formulário após um novo login.
