# Migração dos artigos históricos — LarMap Explica

Este documento é um plano de auditoria e preparação. A auditoria foi feita lendo o frontend e o backend localmente; nenhuma chamada à API de produção foi feita, nenhum banco foi alterado e nenhum mock foi removido.

Fontes auditadas:

- Frontend: `src/modules/blog/mocks/posts.mock.ts`, `authors.mock.ts`, `categories.mock.ts` e `media.mock.ts`.
- Backend somente leitura: `prisma/schema.prisma`, a migration `20260622000002_add_blog`, rotas, controllers e services de `src/services/blog`.

## Inventário

Existem **8 posts mockados**, todos com status `published`, todos atribuídos ao mock `author-pedro-mendes` e todos com datas `createdAt`, `publishedAt` e `updatedAt` iguais entre si. Nenhum post define `featured` ou `scheduledFor`.

| Mock ID | Título | Slug | Autor / authorId | Categoria | Status / featured | Data original / leitura | Capa | Situação |
|---|---|---|---|---|---|---|---|---|
| `post-financiamento-imovel-2026` | Como financiar um imóvel em 2026: o que você precisa saber antes de começar | `como-financiar-um-imovel-em-2026-o-que-voce-precisa-saber-antes-de-comecar` | Pedro Mendes / `author-pedro-mendes` | `financiamento` | published / ausente → false | `2026-06-02T12:00:00.000Z` / 4 min | `media-financiamento-2026` | URL HTTPS externa absoluta; pode ser usada diretamente após validação de licença e disponibilidade |
| `post-apartamento-ou-casa-2026` | Apartamento ou casa: qual opção faz mais sentido para você em 2026? | `apartamento-ou-casa-qual-opcao-faz-mais-sentido-para-voce-em-2026` | Pedro Mendes / `author-pedro-mendes` | `compra` | published / ausente → false | `2026-06-07T12:00:00.000Z` / 3 min | `media-apartamento-casa` | URL HTTPS externa absoluta; pode ser usada diretamente após validação de licença e disponibilidade |
| `post-imovel-na-planta-2026` | Imóvel na planta vale a pena em 2026? O que ninguém te conta antes da compra | `imovel-na-planta-vale-a-pena-em-2026-o-que-ninguem-te-conta-antes-da-compra` | Pedro Mendes / `author-pedro-mendes` | `investimentos` | published / ausente → false | `2026-06-12T12:00:00.000Z` / 3 min | `media-imovel-planta` | URL HTTPS externa absoluta; pode ser usada diretamente após validação de licença e disponibilidade |
| `post-valorizar-imovel-venda` | Como valorizar um imóvel antes da venda e atrair mais compradores | `como-valorizar-um-imovel-antes-da-venda-e-atrair-mais-compradores` | Pedro Mendes / `author-pedro-mendes` | `mercado` | published / ausente → false | `2026-06-18T12:00:00.000Z` / 3 min | `media-valorizacao-venda` | URL HTTPS externa absoluta; pode ser usada diretamente após validação de licença e disponibilidade |
| `post-escolher-imobiliaria-certa` | Como escolher a imobiliária certa e evitar dores de cabeça na negociação | `como-escolher-a-imobiliaria-certa-e-evitar-dores-de-cabeca-na-negociacao` | Pedro Mendes / `author-pedro-mendes` | `guias` | published / ausente → false | `2026-06-23T12:00:00.000Z` / 3 min | `media-imobiliaria-negociacao` | URL HTTPS externa absoluta; pode ser usada diretamente após validação de licença e disponibilidade |
| `post-documentacao-compra-imovel` | Documentação necessária para comprar um imóvel sem dor de cabeça | `documentacao-necessaria-para-comprar-um-imovel-sem-dor-de-cabeca` | Pedro Mendes / `author-pedro-mendes` | `compra` | published / ausente → false | `2026-06-28T12:00:00.000Z` / 3 min | `media-documentacao-imovel` | URL HTTPS externa absoluta; pode ser usada diretamente após validação de licença e disponibilidade |
| `post-tendencias-mercado-imobiliario-2026` | Tendências do mercado imobiliário em 2026: o que esperar dos próximos anos | `tendencias-do-mercado-imobiliario-em-2026-o-que-esperar-dos-proximos-anos` | Pedro Mendes / `author-pedro-mendes` | `mercado` | published / ausente → false | `2026-07-03T12:00:00.000Z` / 3 min | `media-tendencias-mercado` | URL HTTPS externa absoluta; pode ser usada diretamente após validação de licença e disponibilidade |
| `post-primeira-compra-imovel-erros` | Primeira compra de imóvel: os erros mais comuns que você deve evitar | `primeira-compra-de-imovel-os-erros-mais-comuns-que-voce-deve-evitar` | Pedro Mendes / `author-pedro-mendes` | `compra` | published / ausente → false | `2026-07-07T12:00:00.000Z` / 3 min | `media-primeira-compra` | URL HTTPS externa absoluta; pode ser usada diretamente após validação de licença e disponibilidade |

### Resumos e tags

Os resumos abaixo são os valores dos mocks; o script não os reescreve.

| Mock ID | Summary | Tags enviadas à API por nome |
|---|---|---|
| `post-financiamento-imovel-2026` | Veja como financiar um imóvel em 2026, quais documentos são necessários e o que fazer para aumentar suas chances de aprovação. | financiamento; imóvel; FGTS; crédito imobiliário |
| `post-apartamento-ou-casa-2026` | Descubra as principais diferenças entre apartamento e casa e veja qual opção combina mais com seu estilo de vida e orçamento. | compra; apartamento; casa; imóvel |
| `post-imovel-na-planta-2026` | Descubra as vantagens, os riscos e os principais cuidados antes de comprar um imóvel na planta em 2026. | imóvel na planta; investimento; construtora; valorização |
| `post-valorizar-imovel-venda` | Veja como valorizar seu imóvel antes da venda com estratégias simples que ajudam a aumentar o interesse dos compradores. | venda; valorização; imóvel; fotos |
| `post-escolher-imobiliaria-certa` | Aprenda como escolher uma boa imobiliária para comprar, vender ou alugar imóveis com mais segurança e tranquilidade. | imobiliária; negociação; CRECI; segurança |
| `post-documentacao-compra-imovel` | Veja quais documentos são necessários para comprar um imóvel com segurança e evitar problemas futuros na negociação. | documentação; cartório; escritura; compra |
| `post-tendencias-mercado-imobiliario-2026` | Conheça as principais tendências do mercado imobiliário em 2026 e veja o que pode influenciar preços, investimentos e valorização. | mercado imobiliário; tendências; tecnologia; investimento |
| `post-primeira-compra-imovel-erros` | Veja os principais erros cometidos na primeira compra de imóvel e saiba como evitar prejuízos e decisões impulsivas. | primeiro imóvel; compra; financiamento; documentação |

## Autores

Há **1 autor mockado**:

| Mock ID | Nome | Cargo | Avatar/bio |
|---|---|---|---|
| `author-pedro-mendes` | Pedro Mendes | Desenvolvedor da plataforma LarMap | `avatarUrl=/assets/pedro-mendes.webp` (o arquivo existe em `public/assets`); bio: Desenvolvedor do ecossistema LarMap. |

O schema real usa `BlogAuthor.id`, `nome`, `cargo`, `foto`, `bio`, `linkedin`, `instagram` e `publicEmail`. O `id` mockado nunca é enviado. O script faz `GET /api/blog/authors` com o token, busca nome exato normalizado e usa o `id` retornado pelo banco. Cargo é usado como segundo critério quando disponível. Zero candidatos ou mais de um candidato aborta o post; nenhum autor é criado automaticamente.

O avatar local do mock não é convertido nem associado automaticamente ao autor real: a rota de autores só lista autores e não há uma operação de atualização de autor no fluxo preparado. O autor real deve ser conferido antes.

## Categorias

Há **10 categorias definidas nos mocks**; **5 são usadas pelos 8 posts**. `postCount` do mock é apenas metadado de UI e não deve ser migrado: o backend calcula a contagem de publicações.

| Mock ID | Slug | Nome | Usada pelos posts |
|---|---|---|---:|
| `cat-mercado` | `mercado` | Mercado | 2 |
| `cat-compra` | `compra` | Compra | 3 |
| `cat-aluguel` | `aluguel` | Aluguel | 0 |
| `cat-financiamento` | `financiamento` | Financiamento | 1 |
| `cat-investimentos` | `investimentos` | Investimentos | 1 |
| `cat-guias` | `guias` | Guias | 1 |
| `cat-construcao` | `construcao` | Construção | 0 |
| `cat-decoracao` | `decoracao` | Decoração | 0 |
| `cat-larmap` | `larmap` | LarMap | 0 |
| `cat-noticias` | `noticias` | Notícias | 0 |

O mapeamento usa `slug` canônico, nunca `cat-*`. O script faz `GET /api/blog/categories`; quando encontra a categoria, envia o `id` real dentro de `categoryIds`. Quando não encontra, registra pendência e aborta o post. Existe suporte opcional, desligado por padrão, para `POST /api/blog/categories` com nome, descrição e cor; ele só pode ser usado junto com a confirmação global de execução.

No schema, categorias são relações `BlogPostCategory` muitos-para-muitos. O mock tem uma categoria singular, portanto a adaptação é uma lista com um ID real.

## Imagens

Há **10 mídias mockadas**: 8 imagens usadas como capas, 1 vídeo e 1 PDF não referenciados pelos posts. As 8 capas são simultaneamente classificáveis como **A — URL pública absoluta** e **D — URL externa**, todas HTTPS no domínio `images.unsplash.com`. Não há capa `/assets/...`, arquivo local de capa ou capa ausente.

| Media ID | Arquivo mock | URL | Classificação / decisão |
|---|---|---|---|
| `media-financiamento-2026` | `financiamento-imovel-2026.jpg` | `https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=82` | Externa pública; o script pode manter a URL, após validar licença, permanência e hotlink |
| `media-apartamento-casa` | `apartamento-ou-casa-2026.jpg` | `https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=82` | Externa pública; mesma validação |
| `media-imovel-planta` | `imovel-na-planta-2026.jpg` | `https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=82` | Externa pública; mesma validação |
| `media-valorizacao-venda` | `valorizar-imovel-venda.jpg` | `https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=82` | Externa pública; mesma validação |
| `media-imobiliaria-negociacao` | `imobiliaria-negociacao.jpg` | `https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=82` | Externa pública; mesma validação |
| `media-documentacao-imovel` | `documentacao-compra-imovel.jpg` | `https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=82` | Externa pública; mesma validação |
| `media-tendencias-mercado` | `tendencias-mercado-imobiliario-2026.jpg` | `https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1200&q=82` | Externa pública; mesma validação |
| `media-primeira-compra` | `primeira-compra-imovel.jpg` | `https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=82` | Externa pública; mesma validação |

Mídias adicionais não usadas como capa: `media-video-tour` aponta para YouTube e `media-pdf-checklist` para `example.com`; não entram na migração dos 8 artigos.

No schema, `BlogMedia` não tem `alt` nem `thumbnailUrl` e usa `size` numérico, enquanto o mock usa tamanho textual. O endpoint `POST /api/blog/media` recebe arquivo multipart e faz upload para Cloudinary. Para as capas atuais, passar a URL externa em `BlogPost.coverImage` é tecnicamente compatível; para uma política de propriedade e disponibilidade controlada, a opção recomendada é hospedar em HTTPS do LarMap ou enviar os arquivos pelo endpoint de mídia/Cloudinary antes de criar os posts. O script não baixa nem envia URLs externas automaticamente.

## Conteúdo

`post.content` é uma **string HTML**, não Tiptap JSON. Os 8 posts usam os elementos `p`, `h2`, `ul` e `li`; não foram encontrados `a`, `img`, `strong`, `em`, `blockquote`, `table`, `iframe` ou outros embeds nos conteúdos atuais. O texto original contém headings, parágrafos e listas e permanece intacto nos mocks.

O backend declara `BlogPost.content` como `Json` e seu cálculo de leitura percorre nós Tiptap procurando `type=text`. Portanto, enviar o HTML original como string faria o backend calcular leitura incorretamente e não atenderia ao contrato pretendido.

O script converte em memória:

- documento Tiptap com `type: "doc"`;
- parágrafos, headings, listas ordenadas e não ordenadas e itens de lista;
- links e imagens com seus atributos;
- bold, italic, underline, strike, code, highlight e estilos de texto;
- blockquote, code block, regra horizontal, tabelas e embeds YouTube quando presentes;
- strings JSON Tiptap já compatíveis, sem reconvertê-las.

Nenhum arquivo de mock é regravado. O frontend agora usa `BlogPostContent`, que renderiza documentos Tiptap pelo `EditorContent` e interpreta temporariamente strings HTML pelo mesmo schema. O adapter da API preserva o JSON como objeto, e o editor administrativo envia `getJSON()` no payload. O suporte a HTML legado deve permanecer somente durante a transição e ser removido depois da conferência dos 8 artigos.

## Comparação com o schema e API reais

| Campo mock | Campo/contrato real | Classificação | Tratamento preparado |
|---|---|---|---|
| `id` | `BlogPost.id` | Não é migração direta | Apenas chave do manifest; o banco gera novo ID |
| `title` | `BlogPost.title` | Migração direta | Enviado no POST |
| `slug` | `BlogPost.slug` único | Precisa de adaptação | O service real gera pelo título; o `slug` enviado é ignorado. O script pré-verifica e aborta se a API retornar slug diferente |
| `summary` | `BlogPost.summary` nullable | Migração direta | Enviado como texto |
| `content` | `BlogPost.content Json` | Precisa de adaptação | HTML convertido em Tiptap JSON em memória |
| `coverImage` | `BlogPost.coverImage String?` | Precisa de adaptação | Objeto `MediaFile` vira URL; IDs de mídia mock não são enviados |
| `author` | relação `BlogAuthor` | Precisa de adaptação | Busca inequívoca por nome/cargo e usa ID real |
| `authorId` | `BlogPost.authorId` | Não existe diretamente no mock | O mock possui `author.id` mockado; ele nunca é usado como ID real |
| `category` / `categories` | relação `BlogPostCategory` | Precisa de adaptação | Slug real → ID real → `categoryIds: [id]` |
| `tags` | `BlogTag` + `BlogPostTag` | Precisa de adaptação | Envia `tagNames`; o backend faz upsert por nome/slug |
| `featured` | `BlogPost.featured` | Ausente no mock; backend calcula/default | Usa `false` |
| `status` | `BlogPostStatus` | Precisa de adaptação | Criação começa como DRAFT; depois usa publish/schedule quando seguro |
| `publishedAt` | `BlogPost.publishedAt DateTime?` | Existe, mas API calcula | Publish usa o momento atual; data histórica exige banco |
| `scheduledFor` | `BlogPost.scheduledFor DateTime?` | Existe e há endpoint | Só existe em posts futuros; a API rejeita datas passadas |
| `readingTimeMinutes` | `BlogPost.readingTime Int?` | Backend calcula automaticamente | Não é enviado; o script calcula e avisa divergência |
| `createdAt` | `BlogPost.createdAt @default(now())` | Backend calcula automaticamente | Criação usa o momento atual; preservação exige banco |
| `updatedAt` | `BlogPost.updatedAt @updatedAt` | Backend calcula automaticamente | API atualiza para o momento da operação; preservação exige banco |

O `POST /api/blog/posts` aceita título, resumo, conteúdo JSON, capa, `authorId`, `categoryIds`, `tagNames` e `featured`; o service não usa o `status`, `slug`, `publishedAt`, `scheduledFor`, `createdAt` ou `updatedAt` do corpo. O script não finge que esses campos são aceitos.

Tags devem continuar sendo enviadas por nome, nunca por IDs mockados. O service atual cria/atualiza tags globalmente por um slug derivado de `name.toLowerCase().replace(/\\s+/g, '-')`; tags acentuadas precisam ser conferidas depois porque esse slug não é a mesma normalização usada pelo frontend.

## Datas

Todos os 8 mocks têm datas históricas anteriores ao momento de uma futura execução. O endpoint de publicação faz explicitamente `publishedAt: new Date()`, além de zerar `scheduledFor`. Criação usa o default atual do banco e atualização usa `@updatedAt`. Não foi encontrada no backend atual uma forma documentada e segura de definir `publishedAt`, `createdAt` e `updatedAt` históricos pela API.

**MIGRAÇÃO DE BANCO NECESSÁRIA PARA PRESERVAR DATAS HISTÓRICAS.**

O processo posterior deve ser separado:

1. Fazer backup e criar os artigos pela API, mantendo o `mockId -> databaseId` no manifest.
2. Aplicar as transições de status pela API quando aplicável.
3. Em operação controlada no backend/DB, abrir uma transação.
4. Para cada entrada do manifest, atualizar somente o registro identificado por `databaseId` e, idealmente, também pelo `companyId` esperado:

   ```sql
   BEGIN;

   UPDATE "BlogPost"
   SET "createdAt" = :createdAt,
       "updatedAt" = :updatedAt,
       "publishedAt" = :publishedAt,
       "scheduledFor" = :scheduledFor
   WHERE "id" = :databaseId
     AND "companyId" = :companyId
     AND "deletedAt" IS NULL;

   -- exigir exatamente uma linha afetada para cada item;
   -- qualquer divergência deve provocar ROLLBACK.

   COMMIT;
   ```

5. Usar parâmetros, validar `rowCount === 1`, abortar a transação em qualquer erro e conferir os valores após o commit.

Essa operação deve ocorrer fora do frontend, sem adicionar segredo ou URL de banco ao repositório. Para preservar `updatedAt` exatamente, SQL transacional controlado é preferível a um update normal sujeito ao comportamento de `@updatedAt`. O manifest é a barreira contra atualizar artigos que não pertencem à migração.

Não há posts `scheduled` ou `archived` nos mocks atuais. Se aparecer um `SCHEDULED` histórico, a API só aceita data futura. Para `ARCHIVED`, o endpoint DELETE faz soft delete e altera `deletedAt`, não sendo uma transição neutra para esta migração; o script aborta esse status e exige decisão específica.

## Riscos

- O renderer público e o preview administrativo agora aceitam Tiptap JSON e HTML legado por uma camada central; a validação visual continua necessária antes do primeiro publish real.
- O backend ignora o slug enviado e pode gerar sufixo em caso de colisão. O script aborta em vez de aceitar um slug diferente.
- A publicação é uma segunda requisição e grava a hora atual. Uma falha entre criação e publicação deixa um draft; o manifest e a retomada por slug evitam duplicação.
- Não há endpoint para preservar as quatro datas históricas; sem a etapa de banco, as datas serão atuais.
- Autor ausente ou ambíguo bloqueia somente o post afetado; IDs mockados não têm validade no banco.
- Categorias são globais e têm slug único; categoria inexistente precisa de aprovação antes de criação.
- Tags são upsertadas automaticamente e o slug derivado pelo backend pode tratar acentos de forma diferente.
- URLs Unsplash são externas: podem mudar, limitar hotlink, falhar ou não ter licença adequada para uso comercial. A opção controlada é hospedar no LarMap/Cloudinary.
- A capa do post é uma string no schema; `alt` e `thumbnailUrl` do mock não têm campo correspondente em `BlogPost`.
- O endpoint de lista do backend é paginado e a implementação observada não restringe explicitamente `companyId` no `listPostsService`; o script trata colisões como conflito, mas essa condição deve ser revisada antes da produção.
- A operação API não é uma transação única entre criação, tags, publicação e manifest; o processo precisa de backup, logs e validação pós-migração.
- A conversão HTML → JSON é determinística, mas ainda precisa de comparação visual e de conteúdo por artigo.

## Processo de migração

1. Validar o contrato de leitura Tiptap no frontend com o backend publicado, antes do cutover.
2. Fazer backup do banco e confirmar ambiente, empresa/token e permissões administrativas.
3. Conferir os oito autores/categorias/capas no relatório; resolver pendências manualmente.
4. Executar o dry-run com token real de leitura/admin. O dry-run somente consulta autores, categorias e posts e mostra POSTs planejados.
5. Revisar o relatório do dry-run, conflitos de slug, divergências de reading time e a estratégia de imagens.
6. Se necessário, criar categorias aprovadas com `POST /api/blog/categories`, sempre com confirmação explícita.
7. Executar a migração real em lotes pequenos. Cada post resolve autor, categoria, tags e capa; verifica duplicidade; cria; aplica status; grava o manifest.
8. Se a execução for interrompida, corrigir a causa e executar novamente. O manifest pula itens concluídos e a busca por slug/título retoma um post criado sem duplicá-lo.
9. Aplicar a etapa separada de datas históricas numa transação de banco, com o mapeamento do manifest.
10. Fazer a conferência pós-migração antes de remover qualquer mock. Os mocks devem continuar no frontend até a aprovação formal.

## Manifest e idempotência

O arquivo de estado é `scripts/.blog-migration-manifest.json` por padrão e só é criado no modo execute confirmado. O formato mínimo é:

```json
{
  "mock-post-id": {
    "databaseId": "id-real-do-banco",
    "slug": "slug-canonico",
    "migratedAt": "2026-08-18T00:00:00.000Z"
  }
}
```

O script também guarda as datas históricas para a etapa posterior. Sem manifest, ele procura posts existentes por slug e título; se o conteúdo ou metadados principais divergirem, aborta e não sobrescreve o post.

## Validação pós-migração

- [ ] Backup restaurável confirmado.
- [ ] Contagem: 8 mocks → 8 posts reais, sem cópias.
- [ ] Cada `mockId` possui um único `databaseId` no manifest.
- [ ] Slugs reais conferidos contra os oito slugs canônicos.
- [ ] Título, resumo e conteúdo conferidos artigo a artigo.
- [x] Conteúdo Tiptap renderiza headings, parágrafos e listas no frontend público.
- [ ] Autor Pedro Mendes conferido pelo ID real, sem uso do ID mock.
- [ ] Categorias conferidas por slug; Compra aparece em 3 posts e Mercado em 2.
- [ ] Tags conferidas por nome e relações reais.
- [ ] Capas carregam em HTTPS e sua licença/origem foi aprovada.
- [ ] `readingTime` real conferido; divergências em relação ao mock foram aceitas conscientemente.
- [ ] Status final conferido; nenhum post foi publicado involuntariamente.
- [ ] `createdAt`, `updatedAt`, `publishedAt` e `scheduledFor` conferidos após a etapa transacional de datas.
- [ ] Nenhum artigo fora do manifest foi alterado.
- [ ] Cache, sitemap, SEO e URLs públicas conferidos.
- [ ] Mocks preservados até a aprovação final.

## Como executar futuramente

O script ainda **não foi executado**. A partir da raiz do frontend, em PowerShell:

### Dry-run (padrão)

```powershell
$env:LARMAP_API_URL = "https://seu-backend.example.com"
$env:LARMAP_MIGRATION_TOKEN = "token temporario de migracao"
$env:BLOG_MIGRATION_MODE = "dry-run"
node .\scripts\migrate-blog-mocks.mjs
```

`LARMAP_API_URL` pode terminar em `/api`; o script normaliza a URL. O token deve ser fornecido pelo ambiente seguro, nunca gravado no Git. O dry-run faz GETs para resolver dados reais e não cria, edita, publica, agenda ou altera banco.

### Migração real — somente após aprovação

```powershell
$env:LARMAP_API_URL = "https://seu-backend.example.com"
$env:LARMAP_MIGRATION_TOKEN = "token temporario de migracao"
$env:BLOG_MIGRATION_MODE = "execute"
$env:BLOG_MIGRATION_CONFIRM = "YES"
node .\scripts\migrate-blog-mocks.mjs
```

Sem as duas condições (`BLOG_MIGRATION_MODE=execute` e `BLOG_MIGRATION_CONFIRM=YES`), qualquer escrita é bloqueada. Por padrão, categoria ausente aborta; a criação opcional exige também `BLOG_MIGRATION_CREATE_MISSING_CATEGORIES=YES`. Para capas locais futuras, usar `BLOG_MIGRATION_IMAGE_MODE=upload`; para uma URL hospedada aprovada, usar o mapa `BLOG_MIGRATION_IMAGE_URL_MAP_JSON`. As capas externas atuais não são baixadas automaticamente.

Não configurar segredo de banco no frontend e não executar a etapa histórica SQL a partir deste script.
