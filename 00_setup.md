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
