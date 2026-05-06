# SmartMap Backend - Proximas Entregas Necessarias

Este documento e uma lista pratica do que o backend precisa implementar agora para substituir os fallbacks locais do frontend e deixar a plataforma pronta para producao.

## Prioridade 1 - Contrato Base da API

1. Padronizar todas as respostas no envelope:

```json
{
  "success": true,
  "data": {}
}
```

Erros:

```json
{
  "success": false,
  "error": {
    "message": "Mensagem clara",
    "code": "CODIGO"
  }
}
```

2. Garantir que todas as rotas autenticadas aceitem:

```http
Authorization: Bearer <token>
```

3. Garantir CORS para os dominios do frontend em producao e desenvolvimento.

4. Validar que `GET /health` retorna com sucesso.

## Prioridade 2 - Auth, Empresa e Multi-Tenant

### Implementar ou revisar

- `POST /auth/register`
- `POST /auth/login`
- `PATCH /companies/me`

### Regras obrigatorias

- Ao registrar uma imobiliaria, criar tambem o usuario administrador inicial.
- `login` precisa retornar `token`, `company` e `user`.
- O token precisa carregar informacoes suficientes para resolver `companyId` e `userId`.
- Toda consulta administrativa deve ser filtrada pelo `companyId` do token.
- Um usuario de uma imobiliaria nunca pode listar, editar ou excluir dados de outra imobiliaria.

### Campos obrigatorios da imobiliaria

- `name`
- `email`
- `brandImageUrl` ou upload equivalente da marca
- `headquartersStreet`
- `headquartersNumber`
- `headquartersNeighborhood`
- `headquartersCity`
- `headquartersState`
- `headquartersPostalCode`
- `headquartersAddress`

### Criterios de aceite

- Criar imobiliaria pelo frontend sem fallback.
- Fazer login e cair corretamente no painel.
- Atualizar dados da imobiliaria em `/admin/configuracoes`.
- Recarregar a pagina e manter empresa/usuario corretos via localStorage + token.

## Prioridade 3 - Imoveis

### Endpoints obrigatorios

- `GET /properties`
- `GET /public/properties`
- `POST /properties`
- `PATCH /properties/:id`
- `DELETE /properties/:id`

### Regras de listagem

- `GET /properties`: retorna imoveis da imobiliaria autenticada.
- `GET /public/properties`: retorna imoveis publicaveis para visitantes.
- O retorno publico deve incluir somente dados necessarios para o anuncio e o mapa.
- O retorno publico precisa incluir `latitude` e `longitude`.
- Imoveis de outras empresas podem aparecer no mapa publico, mas a administracao deve continuar isolada por empresa.

### Campos minimos para salvar imovel

```json
{
  "title": "Apartamento no Centro",
  "description": "Descricao",
  "latitude": -22.9068,
  "longitude": -43.1729,
  "status": "AVAILABLE",
  "propertyType": "apartamento",
  "listingType": "venda",
  "price": 850000,
  "bedrooms": 3,
  "bathrooms": 2,
  "parkingSpots": 1,
  "street": "Rua Exemplo",
  "addressNumber": "123",
  "buildingName": "Nome do Edificio",
  "apartmentNumber": "301",
  "complement": "Bloco A",
  "neighborhood": "Centro",
  "city": "Rio de Janeiro",
  "state": "RJ",
  "postalCode": "20000-000",
  "address": "Rua Exemplo, 123, Centro, Rio de Janeiro, RJ, 20000-000",
  "agentId": "user-id",
  "responsibleAgentId": "user-id",
  "imageUrls": [],
  "videoUrls": [],
  "contactPhone": "+55 21 99999-0000",
  "contactWhatsApp": "+55 21 99999-0000"
}
```

### Regras obrigatorias

- `listingType` deve ser salvo como `venda` ou `aluguel`.
- Nao misturar `venda` em telas de aluguel nem `aluguel` em telas de venda.
- `status` deve aceitar `AVAILABLE`, `NEGOTIATING` e `SOLD`.
- `agentId` deve ser opcional.
- Se `agentId` for enviado, validar que o corretor pertence a mesma imobiliaria.
- Endereco deve ser salvo em campos separados e tambem em `address` completo.
- Coordenadas devem ser persistidas.
- O imovel criado deve aparecer em `GET /properties` e em `GET /public/properties`.

### Criterios de aceite

- Cadastrar imovel no painel.
- Recarregar a pagina e ver o imovel ainda listado, sem depender de `localStorage`.
- Abrir `/mapa` e ver o imovel no mapa.
- Filtrar compra/aluguel e ver apenas o tipo correto.
- Editar responsavel, preco, status, endereco e midias.
- Excluir imovel e confirmar que ele some do painel e do mapa publico.

## Prioridade 4 - Upload de Imagens e Videos

Hoje o frontend ja permite selecionar arquivos `.png`, `.jpg`, `.jpeg` e `.mp4`, mas ainda nao existe upload real. O backend precisa definir o contrato final.

### Endpoint recomendado

`POST /properties/:id/media`

Formato:

```http
Content-Type: multipart/form-data
Authorization: Bearer <token>
```

Campos sugeridos:

- `files[]`: um ou mais arquivos.
- `type`: opcional, `image` ou `video`.

Resposta sugerida:

```json
{
  "success": true,
  "data": {
    "propertyId": "property-id",
    "media": [
      {
        "id": "media-id",
        "type": "image",
        "url": "https://cdn.smartmap.com/properties/property-id/foto.jpg",
        "fileName": "foto.jpg",
        "mimeType": "image/jpeg",
        "size": 245000,
        "createdAt": "2026-05-06T12:00:00.000Z"
      }
    ]
  }
}
```

### Validacoes

- Aceitar apenas `image/png`, `image/jpeg` e `video/mp4`.
- Definir limite de tamanho por arquivo.
- Definir limite de arquivos por imovel.
- Bloquear upload em imovel que nao pertence a imobiliaria do token.
- Retornar URLs publicas ou URLs assinadas adequadas para exibicao no frontend.

### Persistencia

Salvar midia em tabela/colecao propria, associada a `propertyId`, com:

- `id`
- `propertyId`
- `companyId`
- `type`
- `url`
- `fileName`
- `mimeType`
- `size`
- `sortOrder`
- `createdAt`

### Criterios de aceite

- Anexar imagens no cadastro/edicao.
- Recarregar o painel e manter as imagens.
- Ver imagem principal no card do painel, Home e mapa.
- Anexar video `.mp4` e ve-lo contabilizado no painel.

## Prioridade 5 - Leads e Notificacoes

### Endpoints obrigatorios

- `POST /public/leads`
- `GET /leads`
- `PATCH /leads/:id`

### Criacao publica

O usuario comum clica em `Tenho interesse` no card do mapa e informa:

- Nome
- WhatsApp
- Email

Body atual:

```json
{
  "propertyId": "property-id",
  "propertyTitle": "Apartamento no Centro",
  "agentId": "user-id",
  "agentName": "Nome do corretor",
  "interestedName": "Cliente Exemplo",
  "email": "cliente@email.com",
  "phone": "(21) 99999-0000",
  "whatsapp": "(21) 99999-0000",
  "source": "INTEREST"
}
```

### Regras obrigatorias

- Resolver `companyId` pelo `propertyId`.
- Se o imovel tiver corretor responsavel, associar o lead a esse corretor.
- Criar lead com `status: "NEW"` e `viewed: false`.
- `GET /leads` deve retornar leads da imobiliaria autenticada.
- `PATCH /leads/:id` deve permitir atualizar `status` e `viewed`.
- Ao abrir notificacoes, o frontend marca leads como lidos com `{ "viewed": true }`.

### Criterios de aceite

- Criar lead pelo mapa publico.
- Entrar no painel e ver o contador no sino.
- Abrir caixa de notificacoes e ver nome, imovel e data.
- Apos abrir notificacoes, o contador deve zerar.
- Lead deve continuar na pagina `/admin/leads`.
- Alterar status para `IN_SERVICE`, `NEGOTIATING`, `FINISHED` ou `LOST`.

## Prioridade 6 - Corretores e Permissoes

### Endpoints

- `GET /users`
- `POST /users`
- `PATCH /users/:id`
- `DELETE /users/:id`

### Regras

- Roles esperadas: `admin`, `manager`, `agent`.
- `agent` deve ver area de corretor em `/admin/corretor`.
- `admin` e `manager` podem acessar painel completo.
- Um corretor so deve ser associavel a imoveis da mesma imobiliaria.

### Criterios de aceite

- Criar corretor no painel.
- Listar corretor no select de responsavel do imovel.
- Editar e remover corretor.
- Login de corretor redireciona para `/admin/corretor`.

## Prioridade 7 - Performance e Dashboard

### Endpoints

- `GET /performance/agents`
- `GET /performance/properties`
- `GET /negotiations`

### Metricas esperadas

Por corretor:

- `activeProperties`
- `leads`
- `negotiations`
- `closedDeals`
- `responseRate`

Por imovel:

- `views`
- `leads`
- `negotiations`

### Regras

- As metricas devem respeitar `companyId`.
- Leads publicos devem alimentar as metricas.
- Se ainda nao houver rastreamento real de views, retornar `0` de forma consistente.

### Criterios de aceite

- Dashboard carrega sem erros.
- Painel de desempenho nao fica quebrado quando nao houver dados.
- Imovel com lead novo reflete contagem em performance.

## Prioridade 8 - Geocoding e Endereco

Hoje o frontend faz busca de CEP via ViaCEP e geocoding para preencher coordenadas. Mesmo assim, o backend deve persistir os dados de endereco.

### Recomendacao

- Validar CEP, cidade e UF no backend.
- Normalizar CEP para `00000-000`.
- Normalizar UF com duas letras.
- Manter `latitude` e `longitude` enviados pelo frontend.
- Se possivel, criar validacao/normalizacao propria para evitar coordenadas invalidas.

### Criterios de aceite

- Endereco completo salvo em campos separados.
- Imovel com endereco valido e coordenadas aparece no mapa.
- Erros de endereco retornam mensagem clara no envelope de erro.

## Prioridade 9 - Publicacao e Segurança

### Publico

`GET /public/properties` nao deve exigir token.

Retornar apenas:

- Dados do anuncio.
- Dados de localizacao necessarios.
- Dados publicos de contato do anuncio.
- Nome do corretor responsavel, se desejado.

Nao retornar:

- Emails internos da imobiliaria.
- Dados privados de usuarios.
- Campos administrativos sensiveis.

### Administrativo

Toda rota administrativa deve exigir token e validar:

- Token valido.
- Usuario ativo.
- `companyId`.
- Permissao por role quando aplicavel.

## Plano de Remocao dos Fallbacks do Frontend

Quando o backend estiver completo, remover gradualmente:

1. Fallback local de imoveis em `smartmap.admin.localProperties`.
2. Fallback local de leads em `smartmap.localLeads`.
3. Fallback de rotas alternativas antigas se a API padronizar os endpoints recomendados.
4. Salvamento local de empresa quando `/companies/me` falha.

## Sequencia Recomendada de Implementacao

1. Padronizar envelope da API e auth.
2. Implementar `GET /properties` e `GET /public/properties`.
3. Corrigir persistencia completa de `POST /properties`.
4. Implementar `PATCH` e `DELETE` de imoveis.
5. Implementar upload de midia.
6. Implementar `POST /public/leads`, `GET /leads` e `PATCH /leads/:id`.
7. Finalizar usuarios/corretores.
8. Finalizar performance e negociacoes.
9. Testar fluxo completo ponta a ponta.

## Checklist Final para Entrega

- [ ] Login administrativo retorna token, company e user.
- [ ] Cadastro de imobiliaria salva endereco e marca.
- [ ] Listagem de imoveis autenticada funciona.
- [ ] Listagem publica de imoveis funciona.
- [ ] Imovel criado aparece no mapa apos reload.
- [ ] Venda e aluguel nao se misturam.
- [ ] Upload de PNG/JPG funciona.
- [ ] Upload de MP4 funciona.
- [ ] Lead publico e criado pelo mapa.
- [ ] Sino de notificacoes mostra lead novo.
- [ ] Lead marcado como lido some do contador.
- [ ] Corretores podem ser vinculados a imoveis.
- [ ] Dados sao isolados por imobiliaria.
- [ ] Dashboard e performance carregam sem fallback local.
- [ ] `.env` nao esta versionado.

