# Gerenciador de Tarefas

Projeto da disciplina de Desenvolvimento de Sistemas Web (DSW).

**Estudante:** João Volkmann

## Objetivo do Projeto

Desenvolver um gerenciador de tarefas completo, multi-usuário, persistindo os dados em SQLite.

## Status Atual

Em desenvolvimento. O back-end já está funcionando com API REST e persistência em SQLite. A interface ainda não consome a API, e a autenticação multi-usuário está pendente.

## Recursos Implementados

- API REST em Express com as rotas `GET`, `POST`, `PUT`, `PATCH` e `DELETE` em `/api/tasks`
- Persistência em SQLite (`tarefas.db`) com `better-sqlite3`
- Prepared Statements compilados uma única vez, fora das rotas
- Validação centralizada em helpers (`tituloValido`, `normalizarPrioridade`, `normalizarStatus`, `parsearId`)
- Erros controlados: `400` para validação, `404` para registro inexistente, `500` genérico sem vazar a estrutura do banco
- Transação no `PATCH` para atualização parcial atômica
- Front-end com seção de login, formulário de cadastro e grade responsiva de tarefas

## Tecnologias Utilizadas

- Node.js com TypeScript (`tsx`)
- Express
- SQLite via `better-sqlite3`
- HTML5 semântico e Tailwind CSS (Play CDN)
- Git e GitHub Codespaces

## Como Rodar

```bash
npm install
npm run dev
```

O servidor sobe em `http://localhost:3000`.

Para testar a API, abra o `requests.http` no VS Code com a extensão REST Client e clique em "Send Request" nos blocos.

## Estrutura do Projeto

```
.
├── server.ts           # API REST e acesso ao banco
├── index.html          # Interface principal (login, cadastro e lista de tarefas)
├── requests.http       # Testes da API (REST Client)
├── tarefas.db          # Banco SQLite (ignorado pelo Git)
├── package.json        # Dependências e scripts
├── tsconfig.json       # Configuração do TypeScript
└── README.md           # Documentação do projeto
```