# LarMap — Release de Transição

## O que pode ir para produção

- O mapa e a listagem pública continuam usando `VITE_API_URL=/api` e o proxy atual para o backend publicado.
- As sessões `NEW_AUTH_SESSION` e `LEGACY_COMPANY_SESSION` continuam compatíveis. Falha `404`/`405` em `/auth/me` preserva a sessão legada; `401` a invalida e `403` não a apaga.
- Favoritos de imóveis e artigos salvos continuam locais para não remover dados já existentes no dispositivo.
- O LarMap Explica continua publicando os oito artigos históricos, inclusive se a API do blog estiver indisponível.
- A página de imóvel continua aceitando o DTO antigo de `/api/public/properties`. Links de perfil só aparecem quando `agentPublicSlug` vier explicitamente no DTO.

## Features temporariamente desabilitadas

Defaults deste release, centralizados em `src/config/features.ts`:

| Flag | Default |
| --- | --- |
| `PUBLIC_REGISTRATION` | `false` |
| `BLOG_ADMIN` | `false` |
| `SERVER_SAVED_ITEMS` | `false` |
| `PROFESSIONAL_SELF_PROFILE` | `false` |
| `PUBLIC_COMPANY_PROFILE` | `false` |
| `BLOG_LEGACY_MOCKS` | `true` |

O frontend aceita `VITE_FEATURE_<FLAG>=true|false` (e, para o cutover, `VITE_<FLAG>`). Não configurar essas variáveis neste deploy mantém os defaults acima. Com `PUBLIC_REGISTRATION=false`, a Navbar só oferece entrada e `/register` informa indisponibilidade sem enviar nenhum dado ao backend. Com `BLOG_ADMIN=false`, as rotas e a navegação do novo admin do blog não são expostas.

## Estratégia API + mocks do blog

O adaptador público em `src/modules/blog/services/publicBlog.service.ts` busca temporariamente até 50 posts públicos da API, normaliza o resultado existente do `blog.service.ts` e aplica `mergeWithLegacyPosts()`.

- A identidade canônica é `slug`.
- Os mocks entram primeiro; um post da API com o mesmo `slug` substitui o mock.
- O conjunto final é ordenado por `publishedAt` decrescente. Datas ausentes ou inválidas ficam ao fim sem alterar a data do mock.
- Busca, categoria, featured, limite e exclusão são aplicados depois do merge, no frontend.
- Categorias da API e dos mocks são deduplicadas por `slug`; os metadados da API prevalecem e as contagens vêm do conjunto final.
- No detalhe, a API é tentada primeiro; `404`, indisponibilidade ou qualquer outra falha não escondem um mock de mesmo `slug`.

Essa paginação no cliente é temporária e deve ser removida após a migração dos oito artigos para a API com um contrato de paginação canônico.

## Compatibilidade com backend antigo

`GET /api/blog/posts`, detalhe e categorias podem retornar `404`, `502`, `503`, `504` ou falhar por rede sem esvaziar o blog público enquanto `BLOG_LEGACY_MOCKS=true`. O sitemap usa a mesma camada e preserva as URLs dos mocks durante o build.

O admin do blog continua sem usar mocks. Ele fica guardado pela flag até que `/api/blog/admin/*` esteja aprovado e publicado.

Não houve mudança de `netlify.toml`, de `VITE_API_URL=/api`, do proxy de produção, do backend, de banco, migrations, backfills ou conteúdo dos mocks.

## Keep-alive

`netlify/functions/larmap-keep-alive.mjs` é uma Scheduled Function com cron `*/10 * * * *`. Ela faz um `GET` com timeout de 8 segundos para a URL configurada, registra apenas status ou tipo de erro e sempre encerra sem transformar uma indisponibilidade momentânea do backend em falha do deploy.

## Variáveis Netlify necessárias

Cadastre a variável de ambiente da função:

```text
LARMAP_KEEP_ALIVE_URL=https://smartmap-backend.onrender.com/api/health
```

Não é necessário cadastrar flags Vite para este release. Só adicione `VITE_FEATURE_*` em um cutover deliberado e depois de validar o respectivo endpoint.

## Checklist antes do deploy

- [ ] Confirmar `LARMAP_KEEP_ALIVE_URL` no site Netlify de produção.
- [ ] Manter `VITE_API_URL=/api` e os redirects atuais intactos.
- [ ] Não habilitar `PUBLIC_REGISTRATION`, `BLOG_ADMIN`, `SERVER_SAVED_ITEMS`, `PROFESSIONAL_SELF_PROFILE` ou `PUBLIC_COMPANY_PROFILE`.
- [ ] Conferir que `BLOG_LEGACY_MOCKS` está ausente ou em `true`.
- [ ] Executar `npm run typecheck` e `npm run build` no commit a publicar.
- [ ] Revisar `dist/sitemap-blog.xml` e confirmar as oito URLs históricas.

## Checklist depois do deploy

- [ ] Abrir `/blog` com o backend antigo e confirmar os oito artigos.
- [ ] Abrir pelo menos um `/blog/:slug` histórico e confirmar conteúdo HTML legado.
- [ ] Conferir `/register`: deve informar indisponibilidade e não criar Company.
- [ ] Conferir que a Navbar deslogada oferece apenas `Entrar`.
- [ ] Verificar favoritos e artigos salvos existentes no mesmo navegador.
- [ ] Conferir uma página de imóvel sem `agentPublicSlug`: não deve exibir link inventado de perfil.
- [ ] Conferir logs da função agendada: somente status/erro, sem URL ou segredo.

## O que será ativado quando backend novo entrar

1. Validar os endpoints públicos do blog em produção; a API já passará a complementar os mocks e substituirá cada mock pelo mesmo `slug`.
2. Migrar os oito artigos por processo aprovado; somente então desabilitar `BLOG_LEGACY_MOCKS`.
3. Depois de validar `/api/blog/admin/*`, habilitar `BLOG_ADMIN` e revisar o adapter administrativo separadamente.
4. Depois de validar cadastro COMMON, ativar `PUBLIC_REGISTRATION`; só então evoluir favoritos e artigos salvos para `SERVER_SAVED_ITEMS`.
5. Depois de publicar e validar os perfis, ativar as flags de perfil aplicáveis. Nenhum slug deve ser gerado no cliente.
