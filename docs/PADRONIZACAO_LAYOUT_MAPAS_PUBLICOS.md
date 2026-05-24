# Padronizacao do layout dos mapas publicos

Este documento registra a padronizacao visual aplicada aos mapas publicos do LarMap. A mudanca e somente de layout/visual/comportamento do mapa; nao implementa POIs gerais, nao altera backend e nao altera fluxo admin/login.

## Layout de referencia

O layout de referencia e o Mapa Interativo quando o controle "Locais visiveis" esta ativo.

No codigo atual, esse estado era definido em `src/pages/PublicMapPage.tsx` por:

- `mapDetailsVisible === true`
- tile layer Carto Voyager: `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png`
- moldura visual de `.public-map-panel`
- mapa Leaflet com classe `.public-smart-map`
- toolbar `.map-search-toolbar`
- formulario `.map-location-search`
- resumo `.map-corner-summary`
- controles Leaflet ajustados por `.public-smart-map .leaflet-control-*`

Antes da padronizacao, as paginas de Aluguel, Compra e Novidades usavam o tile limpo (`light_nolabels`) porque nao exibiam o controle "Locais visiveis". A Home usava outro tile (`light_all`) e uma moldura propria (`.home-hero__map`).

## Paginas afetadas

- Home (`/`, `src/pages/HomePage.tsx`)
- Mapa Interativo (`/mapa`, `src/pages/PublicMapPage.tsx`)
- Aluguel (`/aluguel`, `src/pages/PublicMapPage.tsx`)
- Compra (`/compra`, `src/pages/PublicMapPage.tsx`)
- Novidades (`/novidades`, `src/pages/PublicMapPage.tsx`)

Compatibilidade mantida:

- `/mapa?type=aluguel`
- `/mapa?type=compra`
- `/mapa?type=venda`

Essas URLs antigas continuam funcionando como filtros de finalidade, mas o navegador publico passa a apontar para `/aluguel` e `/compra`.

## Componentes e arquivos alterados/criados

Criados:

- `src/components/PublicMapFrame.tsx`
  - Moldura reutilizavel para mapas publicos.
  - Aplica a classe comum `.public-map-surface`.
  - Pode renderizar `section` ou `div`.

- `src/constants/publicMap.ts`
  - Centraliza `publicMapAttribution`.
  - Centraliza `publicDetailedMapTileLayerUrl`.
  - Centraliza `publicCleanMapTileLayerUrl`.

Alterados:

- `src/pages/HomePage.tsx`
  - O mapa da Home passou a usar `PublicMapFrame`.
  - O tile da Home passou para Carto Voyager, o mesmo layout visual de "Locais visiveis".
  - O mapa da Home agora usa a mesma atribuicao Carto/OSM.
  - Links de Aluguel e Compra apontam para `/aluguel` e `/compra`.

- `src/pages/PublicMapPage.tsx`
  - O mapa passou a usar `PublicMapFrame`.
  - O tile detalhado passou a ser o padrao para Mapa, Aluguel, Compra e Novidades.
  - O tile limpo continua disponivel somente onde o controle "Mapa limpo" existe.
  - A finalidade tambem pode ser inferida por rota (`/aluguel`, `/compra`), alem das query strings antigas.

- `src/components/PublicNavbar.tsx`
  - Links publicos atualizados para `/aluguel` e `/compra`.
  - Estado ativo continua compativel com URLs antigas de query string.

- `src/App.tsx`
  - Adicionadas rotas publicas `/aluguel` e `/compra`, ambas renderizando `PublicMapPage`.

- `src/styles.css`
  - Criada `.public-map-surface` com borda, radius, sombra, overflow e posicionamento comuns.
  - `.public-map-panel` ficou responsavel apenas por dimensoes/margens especificas do mapa de resultados.
  - `.home-hero__map` passou a reaproveitar a mesma moldura visual.
  - Controles Leaflet da Home receberam o mesmo ajuste visual basico dos mapas publicos.

## Regra de POIs preservada

POIs gerais ainda nao foram implementados.

A regra definida para a futura implementacao e:

- Home pode exibir POIs gerais.
- `/mapa` pode exibir POIs gerais quando nao estiver representando Aluguel/Compra.
- `/aluguel` nao deve exibir POIs gerais.
- `/compra` nao deve exibir POIs gerais.
- `/novidades` nao deve exibir POIs gerais.
- `/favoritos`, admin, mapas legados e formularios de cadastro/edicao nao devem exibir POIs gerais.

Protecao futura recomendada em `PublicMapPage`:

```ts
const location = useLocation()
const listingIntent = getListingIntentFromPath(location.pathname) ?? getListingIntent(searchParams.get('type'))
const shouldEnablePois = location.pathname === '/mapa' && !listingIntent
```

Na Home, a ativacao futura deve ser separada do fluxo de imoveis e nao pode interferir em carrosseis, filtros ou listagens.

## Checklist de testes visuais

Desktop:

- [ ] Home (`/`) carrega mapa com tile detalhado, moldura padrao e marcadores de preview.
- [ ] Mapa Interativo (`/mapa`) carrega com tile detalhado por padrao.
- [ ] Mapa Interativo ainda permite alternar para "Mapa limpo".
- [ ] Aluguel (`/aluguel`) carrega com layout visual padrao e filtra imoveis de aluguel.
- [ ] Compra (`/compra`) carrega com layout visual padrao e filtra imoveis de compra/venda.
- [ ] Novidades (`/novidades`) carrega com layout visual padrao e mantem filtro de novidades.
- [ ] URLs antigas `/mapa?type=aluguel` e `/mapa?type=compra` continuam funcionando.

Mobile:

- [ ] Home (`/`) mantem hero e mapa responsivos.
- [ ] Mapa Interativo (`/mapa`) mantem toolbar, mapa e lista sem sobreposicao indevida.
- [ ] Aluguel (`/aluguel`) mantem mapa antes da lista, com altura responsiva.
- [ ] Compra (`/compra`) mantem mapa antes da lista, com altura responsiva.
- [ ] Novidades (`/novidades`) mantem mapa antes da lista, com altura responsiva.
- [ ] Controles Leaflet e atribuicao nao cobrem a busca nem os cards.

POIs:

- [ ] Nenhum POI geral aparece em Aluguel.
- [ ] Nenhum POI geral aparece em Compra.
- [ ] Nenhum POI geral aparece em Novidades.
- [ ] Nenhum POI geral aparece em admin, favoritos, mapas legados ou formularios.
- [ ] Quando POIs forem implementados, validar que aparecem apenas na Home e no Mapa Interativo.

Regressoes:

- [ ] Filtros do Mapa Interativo continuam funcionando.
- [ ] Busca por cidade continua funcionando.
- [ ] Marcadores e popups de imoveis continuam funcionando.
- [ ] Formulario "Tenho interesse" continua associado apenas a imoveis.
- [ ] Favoritos continuam funcionando onde ja eram permitidos.
