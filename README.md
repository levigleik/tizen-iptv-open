# IPTV Open Tizen (Next.js + shadcn/ui)

Front-end IPTV otimizado para Smart TV Samsung Tizen (3+) usando o endpoint agrupado do back-end:

- `GET /iptv/{mac}/grouped`

O app já vem com:

- Tema escuro por padrão
- Interface em português (pt-BR)
- Fluxo inicial de escolha: **Canais**, **Séries** ou **Filmes**
- Miniaturas (`tvgLogo`) e badges de categorias (`groupTitle`, qualidade, legendado)
- Mapeamento reutilizável de inputs do controle remoto (setas, enter, voltar)

## Variáveis de ambiente

Crie seu `.env.local` a partir de `.env.example`:

```bash
cp .env.example .env.local
```

Valores esperados:

- `NEXT_PUBLIC_IPTV_API_BASE_URL` (ex.: `http://localhost:4000`)
- `NEXT_PUBLIC_IPTV_FALLBACK_MAC` (usado quando não há MAC detectável no navegador)

## Execução

```bash
bun install
bun dev
```

Abra `http://localhost:3000`.

## MAC Address no Tizen

No runtime Tizen, o app tenta obter automaticamente o MAC via `webapis.network.getMac()`.

Ordem de resolução do MAC:

1. Query string (`?mac=001122AABBCC`)
2. API Tizen (`webapis.network.getMac()`)
3. `localStorage`
4. `NEXT_PUBLIC_IPTV_FALLBACK_MAC`

## Navegação por controle remoto

Mapeamento principal:

- Esquerda/Direita: navega categorias ou itens
- Enter: seleciona categoria ou item
- Cima/Baixo: alterna foco entre área de categorias e conteúdo
- Voltar (`Return`/`Escape`/`Backspace`): volta foco ou limpa seleção

Implementação reutilizável:

- Parser de teclas: `src/lib/tv-remote.ts`
- Registro de teclas Tizen: `src/lib/tizen.ts`
- Hook React de escuta: `src/hooks/use-tv-remote.ts`

## Estrutura principal

- Página principal: `src/app/page.tsx`
- Seleção de categoria: `src/components/iptv/category-selector.tsx`
- Grade de conteúdo com miniaturas: `src/components/iptv/content-rail.tsx`
- Cliente API agrupada: `src/lib/iptv.ts`

## Observações

- Para CORS em ambiente de desenvolvimento, habilite no back-end NestJS.
- Em TV real, garanta os privilégios de rede no `config.xml` do app Tizen.
