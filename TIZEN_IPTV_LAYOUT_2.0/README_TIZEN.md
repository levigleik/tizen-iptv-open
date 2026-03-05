# Guia de Integração Front-end (Tizen TV)

Este documento explica como integrar o front-end de uma TV Samsung Tizen com o serviço de IPTV.

## 🚀 Como obter o MAC Address no Tizen

Para que o back-end autorize as requisições, você deve enviar o MAC Address da TV. No Tizen, você pode obter o MAC via API `webapis`:

```javascript
try {
    const mac = webapis.network.getMac();
    console.log("TV MAC Address:", mac);
} catch (e) {
    console.error("Erro ao obter MAC:", e);
}
```

---

## 📡 Endpoints Principais

### 1. Listar Entradas IPTV (Canais, Filmes, Séries)
Retorna a lista paginada de conteúdos disponíveis para o MAC informado.

- **URL:** `GET /iptv/{mac}`
- **Parâmetros de Query:**
    - `page`: Número da página (padrão: 1)
    - `perPage`: Itens por página (máximo 100)
    - `category`: `channels`, `movies` ou `series`
    - `search`: Busca por nome
    - `groupTitle`: Filtro por grupo (ex: "Canais | 24 Horas")

**Exemplo de Resposta:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "[24h] 101 Dalmatas",
      "tvgLogo": "http://...",
      "streamUrl": "http://...",
      "streamType": "LIVE",
      "groupTitle": "Canais | 24 Horas"
    }
  ],
  "meta": {
    "total": 10500,
    "lastPage": 525,
    "currentPage": 1,
    "perPage": 20
  }
}
```

### 1.1 Catálogo Agrupado (separado por categoria)

Agora o catálogo agrupado está em 3 endpoints:

- **Filmes:** `GET /iptv/{mac}/grouped/movies`
- **Séries:** `GET /iptv/{mac}/grouped/series`
- **Canais:** `GET /iptv/{mac}/grouped/channels`

Endpoints de categorias por tipo (somente `groupTitle`):

- **Filmes:** `GET /iptv/{mac}/grouped/movies/category`
- **Séries:** `GET /iptv/{mac}/grouped/series/category`
- **Canais:** `GET /iptv/{mac}/grouped/channels/category`

Todos usam paginação padrão via query:

- `page`
- `perPage`
- `search` (filtro por nome agrupado, ignora caixa e acento)
- `groupTitle` (filtro por categoria/grupo, ignora caixa e acento)

**Exemplo de Resposta (movies, resumida):**
```json
{
  "data": [
    {
      "title": "Jurassic World: Domínio",
      "variants": [
        {
          "id": 10,
          "rawTitle": "Jurassic World: Domínio 4K [HDR]",
          "streamUrl": "http://...",
          "groupTitle": "Filmes | Lancamentos",
          "tvgLogo": "http://...",
          "qualityTags": ["4K", "HDR"],
          "isLegendado": false
        }
      ]
    }
  ],
  "pageInfo": {
    "currentPage": 1,
    "perPage": 20,
    "hasNextPage": true,
    "hasPreviousPage": false,
    "pageCount": 999
  }
}
```

### 2. Favoritos
Gerencie a lista de favoritos do usuário.

- **Listar:** `GET /iptv/{mac}/favorites`
- **Adicionar:** `POST /iptv/{mac}/favorites/{entryId}`
- **Remover:** `DELETE /iptv/{mac}/favorites/{entryId}`

### 3. Histórico (Recentes)
Recupere os últimos conteúdos assistidos.

- **Listar:** `GET /iptv/{mac}/recents`
- **Adicionar ao Histórico:** `POST /iptv/{mac}/recents/{entryId}`

---

## 🛠️ Exemplo de Implementação com Fetch

Abaixo, um exemplo de como consumir a API de listagem:

```javascript
const API_BASE_URL = 'http://seu-servidor:3000';
const TV_MAC = webapis.network.getMac().replace(/:/g, ''); // Remova os ":" se necessário

async function fetchMovies(page = 1) {
    const params = new URLSearchParams({
        category: 'movies',
        page: page,
        perPage: 20
    });

    try {
        const response = await fetch(`${API_BASE_URL}/iptv/${TV_MAC}?${params}`);
        if (!response.ok) throw new Error('Não autorizado ou servidor offline');
        
        const json = await response.json();
        return json.data; // Lista de IptvEntryDto
    } catch (error) {
        console.error("Erro ao buscar dados:", error);
    }
}
```

### Exemplo para catálogo agrupado separado

```javascript
const API_BASE_URL = 'http://seu-servidor:4000';
const TV_MAC = webapis.network.getMac().replace(/:/g, '');

async function fetchGroupedMovies(page = 1, search = '', groupTitle = '') {
  const params = new URLSearchParams({
    page: String(page),
    perPage: '20',
    ...(search ? { search } : {}),
    ...(groupTitle ? { groupTitle } : {})
  });
  const response = await fetch(`${API_BASE_URL}/iptv/${TV_MAC}/grouped/movies?${params}`);
  if (!response.ok) throw new Error('Não autorizado ou servidor offline');
  return await response.json();
}

async function fetchGroupedSeries(page = 1) {
  const params = new URLSearchParams({ page: String(page), perPage: '20' });
  const response = await fetch(`${API_BASE_URL}/iptv/${TV_MAC}/grouped/series?${params}`);
  if (!response.ok) throw new Error('Não autorizado ou servidor offline');
  return await response.json();
}

async function fetchMovieCategories() {
  const response = await fetch(`${API_BASE_URL}/iptv/${TV_MAC}/grouped/movies/category`);
  if (!response.ok) throw new Error('Não autorizado ou servidor offline');
  return await response.json(); // { data: ['Filmes | Drama', ...] }
}

async function loadSeriesDetail(seriesTitle) {
  const seriesPage = await fetchGroupedSeries(1);
  const series = seriesPage.data.find((item) => item.title === seriesTitle);
  if (!series) return null;

  // Exemplo: pegar temporada 1 e episódio 1
  const season1 = series.seasons.find((s) => s.season === 1);
  const firstEpisode = season1?.episodes.find((ep) => ep.episode === 1);

  return {
    series,
    firstEpisodeStreamUrl: firstEpisode?.streamUrl || null,
  };
}

// Busca sem acento/caixa: "visionario" encontra "Visionário"
fetchGroupedMovies(1, 'visionario');

// Filtro por categoria/grupo sem acento/caixa
fetchGroupedMovies(1, '', 'filmes | drama');
```

---

## 📝 Definições de Objetos (DTOs)

### `IptvEntryDto` (Entrada Individual)
| Propriedade | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | number | ID único no banco de dados. |
| `name` | string | Nome de exibição do canal/filme. |
| `tvgLogo` | string | URL da imagem/logo. |
| `streamUrl` | string | Link direto para o streaming (HLS/TS). |
| `streamType`| string | `LIVE`, `VOD`, `SERIES`. |
| `groupTitle`| string | Categoria/Grupo original da lista. |

### `IptvQueryDto` (Filtros de Busca)
| Propriedade | Exemplo |
| :--- | :--- |
| `search` | "Marvel" |
| `category`| "movies" |
| `page` | 1 |

### `GroupedMoviesPageDto` / `GroupedSeriesPageDto` / `GroupedChannelsPageDto`
| Propriedade | Tipo | Descrição |
| :--- | :--- | :--- |
| `data` | `GroupedMovieDto[]` / `GroupedSeriesDto[]` / `GroupedChannelDto[]` | Lista paginada da categoria consultada. |
| `pageInfo` | `PageInfoDto` | Metadados de paginação. |

### `GroupedCategoryListDto`
| Propriedade | Tipo | Descrição |
| :--- | :--- | :--- |
| `data` | `string[]` | Lista única de categorias (`groupTitle`) da categoria consultada. |

### `GroupedEntryVariantDto`
| Propriedade | Tipo | Descrição |
| :--- | :--- | :--- |
| `rawTitle` | string | Nome original salvo no catálogo. |
| `qualityTags` | string[] | Tags detectadas (`4K`, `HDR`, `FHD`, `HD`, `SD`, etc). |
| `isLegendado` | boolean | `true` quando contém o marcador exato `[L]`. |

---

## ⚠️ Dica para Tizen
Certifique-se de adicionar privilégios de rede no seu `config.xml`:
```xml
<tizen:privilege name="http://tizen.org/privilege/internet"/>
<tizen:privilege name="http://tizen.org/privilege/network.get"/>
```
And enable CORS in your NestJS backend if you are testing via browser.
