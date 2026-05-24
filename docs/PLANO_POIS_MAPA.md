# Plano tecnico para POIs no mapa

Este documento registra a analise do frontend atual do LarMap e uma proposta de arquitetura para, em uma etapa futura, adicionar pontos de interesse automaticos no mapa. Nenhuma funcionalidade foi implementada nesta etapa.

## Objetivo futuro

Adicionar pontos de interesse proximos ao imovel, ao centro do mapa ou aos limites visiveis do mapa publico, usando Leaflet/OpenStreetMap no frontend e uma API complementar, provavelmente Overpass API ou um proxy no backend.

Categorias iniciais desejadas:

- Mercados
- Postos de combustivel
- Hospitais e servicos de saude
- Restaurantes e lanchonetes
- Instituicoes de ensino
- Pracas, parques e areas de lazer

## Decisao de escopo para POIs gerais

Antes de qualquer implementacao, fica definida a seguinte regra de escopo:

- POIs gerais devem aparecer exclusivamente na Home (`src/pages/HomePage.tsx`) e no Mapa Interativo (`/mapa`, renderizado por `src/pages/PublicMapPage.tsx`).
- POIs gerais nao devem aparecer em `/novidades`, mesmo que essa rota use `PublicMapPage.tsx`.
- POIs gerais nao devem aparecer em `/favoritos`.
- POIs gerais nao devem aparecer em paginas administrativas.
- POIs gerais nao devem aparecer em mapas legados, como `src/pages/PropertiesPage.tsx`.
- POIs gerais nao devem aparecer em formularios de cadastro/edicao de imoveis.
- As paginas de Aluguel e Compra devem manter apenas imoveis, sem POIs gerais. No codigo atual, elas podem existir como `/aluguel` e `/compra`, e tambem devem continuar compativeis com URLs antigas como `/mapa?type=aluguel` e `/mapa?type=compra`.

Como `/mapa` e `/novidades` compartilham `PublicMapPage.tsx`, a ativacao futura dos POIs deve ser protegida por rota e pela ausencia de finalidade comercial:

```ts
const location = useLocation()
const listingIntent = getListingIntentFromPath(location.pathname) ?? getListingIntent(searchParams.get('type'))
const shouldEnablePois = location.pathname === '/mapa' && !listingIntent
```

A camada de POIs, o controle de categorias e o hook `useNearbyPois` so devem ser instanciados quando `shouldEnablePois` for `true`.

Na Home, os POIs devem ser tratados separadamente:

- Se o mapa da Home continuar sendo apenas preview visual, usar somente POIs visuais/estaticos ou uma versao simplificada.
- Se a Home passar a ter um mapa Leaflet realmente interativo, reutilizar `PoiLayer`, `PoiCategoryControl` e `useNearbyPois`.
- Nao misturar POIs da Home com filtros, listagem ou marcadores de imoveis.

## Estado atual encontrado

### Stack e dependencias

O projeto e um frontend React com Vite e TypeScript.

Arquivos principais:

- `package.json`: define scripts `dev`, `typecheck`, `build` e `preview`.
- `src/main.tsx`: importa `leaflet/dist/leaflet.css`, `styles.css` e renderiza `<App />`.
- `src/App.tsx`: centraliza rotas via `react-router-dom`.
- `vite.config.ts`: configura proxy local `/api` para `https://smartmap-backend.onrender.com`.
- `netlify.toml`: redireciona `/api/*` para o backend no deploy Netlify.

Bibliotecas relevantes:

- `react` e `react-dom`
- `react-router-dom`
- `leaflet`
- `react-leaflet`
- `lucide-react`
- `typescript`
- `vite`

Nao ha biblioteca de clustering de marcadores, gerenciamento remoto de cache, React Query/SWR ou teste automatizado configurado no `package.json`.

### Rotas

Rotas publicas em `src/App.tsx`:

- `/`: `HomePage`
- `/favoritos`: `FavoritesPage`
- `/novidades`: `PublicMapPage`
- `/mapa`: `PublicMapPage`
- `/login`: `LoginPage`, protegida por `PublicRoute`
- `/register`: `RegisterPage`, protegida por `PublicRoute`

Rotas administrativas:

- `/admin`: redireciona para dashboard ou login.
- `/admin/login`: `AdminLoginPage`
- `/admin/dashboard`: `AdminDashboardPage`
- `/admin/imoveis`: `AdminPropertiesPage`
- `/admin/corretores`: `AdminAgentsPage`
- `/admin/leads`: `AdminLeadsPage`
- `/admin/desempenho`: `AdminPerformancePage`
- `/admin/configuracoes`: `AdminSettingsPage`
- `/admin/corretor`: `BrokerDashboardPage`

Rotas legadas redirecionadas:

- `/app`
- `/app/users`
- `/app/properties`
- `/users`
- `/properties`

Observacao: `src/pages/PropertiesPage.tsx` existe e contem um mapa interno antigo para cadastro manual por coordenadas, mas nao esta conectado nas rotas atuais.

### Onde o mapa e renderizado

Mapas encontrados:

- `src/pages/PublicMapPage.tsx`: mapa publico principal em `/mapa` e `/novidades`.
- `src/pages/HomePage.tsx`: mapa visual de preview no hero, com pontos estaticos em `previewDots`.
- `src/pages/PropertiesPage.tsx`: mapa administrativo legado, atualmente nao roteado.

O mapa que deve receber POIs futuramente e o de `PublicMapPage.tsx`.

### Mapa publico principal

`PublicMapPage.tsx` concentra muitas responsabilidades:

- Carrega imoveis.
- Mescla imoveis remotos com imoveis locais salvos no `localStorage`.
- Enriquece imoveis para filtros e labels.
- Aplica filtros de cidade, bairro, tipo, quartos, banheiros, vagas, status e finalidade.
- Controla busca de cidade.
- Controla visualizacao limpa/detalhada do mapa.
- Controla mapa, marcadores, popups e formulario de interesse.
- Cria os icones de marcadores com `leaflet.divIcon`.

Trechos importantes:

- `defaultCoordinates`, `defaultCenter`, `cityRadiusKm`: centro e raio padrao no Rio de Janeiro.
- `PropertyFilters`: filtros atuais de imoveis.
- `MapViewState`: estado usado para mover o mapa.
- `PropertyResult`: tipo enriquecido local da pagina.
- `readLocalAdminProperties` e `mergePropertyLists`: fallback/merge local.
- `MapViewport`: componente interno que usa `useMap` e `map.flyTo`.
- `getMarkerIcon`: cria marcador customizado de imovel com `divIcon`.
- `loadPublicProperties`: carrega imoveis via `propertiesApi.list(token)`.
- `filteredResults`: lista final usada pela sidebar e pelos marcadores.
- Render do `<MapContainer>` e dos `<Marker>` de imoveis.

### Busca e filtros atuais

A busca por cidade usa:

- `src/components/CityAutocomplete.tsx`
- `src/hooks/useGeocoding.ts`
- `src/api/geocoding.ts`

O fluxo atual:

1. O usuario digita no autocomplete.
2. `CityAutocomplete` aplica debounce de 300ms.
3. `useGeocoding.searchCities` chama `searchCityLocations`.
4. `searchCityLocations` consulta Nominatim diretamente no frontend.
5. Ao selecionar cidade, `PublicMapPage.applyCitySelection` atualiza filtros, centro e URL.
6. `MapViewport` move o mapa via `flyTo`.

Tambem existe busca textual por cidade/bairro/endereco quando o usuario submete o formulario, via `useGeocoding.search` e `searchLocation`.

Filtros atuais no mapa publico:

- Tipo de imovel: apartamento, casa, cobertura, terreno.
- Quartos minimos.
- Banheiros minimos.
- Vagas minimas.
- Cidade via `CityAutocomplete`.
- Bairros inferidos a partir dos imoveis carregados.
- Status: `AVAILABLE`, `NEGOTIATING`, `SOLD`.
- Finalidade via query string `type=aluguel`, `type=compra` ou `type=venda`.

Os filtros sao aplicados em memoria sobre `catalogResults`. Nao existe filtro remoto por bounds ou por viewport.

### Fluxo atual de imoveis

O mapa publico recebe imoveis assim:

1. `PublicMapPage` chama `propertiesApi.list(token)` quando monta ou quando `reloadKey` muda.
2. `propertiesApi.list` chama `requestFirstAvailableProperties`.
3. Sem token, os endpoints tentados sao:
   - `/public/properties`
   - `/properties/public`
   - `/map/properties`
   - `/properties`
4. Com token, o endpoint principal e `/properties`.
5. Se o backend falhar ou nao tiver endpoint compativel, `PublicMapPage` usa `readLocalAdminProperties()`.
6. Dados remotos e locais sao combinados por `mergePropertyLists`.
7. Cada `Property` vira `PropertyResult` por `enrichProperty`.
8. `filteredResults` alimenta a lista lateral e os marcadores do mapa.

O `HomePage` tambem carrega `propertiesApi.list()` para carrosseis de ultimos vistos e destaques, com fallback para o mesmo armazenamento local.

No admin atual, `AdminShell` usa `useAdminData`, que carrega imoveis por `propertiesApi.list(token)`. `AdminPropertiesPage` mescla esses imoveis com o armazenamento local e grava fallback local quando o backend nao aceita criacao/edicao/remocao.

### Marcadores atuais

No mapa publico:

- Marcadores sao criados por `filteredResults.map`.
- Cada marcador usa `<Marker>` do `react-leaflet`.
- A posicao vem de `property.latitude` e `property.longitude`.
- O icone vem de `getMarkerIcon(result, isSelected)`.
- O HTML do icone usa classes CSS:
  - `property-map-marker`
  - `property-map-marker--available`, implicito pela classe de status quando status for `available`
  - `property-map-marker--negotiating`
  - `property-map-marker--sold`
  - `property-map-marker--selected`
- O popup exibe titulo, preco, status, localizacao, contato, botao de interesse e link WhatsApp quando disponivel.
- Clique no marcador apenas seleciona o imovel.
- Clique no card da lista chama `focusProperty`, seleciona o imovel e move o mapa para zoom 15.

Nao ha separacao por `LayerGroup`, `FeatureGroup`, `Pane` ou componente dedicado de camada. Os marcadores de imoveis estao diretamente dentro de `MapContainer`.

### Controle de mapa atual

Existe:

- Centro inicial fixo no Rio de Janeiro.
- Zoom inicial `12`.
- `scrollWheelZoom` ligado no mapa publico.
- Alternancia de tile layer:
  - Mapa limpo: Carto `light_nolabels`
  - Mapa detalhado: Carto `voyager`
- `MapViewport` com `map.flyTo` para mudancas programaticas.

Nao existe:

- `fitBounds`.
- Captura de `bounds` visiveis.
- Captura de `moveend` ou `zoomend`.
- Estado de zoom real do usuario apos pan/zoom manual.
- Geolocalizacao via `navigator.geolocation`.
- Busca automatica baseada na regiao visivel.
- Carregamento remoto de imoveis por bounds.

### APIs e variaveis de ambiente

APIs internas atuais:

- `src/api/client.ts`
  - `API_BASE_URL` usa `VITE_API_URL`, depois `VITE_API_BASE_URL`, depois `/api`.
  - `authApi`
  - `propertiesApi`
  - `leadsApi`
  - `usersApi`
  - `companyApi`
  - `negotiationsApi`
  - `performanceApi`

APIs externas chamadas diretamente pelo frontend:

- `src/api/geocoding.ts`
  - Nominatim search: `https://nominatim.openstreetmap.org/search`
  - Nominatim reverse: `https://nominatim.openstreetmap.org/reverse`
- `src/api/postalCode.ts`
  - ViaCEP: `https://viacep.com.br/ws/{cep}/json/`

Variaveis:

- `.env`: `VITE_API_URL=/api`
- `.env.example`: `VITE_API_URL=/api`, com comentario legado para `VITE_API_BASE_URL`

Proxy:

- Local Vite: `/api` -> `https://smartmap-backend.onrender.com`
- Netlify: `/api/*` -> `https://smartmap-backend.onrender.com/api/:splat`

Esse desenho favorece criar um proxy de POIs no backend no futuro, mantendo o frontend chamando `/api`.

## Arquivos relevantes

### Entrada, rotas e layout

- `src/main.tsx`: entrada React e CSS do Leaflet.
- `src/App.tsx`: roteamento publico/admin.
- `src/components/PublicNavbar.tsx`: navegacao publica e estado ativo por query string.
- `src/components/AdminShell.tsx`: shell admin e provider de dados administrativos via outlet context.

### Mapa, busca e imoveis

- `src/pages/PublicMapPage.tsx`: mapa publico principal, filtros, marcadores e formulario de interesse.
- `src/pages/HomePage.tsx`: preview de mapa e carrosseis baseados em imoveis.
- `src/pages/AdminPropertiesPage.tsx`: cadastro/edicao administrativa de imoveis, geocoding e fallback local.
- `src/pages/PropertiesPage.tsx`: tela legada nao roteada com mapa interno de coordenadas.
- `src/components/CityAutocomplete.tsx`: autocomplete de cidades com debounce.
- `src/components/PropertyCarousel.tsx`: cards publicos de imoveis.
- `src/components/StatusBadge.tsx`: status visual de imoveis.

### Hooks

- `src/hooks/useGeocoding.ts`: estado e chamadas de geocoding/cidade.
- `src/hooks/useFavorites.ts`: favoritos em `localStorage`.
- `src/hooks/useRecentlyViewed.ts`: ultimos vistos em `localStorage`.
- `src/hooks/useAdminData.ts`: carga administrativa de imoveis, usuarios, leads e metricas.

### API, types e utils

- `src/api/client.ts`: cliente de backend.
- `src/api/geocoding.ts`: Nominatim direto do frontend.
- `src/api/postalCode.ts`: ViaCEP direto do frontend.
- `src/api/errors.ts`: helper simples de mensagem de erro.
- `src/types/api.ts`: tipos de dominio do backend, incluindo `Property`.
- `src/utils/storage.ts`: leitura/remocao com migracao de chaves antigas.
- `src/utils/localLeads.ts`: leads locais.
- `src/utils/userAccess.ts`: regras de favoritos publicos.

### Estilos do mapa

- `src/styles.css`
  - `.public-smart-map`
  - `.public-map-panel`
  - `.map-search-toolbar`
  - `.map-filter-panel`
  - `.property-map-marker*`
  - `.clean-map-popup`
  - breakpoints mobile do mapa publico

## Arquitetura recomendada para POIs

### Principio principal

POIs devem entrar como uma camada paralela aos marcadores de imoveis, sem mudar o fluxo atual de imoveis. A lista lateral e os filtros de imoveis devem continuar sendo calculados por `filteredResults`; POIs nao devem participar de `PropertyResult`, `PropertyFilters` ou `propertiesApi`.

### Melhor local para service de POIs

Recomendacao:

- Criar `src/api/pois.ts`.

Motivo:

- O projeto ja concentra chamadas HTTP em `src/api`.
- POIs virao de HTTP, seja direto da Overpass, seja do backend/proxy.
- Se no futuro o backend expuser `/api/pois`, o service pode trocar a origem sem afetar hook e componentes.

Responsabilidades sugeridas de `src/api/pois.ts`:

- Montar query Overpass quando a chamada for direta.
- Chamar endpoint do backend quando a decisao for usar proxy.
- Normalizar resposta Overpass para um tipo interno estavel.
- Tratar `AbortSignal`.
- Mapear erros HTTP comuns: `429`, `504`, timeout, resposta invalida.

Evitar colocar essa logica dentro de `PublicMapPage.tsx`, porque a pagina ja esta grande e com muita responsabilidade.

### Melhor local para types/interfaces

Recomendacao:

- Criar `src/types/pois.ts`.

Motivo:

- `src/types/api.ts` representa principalmente dominio do backend atual.
- POIs da Overpass tem formato e ciclo de vida diferentes de `Property`.
- Manter separado evita misturar tipos externos com entidades de negocio.

Tipos conceituais:

```ts
export type PoiCategory =
  | 'market'
  | 'fuel'
  | 'health'
  | 'food'
  | 'education'
  | 'leisure'

export type PoiSearchSource = 'property' | 'map-center' | 'map-bounds'

export interface Poi {
  id: string
  osmId: number
  osmType: 'node' | 'way' | 'relation'
  category: PoiCategory
  name: string
  latitude: number
  longitude: number
  tags: Record<string, string>
  distanceMeters?: number
}

export interface PoiSearchParams {
  categories: PoiCategory[]
  source: PoiSearchSource
  center?: {
    latitude: number
    longitude: number
  }
  radiusMeters?: number
  bounds?: {
    south: number
    west: number
    north: number
    east: number
  }
  limit?: number
}

export interface PoiSearchState {
  pois: Poi[]
  loading: boolean
  error: string
  empty: boolean
  lastUpdatedAt?: number
}
```

### Melhor local para hook

Recomendacao:

- Criar `src/hooks/useNearbyPois.ts`.

Responsabilidades sugeridas:

- Receber categorias ativas, centro/bounds, raio e status habilitado/desabilitado.
- Aplicar debounce antes de chamar o service.
- Cancelar requisicoes antigas com `AbortController`.
- Usar cache em memoria por chave de busca.
- Expor `pois`, `loading`, `error`, `empty`, `refresh` e talvez `lastUpdatedAt`.
- Nao conhecer detalhes visuais do mapa.

Assinatura conceitual:

```ts
export function useNearbyPois({
  enabled,
  categories,
  center,
  bounds,
  radiusMeters,
  source,
  minZoomReached,
}: UseNearbyPoisInput): PoiSearchState & { refresh: () => void }
```

### Componentes recomendados

Para nao inflar ainda mais `PublicMapPage.tsx`, criar componentes dedicados quando a implementacao comecar:

- `src/components/map/PoiLayer.tsx`
  - Renderiza marcadores de POIs.
  - Recebe `pois`, `visible`, `onPoiClick`.
  - Usa `Marker`, `Popup` e icone proprio.

- `src/components/map/PoiCategoryControl.tsx`
  - Controla categorias ligadas/desligadas.
  - Pode viver no painel lateral ou como controle compacto sobre o mapa.

- `src/components/map/MapViewportTracker.tsx`
  - Usa `useMapEvents` para capturar `moveend` e `zoomend`.
  - Publica `center`, `bounds` e `zoom` para o estado da pagina.

- Opcional futuro: `src/components/map/PropertyMarkerLayer.tsx`
  - Extrair a camada atual de imoveis para reduzir a pagina.
  - Nao e pre-requisito para POIs, mas ajudaria na manutencao.

### Integracao sem quebrar marcadores de imoveis

Estrutura futura conceitual dentro do `MapContainer`:

```tsx
<MapContainer center={defaultCenter} className="public-smart-map" scrollWheelZoom zoom={12}>
  <TileLayer attribution={publicMapAttribution} url={mapTileLayerUrl} />
  <MapViewport view={mapView} />
  <MapViewportTracker onChange={setViewportState} />

  <PoiLayer pois={pois} visible={poiLayerVisible} />

  {filteredResults.map((result) => (
    <Marker
      eventHandlers={{ click: () => setSelectedPropertyId(result.property.id) }}
      icon={getMarkerIcon(result, result.property.id === selectedPropertyId)}
      key={result.property.id}
      position={[result.property.latitude, result.property.longitude]}
    >
      ...
    </Marker>
  ))}
</MapContainer>
```

Regras importantes:

- `filteredResults` continua sendo a fonte unica dos marcadores de imoveis.
- POIs usam outro array (`pois`) e outro tipo (`Poi`).
- POIs nao alteram `selectedPropertyId`.
- Clique em POI nao deve abrir formulario de interesse de imovel.
- Popups de POI devem ser menores e informativos.
- Imoveis devem ficar visualmente acima dos POIs.

### Separacao visual entre imoveis e POIs

Marcadores de imovel atuais:

- Pin grande.
- Gradiente.
- Status por classe.
- Popup com acoes comerciais.

Marcadores de POI recomendados:

- Menores que os de imovel.
- Forma circular ou quadrada simples, sem pin.
- Cor por categoria.
- Icone ou abreviacao curta por categoria.
- Opacidade menor quando muitos POIs estiverem visiveis.
- Popup com nome, categoria, distancia aproximada e endereco quando existir.

Classes futuras sugeridas:

- `.poi-map-marker-shell`
- `.poi-map-marker`
- `.poi-map-marker--market`
- `.poi-map-marker--fuel`
- `.poi-map-marker--health`
- `.poi-map-marker--food`
- `.poi-map-marker--education`
- `.poi-map-marker--leisure`

Se usar Leaflet panes:

- Pane de POIs com `zIndex` menor.
- Pane de imoveis com `zIndex` maior.
- Popups continuam acima.

Isso evita que POIs escondam imoveis.

### Controle de categorias

Recomendacao de UX:

- Categorias desligadas por padrao, ou apenas uma categoria inicial ligada, para evitar poluicao visual.
- Controle em chips/toggles no painel lateral, abaixo de "Informacoes do mapa" ou em uma secao "Pontos proximos".
- No mobile, usar controle compacto recolhivel para nao competir com busca e filtros de imoveis.

Estado conceitual:

```ts
const [enabledPoiCategories, setEnabledPoiCategories] = useState<PoiCategory[]>([])
const poiLayerVisible = enabledPoiCategories.length > 0
```

Regras:

- Ligar categoria dispara busca apenas se houver centro/bounds valido e zoom minimo.
- Desligar categoria remove POIs daquela categoria sem recarregar imoveis.
- Botao "Limpar" dos filtros de imoveis nao deve necessariamente limpar POIs, a menos que seja uma decisao explicita de produto.

### Estrategias de busca de POIs

#### 1. Ao redor de um imovel selecionado

Uso:

- Quando o usuario clica em um card ou marcador de imovel.
- Melhor para contexto de decisao sobre um imovel especifico.

Parametros:

- `center = [property.latitude, property.longitude]`
- `radiusMeters = 1000` a `2000`, configuravel.
- `source = 'property'`

Vantagens:

- Menos resultados.
- Mais relevante comercialmente.
- Menor risco de poluir o mapa.

Cuidados:

- Mostrar claramente que os POIs sao proximos ao imovel selecionado.
- Se nenhum imovel estiver selecionado, usar centro do mapa ou nao buscar.

#### 2. Ao redor do centro do mapa

Uso:

- Quando usuario explora livremente o mapa.

Parametros:

- `center = map.getCenter()`
- `radiusMeters` derivado do zoom, com limite maximo.
- `source = 'map-center'`

Recomendacao:

- Buscar apenas a partir de zoom minimo, por exemplo `zoom >= 13` ou `zoom >= 14`.
- Limitar raio, por exemplo maximo 2500m ou 3000m.

#### 3. Por bounds visiveis

Uso:

- Quando a intencao for refletir exatamente a area visivel.

Parametros:

- `bounds = map.getBounds()`
- `source = 'map-bounds'`

Recomendacao:

- Usar apenas em zoom alto.
- Recusar bounds muito grandes.
- Se a area do bounds passar de um limite, exibir "Aproxime o mapa para ver pontos de interesse".

### Debounce, cache e controle de chamadas

Necessario para nao sobrecarregar Overpass nem travar a UX.

Recomendacoes:

- Debounce de 600ms a 1000ms apos mudanca de centro, bounds, zoom ou categorias.
- Buscar em `moveend`/`zoomend`, nao em cada movimento continuo.
- Cancelar chamada anterior com `AbortController`.
- Cache em memoria com TTL, por exemplo 5 a 15 minutos.
- Chave de cache por:
  - Categorias ordenadas.
  - Centro arredondado.
  - Raio.
  - Bounds arredondado.
  - Fonte da busca.
- Arredondar coordenadas para reduzir misses de cache, por exemplo 3 ou 4 casas decimais.
- Deduplicar POIs por `osmType + osmId`.
- Limitar numero de POIs renderizados por categoria e total.
- Aplicar regra de zoom minimo antes de chamar API.

Se for usado proxy backend, preferir cache no backend tambem:

- Cache por query/bounds/categorias.
- TTL curto.
- Resposta com `stale` quando a Overpass falhar e existir cache recente.
- Rate limit por usuario/IP no backend.

### Loading, erro e ausencia de resultados

O estado de POIs deve ser independente do estado de imoveis.

Loading:

- Mostrar indicador pequeno no controle de POIs.
- Nao bloquear mapa, filtros ou marcadores de imoveis.
- Manter POIs anteriores visiveis enquanto nova busca carrega, se isso nao confundir.

Erro:

- Mostrar aviso discreto: "Pontos de interesse indisponiveis agora".
- Nao limpar imoveis.
- Nao abrir modal global.
- Permitir tentar novamente.

Sem resultados:

- Mostrar texto curto no controle: "Nenhum ponto encontrado nesta area".
- Evitar renderizar popup ou marcador vazio.

Falha externa:

- Desabilitar temporariamente POIs se houver `429` ou muitos `504`.
- Manter mapa de imoveis funcionando normalmente.

## Tipos de POIs sugeridos

Mapeamento inicial de categoria para tags OSM/Overpass:

| Categoria | Labels de UI | Tags OSM candidatas |
| --- | --- | --- |
| `market` | Mercados | `shop=supermarket`, `shop=convenience`, `shop=grocery`, `amenity=marketplace` |
| `fuel` | Postos | `amenity=fuel` |
| `health` | Saude | `amenity=hospital`, `amenity=clinic`, `amenity=doctors`, `amenity=pharmacy`, `healthcare=hospital`, `healthcare=clinic` |
| `food` | Alimentacao | `amenity=restaurant`, `amenity=fast_food`, `amenity=cafe` |
| `education` | Ensino | `amenity=school`, `amenity=kindergarten`, `amenity=college`, `amenity=university` |
| `leisure` | Pracas e parques | `leisure=park`, `leisure=garden`, `leisure=playground`, `place=square` |

Decisao pendente: farmacia deve entrar em "Saude" ou virar categoria propria.

## Exemplo de estrutura de pastas

```txt
src/
  api/
    client.ts
    geocoding.ts
    pois.ts
  components/
    map/
      MapViewportTracker.tsx
      PoiCategoryControl.tsx
      PoiLayer.tsx
  hooks/
    useGeocoding.ts
    useNearbyPois.ts
  types/
    api.ts
    pois.ts
  utils/
    poiCache.ts
```

Se a implementacao inicial for pequena, `poiCache.ts` pode ficar dentro do hook. Se crescer ou for compartilhado, mover para `src/utils/poiCache.ts`.

## Exemplo conceitual de query Overpass

Exemplo por raio ao redor de um ponto:

```overpassql
[out:json][timeout:15];
(
  nwr["shop"~"^(supermarket|convenience|grocery)$"](around:1500,-22.9068,-43.1729);
  nwr["amenity"="marketplace"](around:1500,-22.9068,-43.1729);
  nwr["amenity"="fuel"](around:1500,-22.9068,-43.1729);
  nwr["amenity"~"^(hospital|clinic|doctors|pharmacy)$"](around:1500,-22.9068,-43.1729);
  nwr["healthcare"~"^(hospital|clinic)$"](around:1500,-22.9068,-43.1729);
  nwr["amenity"~"^(restaurant|fast_food|cafe)$"](around:1500,-22.9068,-43.1729);
  nwr["amenity"~"^(school|kindergarten|college|university)$"](around:1500,-22.9068,-43.1729);
  nwr["leisure"~"^(park|garden|playground)$"](around:1500,-22.9068,-43.1729);
  nwr["place"="square"](around:1500,-22.9068,-43.1729);
);
out center;
```

Observacoes:

- `nwr` busca nodes, ways e relations.
- Para `way` e `relation`, a resposta pode usar `center.lat` e `center.lon`.
- Para `node`, usar `lat` e `lon`.
- A query final deve ser montada apenas com categorias ativas.
- O raio deve ser limitado no frontend ou backend.
- Antes de codar, validar sintaxe e volume no Overpass Turbo ou em ambiente controlado.

Exemplo conceitual por bounds:

```overpassql
[out:json][timeout:15];
(
  nwr["amenity"="fuel"](-22.93,-43.22,-22.88,-43.15);
  nwr["amenity"~"^(restaurant|fast_food|cafe)$"](-22.93,-43.22,-22.88,-43.15);
);
out center;
```

Formato do bbox em Overpass:

```txt
(south,west,north,east)
```

## Riscos e limitacoes

### Uso responsavel da Overpass API

Pontos confirmados na documentacao oficial da Overpass:

- As instancias publicas existem para compartilhar capacidade entre muitos usuarios e nao devem ser tratadas como backend principal de uma aplicacao ampla.
- A propria documentacao cita como problematico configurar um app para mais do que mapeadores OSM e depender das instancias publicas como backend.
- A diretriz ampla de uso seguro e ficar abaixo de aproximadamente 10000 requisicoes por dia e abaixo de 1 GB por dia.
- O rate limit usa slots por usuario/IP e tempo de cooldown proporcional a carga e ao tempo de execucao.
- Mapas interativos podem gerar muitas chamadas curtas em pouco tempo; requisicoes podem aguardar ate 15 segundos por slot e depois serem descartadas.
- Overpass pode retornar `429 Too Many Requests` e `504 Gateway Timeout`.

Fontes:

- [Overpass API manual - Commons](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html)
- [Overpass API - command line, HTTP methods and CORS](https://dev.overpass-api.de/command_line.html)
- [Overpass API manual](https://dev.overpass-api.de/overpass-doc/en/)

Conclusao:

- Chamada direta do frontend pode funcionar para prototipo e baixo volume, mas nao e a melhor escolha para producao.
- Para o LarMap, o caminho mais seguro e criar um proxy/cache no backend antes de expor POIs em producao.

### CORS

A documentacao da Overpass informa que, quando ha header `Origin`, a resposta inclui `Access-Control-Allow-Origin: *`, e que OPTIONS e suportado para CORS.

Mesmo assim, ha riscos praticos:

- Endpoints publicos podem ficar lentos ou indisponiveis.
- Politicas podem mudar.
- Chamadas diretas expoem todo usuario final ao comportamento da API externa.
- Nao ha controle centralizado de cache, retries ou rate limit.

Recomendacao:

- Preferir backend proxy em producao.
- Usar chamada direta apenas se a decisao for prototipar rapidamente e com limites agressivos.

### Front direto vs proxy backend

Frontend direto:

- Mais rapido para prototipar.
- Menos infraestrutura.
- Usa CORS da Overpass.
- Cada usuario gera chamadas diretamente para Overpass.
- Cache e rate limit ficam limitados ao navegador.
- Mais risco de exceder fair use se houver muitos usuarios.

Proxy backend:

- Recomendado para producao.
- Centraliza cache.
- Centraliza rate limit.
- Permite fallback com cache stale.
- Permite trocar provedor de POIs depois.
- Evita duplicar chamadas iguais de muitos usuarios.
- Pode reduzir CORS e instabilidade percebida.

Como o projeto ja usa `/api` com Vite e Netlify, o proxy de POIs se encaixa naturalmente em algo como:

```txt
GET /api/pois?lat=-22.9068&lng=-43.1729&radius=1500&categories=market,fuel
GET /api/pois?bbox=south,west,north,east&categories=food,education
```

### Performance no mapa

Riscos:

- Muitos marcadores React/Leaflet podem degradar pan/zoom.
- POIs e imoveis competindo visualmente podem prejudicar decisao do usuario.
- Popups em excesso podem confundir.
- Consultas grandes de Overpass podem demorar e retornar payload grande.

Mitigacoes:

- Buscar apenas com zoom minimo.
- Limitar raio e area de bounds.
- Limitar total de POIs renderizados.
- Priorizar POIs mais proximos do imovel/centro.
- Renderizar POIs em camada abaixo dos imoveis.
- Usar icones pequenos e simples.
- Considerar clustering no futuro se houver pacote aprovado.
- Evitar recalcular icones em massa sem necessidade.

### UX mobile

O CSS atual muda o mapa publico em telas menores:

- Layout vira coluna.
- Toolbar de busca fica relativa.
- Mapa fica com altura em torno de 54dvh a 58dvh.
- Painel de resultados vai abaixo do mapa.

Riscos no mobile:

- POIs podem poluir muito uma area visual menor.
- Controles extras podem competir com busca, filtros e cards.
- Muitos marcadores pequenos podem ser dificeis de tocar.

Mitigacoes:

- Categorias desligadas por padrao no mobile.
- Controle recolhivel.
- Maximo de categorias simultaneas, se necessario.
- Popups curtos.
- Zoom minimo mais alto no mobile.
- Exibir resumo por categoria quando houver muitos resultados.

### Falha da API externa

Regra de produto recomendada:

- O mapa de imoveis nunca deve depender da API de POIs.
- Se POIs falharem, os imoveis continuam visiveis e clicaveis.
- Exibir aviso discreto apenas na area de POIs.
- Se houver cache, mostrar dados antigos marcados como temporarios.
- Se houver `429`, aguardar mais tempo antes de tentar novamente.

## Plano de implementacao em etapas

### Etapa 1: Preparacao de tipos e service

- Criar `src/types/pois.ts`.
- Criar `src/api/pois.ts`.
- Definir categorias, tags OSM e normalizador de elementos Overpass.
- Definir estrategia inicial: frontend direto ou backend proxy.
- Se usar proxy, alinhar contrato com backend antes de ligar UI.

### Etapa 2: Hook de busca

- Criar `src/hooks/useNearbyPois.ts`.
- Implementar debounce.
- Implementar `AbortController`.
- Implementar cache em memoria.
- Expor estados independentes de loading, erro e vazio.
- Deduplicar por `osmType/osmId`.

### Etapa 3: Captura de viewport

- Criar `MapViewportTracker`.
- Capturar `center`, `bounds` e `zoom` em `moveend` e `zoomend`.
- Definir zoom minimo.
- Definir se a busca inicial usa centro do mapa, imovel selecionado ou nenhuma busca.

### Etapa 4: Camada visual de POIs

- Criar `PoiLayer`.
- Criar icones `divIcon` separados dos imoveis.
- Garantir z-index/camada inferior aos imoveis.
- Criar popup simples de POI.
- Garantir que clique em POI nao altera `selectedPropertyId`.

### Etapa 5: Controle de categorias

- Criar `PoiCategoryControl`.
- Adicionar ao painel lateral ou toolbar do mapa.
- Manter filtros de imoveis separados dos filtros de POIs.
- No mobile, usar versao compacta/recolhivel.

### Etapa 6: Resiliencia e limites

- Tratar `429`, `504`, abort e timeout.
- Definir cooldown apos erro de rate limit.
- Mostrar mensagem discreta.
- Manter imoveis inalterados.
- Se proxy backend existir, habilitar cache backend.

### Etapa 7: Refinamento de UX e performance

- Ajustar limites por zoom.
- Ajustar cores e tamanhos.
- Validar mobile.
- Avaliar clustering ou agrupamento se o volume real exigir.
- Medir quantidade de POIs por categoria em regioes densas.

## Checklist de implementacao

- [ ] Confirmar se POIs serao buscados direto na Overpass ou via backend.
- [ ] Definir contrato de API caso haja proxy backend.
- [ ] Criar `src/types/pois.ts`.
- [ ] Criar `src/api/pois.ts`.
- [ ] Criar mapeamento de categorias para tags OSM.
- [ ] Criar normalizador Overpass -> `Poi`.
- [ ] Criar `src/hooks/useNearbyPois.ts`.
- [ ] Adicionar debounce.
- [ ] Adicionar cancelamento por `AbortController`.
- [ ] Adicionar cache em memoria.
- [ ] Adicionar regra de zoom minimo.
- [ ] Criar captura de viewport com `useMapEvents`.
- [ ] Criar `PoiLayer`.
- [ ] Criar icones/classes CSS de POIs.
- [ ] Garantir que imoveis fiquem acima dos POIs.
- [ ] Criar controle de categorias.
- [ ] Proteger ativacao dos POIs em `PublicMapPage` com `location.pathname === '/mapa' && !listingIntent`.
- [ ] Garantir que Home trate POIs em fluxo separado dos filtros/listas de imoveis.
- [ ] Tratar loading de POIs.
- [ ] Tratar erro de POIs sem bloquear imoveis.
- [ ] Tratar ausencia de POIs.
- [ ] Definir limites de raio, bounds e quantidade renderizada.
- [ ] Validar comportamento em `/mapa`.
- [ ] Validar comportamento em `/novidades`.
- [ ] Validar comportamento em links com `?q=`.
- [ ] Validar comportamento em links com `?type=aluguel` e `?type=compra`.

## Checklist de testes

### Testes manuais essenciais

- [ ] Abrir `/mapa` sem categorias ativas e confirmar que imoveis continuam iguais.
- [ ] Ligar uma categoria de POI e confirmar que apenas POIs dessa categoria aparecem.
- [ ] Desligar a categoria e confirmar que os POIs somem sem remover imoveis.
- [ ] Selecionar um imovel e buscar POIs ao redor dele.
- [ ] Mover o mapa e confirmar debounce, sem chamadas em excesso.
- [ ] Diminuir zoom e confirmar que a busca e bloqueada quando a area for grande.
- [ ] Simular erro da API e confirmar que imoveis continuam funcionando.
- [ ] Simular resposta vazia e confirmar mensagem discreta.
- [ ] Testar mobile com mapa, filtros e categorias.
- [ ] Testar popups de imoveis e POIs separadamente.
- [ ] Confirmar que o formulario "Tenho interesse" continua associado apenas a imoveis.

### Testes tecnicos recomendados

- [ ] Typecheck com `npm run typecheck`.
- [ ] Build com `npm run build`.
- [ ] Testar sem backend disponivel, usando fallback local de imoveis.
- [ ] Testar com token e sem token.
- [ ] Testar chamadas abortadas por mudanca rapida de viewport.
- [ ] Testar cache retornando resultado sem nova chamada.
- [ ] Testar deduplicacao de node/way/relation.
- [ ] Testar payload com way/relation usando `center`.
- [ ] Testar limites para `429` e `504`.

## Pontos que precisam de decisao antes de codar

- A primeira versao chamara Overpass direto do frontend ou via backend proxy?
- POIs devem aparecer por padrao ou somente quando o usuario ligar categorias?
- A busca inicial deve usar:
  - imovel selecionado,
  - centro do mapa,
  - bounds visiveis,
  - ou nenhuma busca ate o usuario pedir?
- Qual raio padrao ao redor de um imovel?
- Qual zoom minimo para busca por viewport?
- Qual limite maximo de POIs renderizados por categoria e total?
- Farmacias entram em "Saude" ou viram categoria propria?
- Bares/pubs entram em "Alimentacao" ou ficam fora?
- Pracas devem depender apenas de `place=square` e `leisure=park`, ou incluir outras tags locais?
- O controle de POIs deve ficar no painel lateral, no mapa ou em ambos?
- No mobile, categorias ficam recolhidas por padrao?
- O backend armazenara cache de POIs? Qual TTL?
- O produto precisa mostrar distancia ate o imovel selecionado?
- POIs devem afetar contadores/resultados da sidebar? Recomendacao: nao.
- POIs gerais ja estao definidos como exclusivos da Home e do Mapa Interativo (`/mapa` sem finalidade de aluguel/compra).

## Recomendacao final

Implementar POIs como uma camada independente e opcional do mapa publico. O caminho mais seguro para producao e criar um endpoint/proxy no backend com cache e limites, consumido por `src/api/pois.ts`. No frontend, manter `PublicMapPage` como orquestradora por enquanto, mas colocar busca, tipos, cache e renderizacao dos POIs em arquivos novos para nao acoplar POIs ao fluxo de imoveis.

A prioridade tecnica deve ser preservar o comportamento atual:

- Imoveis continuam vindo de `propertiesApi.list`.
- `filteredResults` continua controlando lista e marcadores de imoveis.
- POIs nao entram em `Property`.
- POIs nao alteram favoritos, leads ou status.
- Falha de POIs nunca quebra o mapa de imoveis.
