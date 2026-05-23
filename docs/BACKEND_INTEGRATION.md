# LarMap Frontend - Guia de Integracao para Backend

Este documento descreve como o frontend LarMap conversa com a API hoje, quais contratos ele espera e quais pontos ainda usam fallback local enquanto o backend nao esta completo.

## Stack e Execucao

- Frontend: React 19, TypeScript, Vite e React Router.
- Mapas: Leaflet e React Leaflet.
- Cliente HTTP: `fetch` centralizado em `src/api/client.ts`.
- Variavel de ambiente: `VITE_API_URL`.
- Em desenvolvimento e producao, `.env` usa `VITE_API_URL=https://smartmap-backend.onrender.com`.
- O cliente HTTP normaliza essa base para chamar os endpoints em `/api`.
- `VITE_API_BASE_URL` ainda e aceito como fallback de compatibilidade.
- Se nenhuma variavel for definida, o cliente cai para `/api`; o `vite.config.ts` mantem proxy de `/api` para `https://smartmap-backend.onrender.com` em desenvolvimento.
- `.env` nao deve ir para o GitHub. Use `.env.example` como base.

## Formato de Resposta Esperado

O frontend espera preferencialmente respostas neste envelope:

```json
{
  "success": true,
  "message": "Opcional",
  "data": {}
}
```

Para erros:

```json
{
  "success": false,
  "error": {
    "message": "Mensagem legivel para o usuario",
    "code": "CODIGO_OPCIONAL"
  }
}
```

Observacoes importantes:

- O frontend envia `Content-Type: application/json` nas rotas atuais.
- Rotas autenticadas recebem `Authorization: Bearer <token>`.
- Para listagens de imoveis, o frontend tolera alguns formatos dentro de `data`, como array direto ou objetos com `properties`, `items`, `results` ou `data`.
- Mesmo assim, o formato recomendado e sempre `{ success: true, data: ... }`.

## Rotas Publicas do Frontend

- `/`: Home publica.
- `/mapa`: Mapa interativo publico.
- `/novidades`: Pagina publica de novidades/destaques.
- `/favoritos`: Favoritos locais do usuario comum.
- `/login` e `/register`: fluxo publico legado.
- `/admin/login`: login administrativo.

## Rotas Administrativas do Frontend

Todas exigem token no `localStorage`:

- `/admin/dashboard`
- `/admin/imoveis`
- `/admin/corretores`
- `/admin/leads`
- `/admin/desempenho`
- `/admin/configuracoes`
- `/admin/corretor`

Se `user.role === "agent"`, o usuario autenticado e enviado para `/admin/corretor`. Caso contrario, vai para `/admin/dashboard`.

## LocalStorage Usado pelo Frontend

O backend nao precisa manipular estes valores diretamente, mas eles explicam alguns fallbacks atuais:

- `larmap.authToken`: token JWT retornado no login.
- `larmap.company`: dados da imobiliaria autenticada.
- `larmap.user`: usuario autenticado.
- `larmap.localLeads`: fallback local para leads quando a API ainda nao responde.
- `larmap.admin.localProperties`: fallback local para imoveis cadastrados quando a listagem da API falha.
- `larmap.recentlyViewed`: ultimos imoveis vistos na Home.
- `larmap.favorites`: favoritos do usuario publico.

Chaves legadas `smartmap.*` sao migradas automaticamente para `larmap.*` quando lidas pelo frontend.

## Endpoints Consumidos

### Health

`GET /health`

Resposta esperada:

```json
{
  "success": true,
  "data": {
    "message": "ok",
    "timestamp": "2026-05-06T12:00:00.000Z"
  }
}
```

### Autenticacao

`POST /auth/register`

Body:

```json
{
  "name": "Imobiliaria Exemplo",
  "email": "admin@empresa.com",
  "password": "Senha@2026",
  "phone": "+55 21 99999-0000",
  "whatsapp": "+55 21 99999-0000",
  "brandImageUrl": "https://...",
  "logoUrl": "https://...",
  "headquartersStreet": "Rua Exemplo",
  "headquartersNumber": "123",
  "headquartersComplement": "Sala 301",
  "headquartersNeighborhood": "Centro",
  "headquartersCity": "Rio de Janeiro",
  "headquartersState": "RJ",
  "headquartersPostalCode": "20000-000",
  "headquartersAddress": "Rua Exemplo, 123, Centro, Rio de Janeiro, RJ, 20000-000"
}
```

Resposta recomendada:

```json
{
  "success": true,
  "data": {
    "id": "company-id",
    "name": "Imobiliaria Exemplo",
    "email": "admin@empresa.com"
  }
}
```

Observacao: o frontend faz login logo apos registrar. Se o backend ainda nao aceitar os campos completos da imobiliaria, o frontend tenta um fallback com dados minimos e depois chama update da empresa.

`POST /auth/login`

Body:

```json
{
  "email": "admin@empresa.com",
  "password": "Senha@2026"
}
```

Resposta:

```json
{
  "success": true,
  "data": {
    "token": "jwt",
    "company": {
      "id": "company-id",
      "name": "Imobiliaria Exemplo",
      "email": "admin@empresa.com"
    },
    "user": {
      "id": "user-id",
      "name": "Administrador",
      "email": "admin@empresa.com",
      "role": "admin",
      "companyId": "company-id",
      "createdAt": "2026-05-06T12:00:00.000Z",
      "updatedAt": "2026-05-06T12:00:00.000Z"
    }
  }
}
```

### Empresa / Imobiliaria

O frontend tenta, nesta ordem:

- `PATCH /companies/me`
- `PATCH /company`
- `PATCH /companies`

Recomendacao: implementar `PATCH /companies/me`.

Body: `UpdateCompanyInput`

Campos:

- `name`
- `email`
- `phone`
- `whatsapp`
- `brandImageUrl`
- `logoUrl`
- `headquartersStreet`
- `headquartersNumber`
- `headquartersComplement`
- `headquartersNeighborhood`
- `headquartersCity`
- `headquartersState`
- `headquartersPostalCode`
- `headquartersAddress`

Campos obrigatorios do produto:

- Nome da imobiliaria.
- Email corporativo.
- Foto de marca/logomarca.
- Endereco completo da sede.

### Usuarios / Corretores

`GET /users?limit=100&offset=0&role=agent`

Resposta:

```json
{
  "success": true,
  "data": {
    "users": [],
    "total": 0,
    "limit": 100,
    "offset": 0,
    "pages": 0,
    "currentPage": 1,
    "itemsPerPage": 100
  }
}
```

`POST /users`

Body:

```json
{
  "name": "Nome do corretor",
  "email": "corretor@empresa.com",
  "phone": "+55 21 99999-0000",
  "role": "agent"
}
```

`PATCH /users/:id`

Body parcial com `name`, `phone` e/ou `role`.

`DELETE /users/:id`

Sem body.

### Imoveis

Listagem autenticada:

`GET /properties`

Listagem publica. O frontend tenta nesta ordem:

- `GET /public/properties`
- `GET /properties/public`
- `GET /map/properties`
- `GET /properties`

Recomendacao: implementar `GET /public/properties` para visitantes e `GET /properties` para painel administrativo.

Criacao:

`POST /properties`

Atualizacao:

`PATCH /properties/:id`

Remocao:

`DELETE /properties/:id`

Contrato principal de `Property`:

```json
{
  "id": "property-id",
  "title": "Apartamento com vista",
  "description": "Descricao do anuncio",
  "latitude": -22.9068,
  "longitude": -43.1729,
  "status": "AVAILABLE",
  "propertyType": "apartamento",
  "listingType": "venda",
  "bedrooms": 3,
  "bathrooms": 2,
  "parkingSpots": 1,
  "price": 850000,
  "street": "Avenida Atlantica",
  "addressNumber": "1000",
  "buildingName": "Nome do Edificio",
  "apartmentNumber": "301",
  "complement": "Bloco A",
  "neighborhood": "Copacabana",
  "city": "Rio de Janeiro",
  "state": "RJ",
  "postalCode": "22000-000",
  "address": "Avenida Atlantica, 1000, Nome do Edificio, 301, Copacabana, Rio de Janeiro, RJ, 22000-000",
  "agentId": "user-id",
  "responsibleAgentId": "user-id",
  "agentName": "Nome do corretor",
  "responsibleAgentName": "Nome do corretor",
  "images": ["https://..."],
  "imageUrls": ["https://..."],
  "videos": ["https://..."],
  "videoUrls": ["https://..."],
  "media": [
    {
      "type": "image",
      "url": "https://..."
    }
  ],
  "contactPhone": "+55 21 99999-0000",
  "contactWhatsApp": "+55 21 99999-0000",
  "companyId": "company-id",
  "createdAt": "2026-05-06T12:00:00.000Z",
  "updatedAt": "2026-05-06T12:00:00.000Z"
}
```

Valores importantes:

- `status`: `AVAILABLE`, `NEGOTIATING` ou `SOLD`.
- `listingType`: usar exatamente `venda` ou `aluguel`. Isso e essencial para as paginas de compra/aluguel nao misturarem imoveis.
- `price`: numero inteiro ou decimal. O frontend formata como moeda brasileira.
- `latitude` e `longitude`: obrigatorios para o mapa.
- `city`, `state`, `neighborhood`, `street`, `addressNumber` e `postalCode`: usados para filtros, exibicao e validacao.

Campos de compatibilidade que o frontend tambem entende:

- Tipo: `type`, `propertyType`, `realEstateType`, `tipoImovel`.
- Quartos: `bedrooms`, `rooms`, `quartos`.
- Banheiros: `bathrooms`, `banheiros`.
- Vagas: `parkingSpots`, `garageSpots`, `vagas`.
- Preco: `price`, `rentPrice`, `salePrice`, `value`, `amount`, `preco`, `valorAluguel`, `valorVenda`.
- Cidade: `city`, `cidade`.
- Bairro: `neighborhood`, `district`, `bairro`.
- Endereco: `address`, `endereco`.
- UF: `state`, `stateCode`, `uf`.
- CEP: `postalCode`, `cep`.
- Finalidade: `listingType`, `transactionType`, `purpose`, `operation`.

### Midia de Imoveis

No frontend atual existem dois modos:

1. Links publicos:
   - `images` e `imageUrls`
   - `videos` e `videoUrls`

2. Anexos locais no formulario:
   - Aceita `.png`, `.jpg`, `.jpeg` e `.mp4`.
   - Hoje o frontend mostra preview local e prepara metadados, mas ainda nao faz upload real porque depende do backend.

Recomendacao para backend:

- Criar endpoint de upload real, preferencialmente com `multipart/form-data`.
- Retornar URLs publicas ou assinadas para salvar em `imageUrls`, `videoUrls` e/ou `media`.
- Validar tipo e tamanho de arquivo.
- Associar midia ao `propertyId`.

### Leads

Listagem autenticada:

`GET /leads`

Criacao publica. O frontend tenta nesta ordem:

- `POST /leads`
- `POST /public/leads`
- `POST /leads/public`
- `POST /map/leads`
- `POST /interests`

Recomendacao: implementar `POST /public/leads` para visitantes e `GET /leads` para painel autenticado.

Atualizacao autenticada:

`PATCH /leads/:id`

Body de criacao:

```json
{
  "propertyId": "property-id",
  "propertyTitle": "Apartamento com vista",
  "agentId": "user-id",
  "agentName": "Nome do corretor",
  "interestedName": "Nome do interessado",
  "email": "cliente@email.com",
  "phone": "(21) 99999-0000",
  "whatsapp": "(21) 99999-0000",
  "source": "INTEREST",
  "message": "Opcional"
}
```

Resposta `Lead`:

```json
{
  "id": "lead-id",
  "propertyId": "property-id",
  "propertyTitle": "Apartamento com vista",
  "agentId": "user-id",
  "agentName": "Nome do corretor",
  "interestedName": "Nome do interessado",
  "email": "cliente@email.com",
  "phone": "(21) 99999-0000",
  "whatsapp": "(21) 99999-0000",
  "source": "INTEREST",
  "status": "NEW",
  "viewed": false,
  "createdAt": "2026-05-06T12:00:00.000Z",
  "updatedAt": "2026-05-06T12:00:00.000Z"
}
```

Valores de `status`:

- `NEW`
- `IN_SERVICE`
- `NEGOTIATING`
- `FINISHED`
- `LOST`

O sino de notificacoes do painel considera `viewed === false` como novo lead. Quando o usuario abre a caixa de notificacoes, o frontend chama `PATCH /leads/:id` com `{ "viewed": true }`.

### Negociacoes

`GET /negotiations`

Resposta:

```json
{
  "success": true,
  "data": [
    {
      "id": "negotiation-id",
      "propertyId": "property-id",
      "propertyTitle": "Apartamento com vista",
      "agentId": "user-id",
      "agentName": "Nome do corretor",
      "leadId": "lead-id",
      "status": "OPEN",
      "value": 850000,
      "startedAt": "2026-05-06T12:00:00.000Z",
      "updatedAt": "2026-05-06T12:00:00.000Z"
    }
  ]
}
```

Valores de `status`:

- `OPEN`
- `FOLLOW_UP`
- `PROPOSAL`
- `CLOSED`
- `LOST`

### Performance

`GET /performance/agents`

Resposta:

```json
{
  "success": true,
  "data": [
    {
      "agentId": "user-id",
      "agentName": "Nome do corretor",
      "activeProperties": 12,
      "leads": 4,
      "negotiations": 2,
      "closedDeals": 1,
      "responseRate": 0.82
    }
  ]
}
```

`GET /performance/properties`

Resposta:

```json
{
  "success": true,
  "data": [
    {
      "propertyId": "property-id",
      "propertyTitle": "Apartamento com vista",
      "views": 120,
      "leads": 8,
      "negotiations": 2
    }
  ]
}
```

## Regras de Negocio Importantes

- Toda imobiliaria deve operar em isolamento por `companyId`.
- Usuarios/corretores pertencem a uma unica imobiliaria.
- Imoveis cadastrados no painel precisam aparecer no mapa publico.
- O mapa publico nao deve exibir dados privados da imobiliaria que nao sejam necessarios para o anuncio.
- Leads gerados no mapa precisam aparecer no painel administrativo da imobiliaria dona do imovel.
- O responsavel pelo imovel (`agentId`/`responsibleAgentId`) e opcional e pode ser alterado depois.
- Imoveis de `venda` e `aluguel` nao podem misturar nas paginas publicas.
- A geolocalizacao do usuario foi removida do mapa; o mapa depende apenas das coordenadas dos imoveis.

## Fallbacks Temporarios do Frontend

Estes fallbacks existem para manter a interface funcionando enquanto o backend ainda nao cobre tudo:

- Imoveis criados podem ser guardados em `larmap.admin.localProperties`.
- Leads publicos podem ser guardados em `larmap.localLeads`.
- Atualizacao de empresa pode ser salva localmente se os endpoints retornarem 404, 405 ou 501.
- Atualizacao de leads pode ser refletida visualmente mesmo se o backend ainda nao sincronizar.

Quando o backend estiver completo, esses fallbacks podem ser removidos gradualmente.
