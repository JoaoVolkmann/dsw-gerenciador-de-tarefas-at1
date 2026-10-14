Aula 00 — Ambiente e primeiros passos (02/09/2026)
O que eu aprendi ✅
Montei o back-end em Node.js com TypeScript (tsx, npm run dev) e subi uma API REST no Express (server.ts), com as rotas GET/POST/PUT/PATCH/DELETE respondendo em /api/tasks.
Guardei os dados com better-sqlite3 no arquivo tarefas.db, gerando as tabelas por meio de CREATE TABLE IF NOT EXISTS.
Consegui testar a API antes de existir front-end, escrevendo requisições em arquivos .http e disparando pela extensão REST Client do VS Code.
Principal dificuldade 🧩
No primeiro commit acabei enviando a pasta node_modules/ e o tarefas.db junto, sem notar.
Como eu resolvi 🔧
Escrevi um .gitignore e rodei git rm --cached para removê-los do versionamento, mantendo os arquivos no disco.
Observações (opcional) 💡
Ainda quero sacar direito como aquele usuário fake fixo no código vai se ligar na autenticação (Fase 02) e o motivo de os Prepared Statements (?) barrarem SQL Injection.
Aula 02 — Sanitização e segurança do servidor (09/09/2026)
O que eu aprendi ✅
Coloquei em prática os 4 pilares de segurança: tipagem explícita, validação na entrada, Prepared Statements e erros controlados.
Juntei as regras em um lugar só (PRIORIDADES, STATUS_VALIDOS) e montei helpers (tituloValido, normalizarPrioridade, normalizarStatus, parsearId), no lugar de repetir a mesma validação em cada rota.
Removi o as any e o db.exec() com texto concatenado da inicialização do banco, substituindo por Prepared Statements compilados uma só vez fora das rotas.
Entendi a armadilha do Express com arrays na query string (?search=a&search=b chega como ['a','b']; ?search[]=a&search[]=b deixa o search como undefined) e resolvi aplicando coerção segura (typeof req.query.search === "string").
No catch, abandonei o erro detalhado (erro.message) em favor de uma resposta genérica, evitando expor a estrutura do banco.
Principal dificuldade 🧩
Perceber que o código anterior quebrava em silêncio quando recebia arrays pela URL, sem lançar erro nenhum — só notei a diferença depois de testar os dois formatos de ataque.
Um comentário que colei no .http quebrou linha sem repetir o #, e o REST Client leu aquilo como header inválido.
Como eu resolvi 🔧
Incluí os testes 31 e 32 no .http e rodei antes e depois da proteção, comparando o que mudava no comportamento.
Ajustei a quebra de linha dos comentários e uni os dois arquivos de teste (testes.http e resquest.http) em um único.
Observações (opcional) 💡
Ficaram Prepared Statements criados e ainda sem uso nas rotas de escrita — a limpeza de POST/PUT/PATCH/DELETE fica para a próxima aula.
Aula 03 — Registro e login com bcrypt e JWT (23/09/2026)
O que eu aprendi ✅
Criei as rotas POST /api/auth/register e POST /api/auth/login. A senha nunca é salva: o banco guarda só o hash gerado pelo bcryptjs (custo 10), e no login comparo a senha digitada com esse hash.
No login certo, o servidor devolve um token JWT assinado com JWT_SECRET, válido por 1 hora, com o id do usuário dentro (campo sub).
Respondo a mesma mensagem ("E-mail ou senha incorretos.") para e-mail inexistente e senha errada, e comparo com um hash falso quando o e-mail não existe, para o tempo de resposta não denunciar quais e-mails estão cadastrados.
Deixei o e-mail único sem diferenciar maiúsculas (índice UNIQUE com COLLATE NOCASE) e só respondo 409 quando o erro é mesmo de e-mail repetido.
Principal dificuldade 🧩
(preencher)
Como eu resolvi 🔧
(preencher)
Aula 04 — Rotas protegidas e isolamento por usuário (30/09/2026)
O que eu aprendi ✅
Criei o middleware exigirLogin: ele lê o cabeçalho Authorization: Bearer <token>, valida o JWT e coloca o id do usuário em req.usuarioId. Sem token ou com token inválido/expirado, responde 401 antes de chegar na rota.
A tabela tarefas ganhou a coluna usuario_id, e todas as consultas filtram por ela (WHERE id = ? AND usuario_id = ?). Se alguém tenta editar ou apagar a tarefa de outra pessoa, a consulta afeta 0 linhas e a resposta é 404, sem revelar que a tarefa existe.
Aprendi que CREATE TABLE IF NOT EXISTS não altera tabela antiga: o meu tarefas.db velho estava sem as colunas prioridade e usuario_id, então o servidor confere com PRAGMA table_info e acrescenta as colunas que faltam, sem apagar dados.
Principal dificuldade 🧩
(preencher)
Como eu resolvi 🔧
(preencher)
Aula 05 — Primeiro app em React com Vite
O que eu aprendi ✅
Criei o projeto primeiro-app-react com o Vite (npm create vite@latest, template react) e rodei com npm run dev.
Usei useState para guardar valores que mudam na tela (quantas tarefas concluí e se o modo foco está ligado): quando chamo o set, o React desenha a tela de novo sozinho.
Separei o botão em um componente próprio (BotaoAcao) e reaproveitei nos três botões, mudando só as props (texto, aoClicar, tipo e desabilitado).
Usei renderização condicional ({metaBatida && ...}) para a mensagem só aparecer quando a meta chega em 5.
Principal dificuldade 🧩
(preencher)
Como eu resolvi 🔧
(preencher)
