<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

Este é um serviço de back-end desenvolvido com [NestJS](https://github.com/nestjs/nest) para gerenciamento e consumo de listas IPTV. O projeto realiza o processamento de arquivos M3U, organiza conteúdos por categorias (Canais, Filmes e Séries) e oferece recursos de personalização para o usuário final, como favoritos e histórico de acessos (recentes).

O sistema utiliza **Prisma ORM** para persistência de dados e permite o controle de acesso baseado no endereço MAC do dispositivo, tornando-o ideal para aplicações em Smart TVs.

## 🧩 Endpoints de Catálogo Agrupado

Agora o catálogo agrupado foi separado em 3 endpoints (um por categoria):

- `GET /iptv/{mac}/grouped/movies`
- `GET /iptv/{mac}/grouped/series`
- `GET /iptv/{mac}/grouped/channels`

Todos aceitam os mesmos query params da paginação padrão:

- `page` (padrão `1`)
- `perPage` (padrão `10`, máximo `100`)
- `search` (filtro por `title`, case-insensitive e accent-insensitive)
- `groupTitle` (filtro por categoria, case-insensitive e accent-insensitive)

### Exemplos de chamada

```bash
curl "http://localhost:4000/iptv/001122AABBCC/grouped/movies?page=1&perPage=20"
curl "http://localhost:4000/iptv/001122AABBCC/grouped/movies?page=1&perPage=20&search=visionario"
curl "http://localhost:4000/iptv/001122AABBCC/grouped/movies?page=1&perPage=20&groupTitle=filmes%20%7C%20drama"
curl "http://localhost:4000/iptv/001122AABBCC/grouped/series?page=2&perPage=10"
curl "http://localhost:4000/iptv/001122AABBCC/grouped/channels?page=1&perPage=30"

# listar categorias (groupTitle) por tipo
curl "http://localhost:4000/iptv/001122AABBCC/grouped/movies/category"
curl "http://localhost:4000/iptv/001122AABBCC/grouped/series/category"
curl "http://localhost:4000/iptv/001122AABBCC/grouped/channels/category"
```

### Exemplo de resposta `movies` (resumida)

```json
{
  "data": [
    {
      "title": "Alita Anjo De Combate",
      "variants": [
        {
          "id": 123,
          "rawTitle": "Alita Anjo De Combate [4K] [HDR]",
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

### Regras de agrupamento

- `series`: identifica padrões `S01E01`, `S01EP01` e `1x01` para montar temporadas/episódios.
- `movies` e `channels`: consolidam variantes por nome base (`4K/HDR/HD/SD`, etc).
- O marcador exato `[L]` é exposto em `isLegendado: true`.
- `search`: ignora maiúsculas/minúsculas e acentos (`visionario` encontra `Visionário`).
- Se não houver match direto, retorna itens similares por score textual.
- `groupTitle`: ignora maiúsculas/minúsculas e acentos (`filmes | drama` encontra `Filmes | Drama`).

### Exemplo de resposta para `.../movies/category`

```json
{
  "data": [
    "Filmes | Drama",
    "Filmes | Comedia",
    "Filmes | Acao"
  ]
}
```

## 📺 Integração com Smart TV (Tizen)

Se você está desenvolvendo um front-end para TVs Samsung Tizen, consulte o nosso guia especializado:

👉 **[Guia de Integração Tizen TV](README_TIZEN.md)**

O guia cobre:
- Como obter o MAC Address via API Tizen.
- Endpoints de listagem paginada e filtros.
- Gerenciamento de favoritos e arquivos recentes.
- Exemplos de DTOs e privilégios necessários.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
