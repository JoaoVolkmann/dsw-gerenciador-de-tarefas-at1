# Gerenciador de Tarefas

Projeto da disciplina de Desenvolvimento de Sistemas Web (DSW).

**Estudante:** João Volkmann

**Aplicação no ar:** https://gerenciador-de-tarefas-kizr.onrender.com

## Objetivo do Projeto

Gerenciador de tarefas completo e multi-usuário: front-end em React + TypeScript (SPA), API REST com autenticação JWT e banco SQLite na nuvem (Turso), publicado no Render.

## Status Atual

Concluído e publicado. Cada pessoa cria a própria conta, entra com e-mail e senha e só enxerga as próprias tarefas.

## Arquitetura

```
Navegador (React SPA)  ──fetch /api + Bearer token──>  Express (Render)  ──libSQL──>  Turso (SQLite na nuvem)
```

- **Um serviço só no Render:** o Express entrega a API em `/api/*` e a página React (pasta `web/dist`) no resto. Front e API ficam no mesmo endereço, então não precisa de CORS.
- **Banco no Turso:** o disco do Render é apagado a cada novo deploy ou reinício, então um `tarefas.db` local se perderia. O Turso guarda o banco na nuvem e fala SQL do SQLite.
- **Desenvolvimento local:** sem as variáveis do Turso, o servidor usa o arquivo `tarefas.db`, igual antes.

## Recursos Implementados

- API REST em Express com `GET`, `POST`, `PUT`, `PATCH` e `DELETE` em `/api/tasks`
- Cadastro (`POST /api/auth/register`) e login (`POST /api/auth/login`) com senha guardada como hash `bcryptjs`
- Token JWT válido por 1 hora; todas as rotas de `/api/tasks` exigem `Authorization: Bearer <token>`
- Isolamento por usuário: cada tarefa tem dono (`usuario_id`); tarefa de outra pessoa responde `404`
- Login com a mesma mensagem e o mesmo tempo de resposta para e-mail inexistente e senha errada
- SQL parametrizado (`?`) centralizado no objeto `SQL`; valores do usuário nunca entram no texto do comando
- Validação centralizada em helpers (`tituloValido`, `normalizarPrioridade`, `normalizarStatus`, `parsearId`)
- Erros controlados: `400` validação, `401` sem login, `404` inexistente, `409` e-mail repetido, `500` genérico
- Transação no `PATCH` para atualização parcial atômica
- Em produção o servidor não sobe sem `JWT_SECRET`, `TURSO_URL` e `TURSO_TOKEN`
- Front-end React + TypeScript: login/cadastro, listar, criar, marcar como concluída, remover e filtrar tarefas
- Token guardado no `localStorage`; se expirar (401), o app volta para a tela de login
- Health check em `/api/health` (testa o banco e mostra o modo: Turso ou arquivo local)
- Diagnóstico em `/api/db-check`: tabelas existentes e quantidade de registros

## Tecnologias Utilizadas

- Node.js + TypeScript (`tsx`), Express 5
- Turso / libSQL (`@libsql/client`)
- `bcryptjs` e `jsonwebtoken`
- React 19 + TypeScript + Vite
- Render (hospedagem) e GitHub

## Como Rodar Localmente

```bash
npm install
npm run dev          # API em http://localhost:3000
```

Sem `.env`, o banco é o arquivo `tarefas.db`. Para usar o Turso também na sua máquina, copie o `.env.example` para `.env` e preencha `TURSO_URL` e `TURSO_TOKEN`.

Em outro terminal:

```bash
npm install --prefix web
npm run dev:web      # front em http://localhost:5173 (o Vite repassa /api para a porta 3000)
```

Para testar como fica em produção (um servidor só):

```bash
npm run build        # instala o web/, gera web/dist e valida o TypeScript do back-end
npm start            # abre http://localhost:3000
```

Usuário de demonstração: `admin@senai.com` / `senha_super_secreta_123`.

## Deploy (Render + Turso)

1. **Banco no Turso:** criar o banco no painel do Turso e copiar a URL (`libsql://...`, sem barra no final) e um token.
2. **Validar o build localmente:** `npm run build` tem que passar sem erros.
3. **Render:** New + > Web Service > conectar este repositório.
   - Runtime: Node · Plan: Free
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
4. **Environment Variables:**

   | Key | Valor |
   |---|---|
   | `JWT_SECRET` | gerado automaticamente (`generateValue: true` no `render.yaml`) |
   | `TURSO_URL` | `libsql://seu-banco.turso.io` (sem `/` no final) |
   | `TURSO_TOKEN` | token completo do Turso (começa com `eyJ`) |

5. **Testar na URL pública:**
   ```bash
   curl https://gerenciador-de-tarefas-kizr.onrender.com/api/health     # status "ok" e banco "Turso / libSQL (nuvem)"
   curl https://gerenciador-de-tarefas-kizr.onrender.com/api/db-check   # ok: true, tabelas usuarios e tarefas
   ```
   No navegador: entrar com o admin, criar uma tarefa e dar F5 em `/tarefas` (não pode dar 404).

O `render.yaml` na raiz tem a mesma configuração, para quem preferir New + > Blueprint.

> No plano gratuito o Render "dorme" depois de 15 minutos sem acesso; o primeiro acesso depois disso demora uns 50 segundos.

## Como Testar a API

Abra o `requests.http` no VS Code com a extensão REST Client:

1. Rode **Cadastrar usuário** e depois **Login**. O token fica guardado em `{{token}}`.
2. Rode os blocos de tarefas, que já enviam o token.
3. A seção **Isolamento** cria um segundo usuário e mostra que ele não lê, edita nem apaga a tarefa do primeiro.

Para testar a versão publicada, troque o `@baseUrl` pelo endereço do Render.

## Estrutura do Projeto

```
.
├── server.ts             # API REST, autenticação e acesso ao banco (Turso/libSQL)
├── web/                  # SPA em React + TypeScript (Vite)
│   ├── vite.config.ts    # proxy /api -> localhost:3000 no desenvolvimento
│   └── src/
│       ├── main.tsx
│       ├── App.tsx               # escolhe login ou tarefas conforme o token
│       ├── api.ts                # todas as chamadas à API + tipos
│       └── components/
│           ├── TelaLogin.tsx     # entrar / criar conta
│           ├── TelaTarefas.tsx   # lista, criar, marcar, remover, filtrar
│           ├── ItemTarefa.tsx
│           └── BotaoAcao.tsx
├── render.yaml           # configuração do deploy no Render
├── .env.example          # modelo das variáveis de ambiente
├── requests.http         # testes da API (REST Client)
├── index.html            # interface estática das Aulas 2 a 4 (HTML + Tailwind)
├── primeiro-app-react/   # exercícios das Aulas 05 e 06 (React em JSX)
├── 00_setup.md           # diário das aulas
├── package.json
└── tsconfig.json
```
