# Gerenciador de Tarefas

Projeto da disciplina de Desenvolvimento de Sistemas Web (DSW).

**Estudante:** João Volkmann

## Objetivo do Projeto

Desenvolver um gerenciador de tarefas completo, multi-usuário, persistindo os dados em SQLite.

## Status Atual

Em desenvolvimento. O back-end já é multi-usuário: cadastro, login com JWT e cada usuário só enxerga as próprias tarefas. No front-end, o gerenciador de tarefas já existe em React, mas ainda guarda as tarefas só na memória (não consome a API).

## Recursos Implementados

- API REST em Express com as rotas `GET`, `POST`, `PUT`, `PATCH` e `DELETE` em `/api/tasks`
- Cadastro (`POST /api/auth/register`) e login (`POST /api/auth/login`) com senha guardada como hash `bcryptjs`
- Token JWT válido por 1 hora; todas as rotas de `/api/tasks` exigem `Authorization: Bearer <token>`
- Isolamento por usuário: cada tarefa tem dono (`usuario_id`); tarefa de outra pessoa responde `404`
- Login com a mesma mensagem e o mesmo tempo de resposta para e-mail inexistente e senha errada
- E-mail único sem diferenciar maiúsculas; senha com no mínimo 8 caracteres
- Persistência em SQLite (`tarefas.db`) com `better-sqlite3`
- Prepared Statements compilados uma única vez, fora das rotas
- Validação centralizada em helpers (`tituloValido`, `normalizarPrioridade`, `normalizarStatus`, `parsearId`)
- Erros controlados: `400` para validação, `404` para registro inexistente, `500` genérico sem vazar a estrutura do banco
- Transação no `PATCH` para atualização parcial atômica
- Front-end com seção de login, formulário de cadastro e grade responsiva de tarefas
- Primeiro app em React (`primeiro-app-react/`): `useState`, componente com props e renderização condicional (Aula 05)
- Gerenciador de tarefas em React (Aula 06): adicionar, marcar como concluída, remover, filtrar (todas, pendentes, concluídas) e limpar concluídas
- Componentes reutilizáveis `BotaoAcao` e `ItemTarefa`; contadores calculados a partir do estado

## Tecnologias Utilizadas

- Node.js com TypeScript (`tsx`)
- Express
- SQLite via `better-sqlite3`
- `bcryptjs` (hash de senha) e `jsonwebtoken` (JWT)
- HTML5 semântico e Tailwind CSS (Play CDN)
- React 19 com Vite
- Git e GitHub Codespaces

## Como Rodar

```bash
npm install
npm run dev
```

O servidor sobe em `http://localhost:3000` e cria o `tarefas.db` na primeira execução. Se você tiver um `tarefas.db` antigo, ele é atualizado sozinho (as colunas novas são acrescentadas; tarefas antigas ficam sem dono e não aparecem na lista).

Para rodar o app React (em outro terminal):

```bash
cd primeiro-app-react
npm install
npm run dev
```

O Vite mostra o endereço no terminal (normalmente `http://localhost:5173`). A tela da Aula 05 fica em `src/Aula05MetaFoco.jsx`.

Para usar um segredo próprio nos tokens:

```bash
JWT_SECRET="um-texto-longo-e-aleatorio" npm run dev
```

## Como Testar

Abra o `requests.http` no VS Code com a extensão REST Client:

1. Rode **Cadastrar usuário** e depois **Login**. O token fica guardado em `{{token}}`.
2. Rode os blocos de tarefas, que já enviam o token.
3. A seção **Isolamento** cria um segundo usuário e mostra que ele não lê, edita nem apaga a tarefa do primeiro.

## Estrutura do Projeto

```
.
├── server.ts           # API REST e acesso ao banco
├── index.html          # Interface principal (login, cadastro e lista de tarefas)
├── requests.http       # Testes da API (REST Client)
├── primeiro-app-react/ # Apps em React + Vite
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx            # Monta o App na página
│       ├── App.jsx             # Aula 06: gerenciador de tarefas
│       ├── ItemTarefa.jsx      # Uma tarefa da lista
│       ├── BotaoAcao.jsx       # Botão reutilizável
│       └── Aula05MetaFoco.jsx  # Aula 05: meta e modo foco
├── 00_setup.md         # Diário das aulas
├── .gitignore          # node_modules, *.db e .env fora do Git
├── tarefas.db          # Banco SQLite (ignorado pelo Git)
├── package.json        # Dependências e scripts
├── tsconfig.json       # Configuração do TypeScript
└── README.md           # Documentação do projeto
```
