import express, { type Request, type Response, type NextFunction } from "express";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Segredo que assina os tokens. Em produção, defina JWT_SECRET no ambiente.
const JWT_SECRET = process.env.JWT_SECRET || "segredo-so-para-estudo-troque-em-producao";
const JWT_VALIDADE = "1h";

// Deixa o TypeScript saber que o middleware pendura o id do usuário no req
declare global {
  namespace Express {
    interface Request {
      usuarioId?: number;
    }
  }
}

// ============================================
// Tipagem, regras centralizadas e helpers
// ============================================

interface Tarefa {
  id: number;
  titulo: string;
  status: string;
  prioridade: string;
  usuario_id: number;
}

interface Usuario {
  id: number;
  email: string;
  senha: string;
}

const PRIORIDADES = ["low", "medium", "high"] as const;
const STATUS_VALIDOS = ["pending", "completed"] as const;

const tituloValido = (t: unknown): t is string =>
  typeof t === "string" && t.trim().length >= 3;

const normalizarPrioridade = (p: unknown) => {
  const listaPrioridades = PRIORIDADES as readonly string[];

  return typeof p === "string" && listaPrioridades.includes(p)
    ? p
    : "medium";
};

const normalizarStatus = (s: unknown) => {
  const listaStatus = STATUS_VALIDOS as readonly string[];

  return typeof s === "string" && listaStatus.includes(s)
    ? s
    : "pending";
};

const parsearId = (idParam: string): number | null => {
  const id = Number(idParam);
  // Number("12abc") vira NaN; Number("") vira 0 e Number("1.5") vira 1.5,
  // por isso exigimos inteiro positivo.
  return Number.isInteger(id) && id > 0 ? id : null;
};

// E-mail simples: algo@algo.algo, sem espaços
const emailValido = (e: unknown): e is string =>
  typeof e === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

const SENHA_MINIMA = 8;
const senhaValida = (s: unknown): s is string =>
  typeof s === "string" && s.length >= SENHA_MINIMA;

// Erro de validação separado do erro de banco, para responder 400 em vez de 500
class ErroValidacao extends Error {}

// Middleware para ler o corpo das requisições em formato JSON
app.use(express.json());

const db = new Database("tarefas.db");

db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        senha TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tarefas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        prioridade TEXT DEFAULT 'medium',
        usuario_id INTEGER REFERENCES usuarios(id)
    );
`);

// CREATE TABLE IF NOT EXISTS não mexe em tabela que já existe. Um tarefas.db
// antigo pode estar sem colunas novas, então acrescentamos as que faltarem.
// Nada é apagado: tarefas antigas ficam sem dono (NULL) e não aparecem para ninguém.
const colunasTarefas = db.prepare("PRAGMA table_info(tarefas)").all() as { name: string }[];
const garantirColuna = (nome: string, definicao: string) => {
  if (!colunasTarefas.some((c) => c.name === nome)) {
    // nome e definicao são fixos no código, nunca vêm do usuário
    db.prepare(`ALTER TABLE tarefas ADD COLUMN ${nome} ${definicao}`).run();
  }
};
garantirColuna("prioridade", "TEXT DEFAULT 'medium'");
garantirColuna("usuario_id", "INTEGER REFERENCES usuarios(id)");

// E-mail único (case-insensitive). Índice serve tanto para banco novo quanto antigo.
db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email COLLATE NOCASE)").run();
db.prepare("CREATE INDEX IF NOT EXISTS idx_tarefas_usuario ON tarefas(usuario_id)").run();

// ============================================
// Prepared Statements (compilados UMA ÚNICA VEZ)
// ============================================

const stmtContarUsuarios = db.prepare("SELECT COUNT(*) as count FROM usuarios");
const stmtInserirUsuario = db.prepare("INSERT INTO usuarios (email, senha) VALUES (?, ?)");
const stmtUsuarioPorEmail = db.prepare("SELECT * FROM usuarios WHERE email = ? COLLATE NOCASE");

// Toda consulta de tarefa leva o dono junto: ninguém enxerga a tarefa de outro.
const stmtListarTodas = db.prepare("SELECT * FROM tarefas WHERE usuario_id = ?");
const stmtBuscarPorTitulo = db.prepare("SELECT * FROM tarefas WHERE usuario_id = ? AND titulo LIKE ?");
const stmtBuscarPorId = db.prepare("SELECT * FROM tarefas WHERE id = ? AND usuario_id = ?");
const stmtInserirTarefa = db.prepare("INSERT INTO tarefas (titulo, status, prioridade, usuario_id) VALUES (?, 'pending', ?, ?)");
const stmtDeletarTarefa = db.prepare("DELETE FROM tarefas WHERE id = ? AND usuario_id = ?");
const stmtAtualizarTarefa = db.prepare("UPDATE tarefas SET titulo = ?, status = ?, prioridade = ? WHERE id = ? AND usuario_id = ?");

// Usuário de exemplo (o mesmo das aulas de SQL Injection). Agora a senha
// também vai como hash: se vazar, o atacante não lê a senha de verdade.
const usuariosExistentes = stmtContarUsuarios.get() as { count: number };

if (usuariosExistentes.count === 0) {
  // Bom: Usamos a busca já preparada e passamos os dados de forma parametrizada
  stmtInserirUsuario.run("admin@senai.com", bcrypt.hashSync("senha_super_secreta_123", 10));
}

console.log("Banco de dados SQLite inicializado com sucesso!");

// Hash de verdade usado quando o e-mail não existe: assim o login demora o
// mesmo tempo nos dois casos e não denuncia quais e-mails estão cadastrados.
const HASH_FALSO = bcrypt.hashSync("usuario-que-nao-existe", 10);

// ============================================
// Middleware de autenticação
// ============================================

const exigirLogin = (req: Request, res: Response, next: NextFunction) => {
  const [tipo, token] = (req.headers.authorization ?? "").split(" ");

  if (tipo !== "Bearer" || !token) {
    return res.status(401).json({ error: "Faça login para acessar suas tarefas." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const id = typeof payload === "object" ? Number(payload.sub) : NaN;
    if (!Number.isInteger(id)) throw new Error("token sem usuário");

    req.usuarioId = id;
    return next();
  } catch {
    return res.status(401).json({ error: "Sessão inválida ou expirada. Faça login novamente." });
  }
};

// Rota de integridade do sistema (Health Check)
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Servidor do Gestor de Tarefas ativo!" });
});

app.get("/api/version", (req, res) => {
  res.json({ appName: "Gerenciador de Tarefas Multi-Usuário", version: "1.0.0" });
});

// ============================================
// Autenticação — cadastro e login
// ============================================

app.post("/api/auth/register", (req, res) => {
  const { email, senha } = req.body ?? {};

  if (!emailValido(email)) {
    return res.status(400).json({ error: "Informe um e-mail válido." });
  }
  if (!senhaValida(senha)) {
    return res.status(400).json({ error: `A senha deve ter pelo menos ${SENHA_MINIMA} caracteres.` });
  }

  // Nunca guardamos a senha: só o hash (custo 10)
  const hash = bcrypt.hashSync(senha, 10);

  try {
    const resultado = stmtInserirUsuario.run(email.trim().toLowerCase(), hash);
    return res.status(201).json({ id: Number(resultado.lastInsertRowid), email: email.trim().toLowerCase() });
  } catch (erro) {
    // Só o erro de e-mail repetido vira 409; o resto é erro interno
    if (erro instanceof Error && "code" in erro && erro.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ error: "Este e-mail já está cadastrado." });
    }
    return res.status(500).json({ error: "Erro ao cadastrar usuário." });
  }
});

app.post("/api/auth/login", (req, res) => {
  const { email, senha } = req.body ?? {};

  if (typeof email !== "string" || typeof senha !== "string") {
    return res.status(400).json({ error: "Informe e-mail e senha." });
  }

  const usuario = stmtUsuarioPorEmail.get(email.trim()) as Usuario | undefined;

  // Compara sempre (com o hash falso se o usuário não existe) — mesmo tempo de resposta
  const senhaConfere = bcrypt.compareSync(senha, usuario?.senha ?? HASH_FALSO);

  if (!usuario || !senhaConfere) {
    // Mesma mensagem para e-mail inexistente e senha errada
    return res.status(401).json({ error: "E-mail ou senha incorretos." });
  }

  const token = jwt.sign({ sub: String(usuario.id), email: usuario.email }, JWT_SECRET, {
    expiresIn: JWT_VALIDADE,
  });

  return res.json({ token, expiraEm: JWT_VALIDADE });
});

// Todas as rotas de tarefas exigem login daqui pra baixo
app.use("/api/tasks", exigirLogin);

// ============================================
// GET — listagem blindada
// ============================================

app.get("/api/tasks", (req, res) => {
  const usuarioId = req.usuarioId!;
  // 1. Coerção Segura: Forçamos a variável a ser uma String vazia caso tentem nos enviar um Array
  const search = typeof req.query.search === "string" ? req.query.search : "";

  try {
    if (search) {
      // 2. Proteção: O '%' entra DEPOIS, apenas dentro do parâmetro
      const tarefas = stmtBuscarPorTitulo.all(usuarioId, `%${search}%`);
      res.json(tarefas);
    } else {
      // 3. Performance: Usamos a busca compilada
      const tarefas = stmtListarTodas.all(usuarioId);
      res.json(tarefas);
    }
  } catch {
    // 4. Erro Controlado: mensagem genérica para não vazar a estrutura do banco
    res.status(500).json({ error: "Erro interno ao processar a listagem." });
  }
});

// ============================================
// POST — criação blindada
// ============================================

app.post("/api/tasks", (req, res) => {
  const usuarioId = req.usuarioId!;
  const { titulo, prioridade } = req.body ?? {};
  const prioridadeValida = normalizarPrioridade(prioridade);

  // Validação via helper (type guard)
  if (!tituloValido(titulo)) {
    return res.status(400).json({
      error: "O título da tarefa é obrigatório e deve conter pelo menos 3 caracteres válidos."
    });
  }

  try {
    const resultado = stmtInserirTarefa.run(titulo.trim(), prioridadeValida, usuarioId);
    const novaTarefa = stmtBuscarPorId.get(resultado.lastInsertRowid, usuarioId) as Tarefa;
    return res.status(201).json(novaTarefa);
  } catch {
    return res.status(500).json({ error: "Erro ao processar persistência" });
  }
});

// ============================================
// DELETE — exclusão blindada
// ============================================

app.delete("/api/tasks/:id", (req, res) => {
  const usuarioId = req.usuarioId!;
  const id = parsearId(req.params.id);

  if (id === null) {
    return res.status(400).json({ error: "ID inválido." });
  }

  try {
    const resultado = stmtDeletarTarefa.run(id, usuarioId);

    // No SQLite, o sucesso é medido pelo número de linhas afetadas (changes).
    // Tarefa de outro usuário também dá 0 linhas: respondemos 404 sem contar que ela existe.
    if (resultado.changes === 0) {
      return res.status(404).json({ error: "Tarefa não localizada para exclusão." });
    }

    return res.json({ message: "Tarefa excluída do banco SQLite com sucesso!" });
  } catch {
    return res.status(500).json({ error: "Erro ao processar a exclusão no banco de dados." });
  }
});

// ============================================
// PUT — atualização completa blindada
// ============================================

app.put("/api/tasks/:id", (req, res) => {
  const usuarioId = req.usuarioId!;
  const id = parsearId(req.params.id);

  if (id === null) {
    return res.status(400).json({ error: "ID inválido." });
  }

  const { titulo, prioridade, status } = req.body ?? {};

  if (!tituloValido(titulo)) {
    return res.status(400).json({
      error: "O título da tarefa é obrigatório e deve conter pelo menos 3 caracteres válidos."
    });
  }

  const prioridadeValida = normalizarPrioridade(prioridade);
  const statusValido = normalizarStatus(status);

  try {
    const resultado = stmtAtualizarTarefa.run(titulo.trim(), statusValido, prioridadeValida, id, usuarioId);

    if (resultado.changes === 0) {
      return res.status(404).json({ message: "Tarefa não encontrada para atualização!" });
    }

    // Busca a tarefa recém-atualizada para devolver no corpo (Princípio REST)
    const tarefaAtualizada = stmtBuscarPorId.get(id, usuarioId) as Tarefa;
    return res.status(200).json(tarefaAtualizada);
  } catch {
    return res.status(500).json({ error: "Erro ao processar a atualização no banco de dados." });
  }
});

// ============================================
// PATCH — atualização parcial, atômica e validada sob demanda
// ============================================

app.patch("/api/tasks/:id", (req, res) => {
  const usuarioId = req.usuarioId!;
  const id = parsearId(req.params.id);

  if (id === null) {
    return res.status(400).json({ error: "ID inválido." });
  }

  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ error: "Nenhum campo fornecido para atualização." });
  }

  const { titulo, prioridade, status } = req.body;

  try {
    // Transação garante consistência ao buscar e atualizar (evita estado parcial)
    const fluxoAtualizacao = db.transaction(() => {
      const tarefaExistente = stmtBuscarPorId.get(id, usuarioId) as Tarefa | undefined;
      if (!tarefaExistente) return null;

      const camposParaAtualizar: string[] = [];
      const valoresParaAtualizar: (string | number)[] = [];

      if (titulo !== undefined) {
        if (!tituloValido(titulo)) {
          throw new ErroValidacao("O título da tarefa deve conter pelo menos 3 caracteres válidos.");
        }
        camposParaAtualizar.push("titulo = ?");
        valoresParaAtualizar.push(titulo.trim());
      }

      if (prioridade !== undefined) {
        const listaPrioridades = PRIORIDADES as readonly string[];
        if (typeof prioridade !== "string" || !listaPrioridades.includes(prioridade)) {
          throw new ErroValidacao("Prioridade inválida. Use 'low', 'medium' ou 'high'.");
        }
        camposParaAtualizar.push("prioridade = ?");
        valoresParaAtualizar.push(prioridade);
      }

      if (status !== undefined) {
        const listaStatus = STATUS_VALIDOS as readonly string[];
        if (typeof status !== "string" || !listaStatus.includes(status)) {
          throw new ErroValidacao("Status inválido. Use 'pending' ou 'completed'.");
        }
        camposParaAtualizar.push("status = ?");
        valoresParaAtualizar.push(status);
      }

      if (camposParaAtualizar.length === 0) return tarefaExistente;

      // Montagem segura da query dinâmica: só nomes de coluna nossos entram no texto,
      // os valores do usuário seguem como parâmetros (?)
      const sql = `UPDATE tarefas SET ${camposParaAtualizar.join(", ")} WHERE id = ? AND usuario_id = ?`;
      valoresParaAtualizar.push(id, usuarioId);

      db.prepare(sql).run(...valoresParaAtualizar);
      return stmtBuscarPorId.get(id, usuarioId) as Tarefa;
    });

    const resultado = fluxoAtualizacao();

    if (!resultado) {
      return res.status(404).json({ message: "Tarefa não encontrada para atualização parcial!" });
    }

    return res.status(200).json(resultado);
  } catch (erro) {
    if (erro instanceof ErroValidacao) {
      return res.status(400).json({ error: erro.message });
    }
    return res.status(500).json({ error: "Erro ao processar a atualização parcial no banco." });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em: http://localhost:${PORT}`);
});
