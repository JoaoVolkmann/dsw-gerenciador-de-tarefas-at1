# Diário das Aulas — DSW

## Aula 00 — Ambiente e primeiros passos (02/09/2026)

### O que eu aprendi ✅
Montei o back-end em Node.js com TypeScript (tsx, npm run dev) e subi uma API REST no Express (server.ts), com as rotas GET/POST/PUT/PATCH/DELETE respondendo em /api/tasks.

Guardei os dados com better-sqlite3 no arquivo tarefas.db, gerando as tabelas por meio de CREATE TABLE IF NOT EXISTS.

Consegui testar a API antes de existir front-end, escrevendo requisições em arquivos .http e disparando pela extensão REST Client do VS Code.

### Principal dificuldade 🧩
No primeiro commit acabei enviando a pasta node_modules/ e o tarefas.db junto, sem notar.

### Como eu resolvi 🔧
Escrevi um .gitignore e rodei git rm --cached para removê-los do versionamento, mantendo os arquivos no disco.

### Observações 💡
Ainda quero sacar direito como aquele usuário fake fixo no código vai se ligar na autenticação (Fase 02) e o motivo de os Prepared Statements (?) barrarem SQL Injection.

---

## Aula 01 — Sanitização: tipagem, validação, Prepared Statements e GET (09/09/2026)

### O que eu aprendi ✅
Coloquei em prática os 4 pilares de segurança: tipagem explícita, validação na entrada, Prepared Statements e erros controlados.

Juntei as regras em um lugar só (PRIORIDADES, STATUS_VALIDOS) e montei helpers (tituloValido, normalizarPrioridade, normalizarStatus, parsearId), no lugar de repetir a mesma validação em cada rota.

Removi o as any e o db.exec() com texto concatenado da inicialização do banco, substituindo por Prepared Statements compilados uma só vez fora das rotas.

Entendi a armadilha do Express com arrays na query string (?search=a&search=b chega como ['a','b']; ?search[]=a&search[]=b deixa o search como undefined) e resolvi aplicando coerção segura (typeof req.query.search === "string").

No catch, abandonei o erro detalhado (erro.message) em favor de uma resposta genérica, evitando expor a estrutura do banco.

### Principal dificuldade 🧩
Perceber que o código anterior quebrava em silêncio quando recebia arrays pela URL, sem lançar erro nenhum — só notei a diferença depois de testar os dois formatos de ataque.

Um comentário que colei no .http quebrou linha sem repetir o #, e o REST Client leu aquilo como header inválido.

### Como eu resolvi 🔧
Incluí os testes 31 e 32 no .http e rodei antes e depois da proteção, comparando o que mudava no comportamento.

Ajustei a quebra de linha dos comentários e uni os dois arquivos de teste (testes.http e resquest.http) em um único.

### Observações 💡
Ficaram Prepared Statements criados e ainda sem uso nas rotas de escrita — a limpeza de POST/PUT/PATCH/DELETE fica para a próxima aula.

---

## Aula 02 — Sanitização: POST, DELETE, PUT e PATCH (16/09/2026)

### O que eu aprendi ✅
Levei a mesma proteção do GET para as rotas de escrita: POST, PUT, PATCH e DELETE passaram a usar os helpers de validação e os Prepared Statements que tinham ficado sem uso na aula anterior.

Aprendi que no SQLite o sucesso de um UPDATE ou DELETE é medido pelo resultado.changes: se for 0, nenhuma linha foi afetada e a resposta é 404.

Padronizei os códigos de resposta: 400 para dado inválido, 404 para registro inexistente e 500 com mensagem genérica.

Usei db.transaction() no PATCH para a atualização parcial ser atômica: ou todos os campos mudam, ou nenhum.

Passei a porta e o segredo para variáveis de ambiente (process.env.PORT e process.env.JWT_SECRET), com um valor padrão só para estudo.

### Principal dificuldade 🧩
Montar o PATCH, porque ele precisa aceitar só os campos que vieram no corpo e ainda assim validar cada um.

### Como eu resolvi 🔧
Validei campo por campo com os helpers, respondi 400 quando o corpo vem vazio e coloquei as atualizações dentro de uma transação. Criei testes no .http para status inválido e PATCH sem nenhum campo.

---

## Aula 03 — Registro e login com bcrypt e JWT (23/09/2026)

### O que eu aprendi ✅
Criei as rotas POST /api/auth/register e POST /api/auth/login. A senha nunca é salva: o banco guarda só o hash gerado pelo bcryptjs (custo 10), e no login comparo a senha digitada com esse hash.

No login certo, o servidor devolve um token JWT assinado com JWT_SECRET, válido por 1 hora, com o id do usuário dentro (campo sub).

Respondo a mesma mensagem ("E-mail ou senha incorretos.") para e-mail inexistente e senha errada, e comparo com um hash falso quando o e-mail não existe, para o tempo de resposta não denunciar quais e-mails estão cadastrados.

Deixei o e-mail único sem diferenciar maiúsculas (índice UNIQUE com COLLATE NOCASE) e só respondo 409 quando o erro é mesmo de e-mail repetido.

### Principal dificuldade 🧩
Ter que copiar o token do login na mão para cada requisição de teste no .http, e ele expira em 1 hora.

### Como eu resolvi 🔧
Dei um nome para a requisição de login no REST Client (# @name login) e passei a ler o token direto da resposta, guardando em {{token}}. Assim é só rodar o login de novo quando expirar.

---

## Aula 04 — Rotas protegidas e isolamento por usuário (30/09/2026)

### O que eu aprendi ✅
Criei o middleware exigirLogin: ele lê o cabeçalho Authorization: Bearer <token>, valida o JWT e coloca o id do usuário em req.usuarioId. Sem token ou com token inválido/expirado, responde 401 antes de chegar na rota.

A tabela tarefas ganhou a coluna usuario_id, e todas as consultas filtram por ela (WHERE id = ? AND usuario_id = ?). Se alguém tenta editar ou apagar a tarefa de outra pessoa, a consulta afeta 0 linhas e a resposta é 404, sem revelar que a tarefa existe.

### Principal dificuldade 🧩
Depois de mudar a tabela, o servidor quebrou com o meu tarefas.db antigo: CREATE TABLE IF NOT EXISTS não altera uma tabela que já existe, e ela estava sem as colunas prioridade e usuario_id.

### Como eu resolvi 🔧
O servidor agora confere as colunas com PRAGMA table_info e acrescenta as que faltam com ALTER TABLE, sem apagar dados. Para testar o isolamento, criei no .http uma seção com um segundo usuário (Maria) tentando ler, editar e apagar a tarefa do primeiro.

---

## Aula 05 — Primeiro app em React com Vite (07/10/2026)

### O que eu aprendi ✅
Criei o projeto primeiro-app-react com o Vite (npm create vite@latest, template react) e rodei com npm run dev.

Usei useState para guardar valores que mudam na tela (quantas tarefas concluí e se o modo foco está ligado): quando chamo o set, o React desenha a tela de novo sozinho.

Separei o botão em um componente próprio (BotaoAcao) e reaproveitei nos três botões, mudando só as props (texto, aoClicar, tipo e desabilitado).

Usei renderização condicional ({metaBatida && ...}) para a mensagem só aparecer quando a meta chega em 5.

### Principal dificuldade 🧩
Os arquivos foram parar em pastas erradas (src/src/ e src/src/src/), o App.jsx acabou virando uma cópia do main.jsx e o vite.config.js ficou vazio, então o app não abria.

### Como eu resolvi 🔧
Deixei todos os arquivos direto em src/, configurei o vite.config.js com o plugin do React e refiz a tela da aula no arquivo Aula05MetaFoco.jsx.

---

## Aula 06 — Gerenciador de tarefas em React (14/10/2026)

### O que eu aprendi ✅
Montei o gerenciador no App.jsx guardando a lista em useState. Para adicionar uso o spread ([...atual, nova]), para marcar uso map e para remover e "limpar concluídas" uso filter, sempre criando uma lista nova em vez de alterar a antiga.

Separei cada tarefa no componente ItemTarefa. Ele não mexe no estado: recebe as funções aoMarcar e aoRemover por props e só avisa o App (o pai) qual id foi clicado.

Reaproveitei o BotaoAcao da Aula 05 nos botões de adicionar, remover e nos filtros (todas, pendentes e concluídas).

Os contadores (pendentes e concluídas) e a lista filtrada são calculados a partir do estado, sem useState próprio.

Coloquei a key={t.id} no componente dentro do map, no pai, que é onde o React precisa dela.

### Principal dificuldade 🧩
Entender por que não posso só dar push na lista (tarefas.push(nova)): o React não percebia a mudança e a tela não atualizava.

### Como eu resolvi 🔧
Passei a sempre criar uma lista nova com spread, map e filter dentro do set, usando a forma setTarefas((atual) => ...), que pega a versão mais recente da lista.

---

## Aula 10 — Deploy no Render com banco no Turso (18/11/2026)

### O que eu aprendi ✅
Troquei o better-sqlite3 pelo @libsql/client para usar o Turso, um SQLite na nuvem. Com TURSO_URL e TURSO_TOKEN o servidor usa o Turso; sem elas, continua no arquivo tarefas.db. As rotas viraram async/await e o SQL continua parametrizado (valores sempre em args).

Criei o front em React + TypeScript na pasta web/, com login e cadastro. O token JWT fica no localStorage e vai no cabeçalho Authorization. Se a API responde 401, o app volta para o login.

No Render, um Web Service só entrega a API (/api) e a página do React (web/dist). Como é o mesmo endereço, não precisa de CORS.

### Diário de Bordo — Deploy no Render

**1. Por que o build precisou de `npm --prefix web install` antes do `npm run build:web`?**
O Render clona o repositório do zero, e o node_modules/ está no .gitignore. Sem instalar as dependências dentro de web/, o Vite e o TypeScript do front não existiriam lá e o build quebraria.

**2. Qual é a função do render.yaml e por que buildCommand e startCommand pedem atenção?**
Ele descreve o serviço como código: nome, plano, comandos, variáveis e health check. O padrão do Render é só `npm install`; se o buildCommand não tiver `&& npm run build`, o web/dist nunca é gerado e o site mostra "Ainda não existe o build do front-end". O startCommand é o que liga o servidor.

**3. Por que o JWT_SECRET pôde ficar em branco e o TURSO_URL/TURSO_TOKEN não?**
O JWT_SECRET só precisa ser um segredo aleatório, e o `generateValue: true` faz o Render criar um sozinho. Já a URL e o token do Turso apontam para o MEU banco: só eu tenho esses dados, então preciso copiar do painel do Turso.

**4. Para que serve a rota /api/db-check?**
Ela confirma que a API consegue falar com o banco (SELECT 1), lista as tabelas criadas e conta os registros de cada uma. Em produção, mostra se o Turso está conectado sem precisar testar login, separando erro de banco de erro de senha.

**5. Por que rodar npm run build localmente antes do git push?**
Porque o push dispara o deploy automático. Se o build quebra na minha máquina, vai quebrar no Render também; testando antes, eu corrijo sem derrubar o site.

**6. O que aconteceu ao dar F5 em /tarefas na URL pública?**
A página carregou normalmente, sem 404. O Express devolve o index.html para qualquer caminho que não seja /api, e o React decide a tela. [confirmar depois do deploy]

**7. Encontrei algum erro? Qual a causa e a solução?**
No build local, o projeto antigo do primeiro-app-react tinha arquivos em pastas erradas (src/src/src), o que quebrava o build do Vite. Organizei tudo direto em src/. [completar se aparecer algum erro nos logs do Render]
