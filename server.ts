import express, { type Request, type Response, type NextFunction } from "express";
import { createClient, type InArgs, type Row } from "@libsql/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Lê o .env da raiz (só existe na sua máquina; no Render as variáveis vêm do painel).
// Um .env salvo COM BOM faz a primeira variável ser ignorada sem erro, por isso o aviso.
const ARQUIVO_ENV = path.join(__dirname, ".env");
if (existsSync(ARQUIVO_ENV)) {
  const bruto = readFileSync(ARQUIVO_ENV);
  if (bruto[0] === 0xef && bruto[1] === 0xbb && bruto[2] === 0xbf) {
    console.warn("[ATENÇÃO] O .env foi salvo com BOM: salve de novo em UTF-8 sem BOM.");
  }
  process.loadEnvFile(ARQUIVO_ENV);
}

// No Render a variável RENDER vem como "true". NODE_ENV=production também conta.
const EM_PRODUCAO = process.env.NODE_ENV === "production" || process.env.RENDER === "true";

// Segredo que assina os tokens. Em produção ele é obrigatório: sem ele o servidor nem sobe.
if (EM_PRODUCAO && !process.env.JWT_SECRET) {
  throw new Error("Defina a variável de ambiente JWT_SECRET antes de subir em produção.");
}
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

// O libsql devolve linhas próprias; convertemos para objetos simples antes do JSON
const paraTarefa = (r: Row): Tarefa => ({
  id: Number(r.id),
  titulo: String(r.titulo),
  status: String(r.status),
  prioridade: String(r.prioridade),
  usuario_id: Number(r.usuario_id),
});

const paraUsuario = (r: Row): Usuario => ({
  id: Number(r.id),
  email: String(r.email),
  senha: String(r.senha),
});

// E-mail repetido: o libsql pode avisar em "code" ou em "extendedCode"
const ehEmailRepetido = (erro: unknown) => {
  if (!(erro instanceof Error)) return false;
  const e = erro as Error & { code?: string; extendedCode?: string };
  return [e.code, e.extendedCode].some((c) => typeof c === "string" && c.includes("CONSTRAINT"))
    && /UNIQUE/i.test(`${e.extendedCode ?? ""} ${e.message}`);
};

// ============================================
// Middlewares gerais
// ============================================

app.use(express.json());

// CORS só é necessário se o front ficar em outro endereço (ex.: Static Site separado).
// Defina CORS_ORIGIN com o endereço do front. Sem a variável, nada muda.
const CORS_ORIGIN = process.env.CORS_ORIGIN;
if (CORS_ORIGIN) {
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    return next();
  });
}

// ============================================
// Banco de dados — Turso (libSQL) na nuvem, arquivo local no desenvolvimento
// ============================================

// Com TURSO_URL (libsql://...) e TURSO_TOKEN, o banco fica no Turso.
// Sem elas, usamos o arquivo tarefas.db local, igual antes.
const TURSO_URL = process.env.TURSO_URL;
const TURSO_TOKEN = process.env.TURSO_TOKEN;
const usandoNuvem = Boolean(TURSO_URL && TURSO_TOKEN);
const MODO_BANCO = usandoNuvem ? "Turso / libSQL (nuvem)" : "arquivo local (SQLite)";

// No Render o disco é apagado a cada deploy: sem Turso, os dados sumiriam.
if (EM_PRODUCAO && !usandoNuvem) {
  throw new Error("Defina TURSO_URL e TURSO_TOKEN antes de subir em produção.");
}

const db = createClient({
  url: usandoNuvem ? TURSO_URL! : "file:tarefas.db",
  authToken: usandoNuvem ? TURSO_TOKEN : undefined,
});

// ============================================
// SQL parametrizado (centralizado UMA ÚNICA VEZ)
// No libsql não existe db.prepare(): o texto do SQL fica fixo aqui em cima e
// os valores do usuário vão sempre separados em "args" (os ?). É o mesmo
// princípio dos Prepared Statements: dado nunca vira parte do comando.
// ============================================

const SQL = {
  inserirUsuario: "INSERT INTO usuarios (email, senha) VALUES (?, ?)",
  usuarioPorEmail: "SELECT * FROM usuarios WHERE email = ? COLLATE NOCASE",

  // Toda consulta de tarefa leva o dono junto: ninguém enxerga a tarefa de outro.
  listarTodas: "SELECT * FROM tarefas WHERE usuario_id = ? ORDER BY id",
  buscarPorTitulo: "SELECT * FROM tarefas WHERE usuario_id = ? AND titulo LIKE ? ORDER BY id",
  buscarPorId: "SELECT * FROM tarefas WHERE id = ? AND usuario_id = ?",
  inserirTarefa: "INSERT INTO tarefas (titulo, status, prioridade, usuario_id) VALUES (?, 'pending', ?, ?)",
  deletarTarefa: "DELETE FROM tarefas WHERE id = ? AND usuario_id = ?",
  atualizarTarefa: "UPDATE tarefas SET titulo = ?, status = ?, prioridade = ? WHERE id = ? AND usuario_id = ?",
} as const;

const executar = (sql: string, args: InArgs = []) => db.execute({ sql, args });

async function inicializarBanco() {
  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS usuarios (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL,
          senha TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS tarefas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          titulo TEXT NOT NULL,
          status TEXT DEFAULT 'pending',
          prioridade TEXT DEFAULT 'medium',
          usuario_id INTEGER REFERENCES usuarios(id)
      )`,
    ],
    "write"
  );

  // CREATE TABLE IF NOT EXISTS não mexe em tabela que já existe. Um banco
  // antigo pode estar sem colunas novas, então acrescentamos as que faltarem.
  const colunas = (await executar("PRAGMA table_info(tarefas)")).rows.map((c) => String(c.name));
  const garantirColuna = async (nome: string, definicao: string) => {
    if (!colunas.includes(nome)) {
      // nome e definicao são fixos no código, nunca vêm do usuário
      await executar(`ALTER TABLE tarefas ADD COLUMN ${nome} ${definicao}`);
    }
  };
  await garantirColuna("prioridade", "TEXT DEFAULT 'medium'");
  await garantirColuna("usuario_id", "INTEGER REFERENCES usuarios(id)");

  // E-mail único (case-insensitive) e índice para listar tarefas por dono
  await executar("CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email COLLATE NOCASE)");
  await executar("CREATE INDEX IF NOT EXISTS idx_tarefas_usuario ON tarefas(usuario_id)");

  // Usuário padrão do laboratório (usado no roteiro de teste do deploy).
  // A senha fica só como hash no banco; ela aparece no código porque é a
  // conta de demonstração combinada em aula, não uma conta pessoal.
  const admin = await executar(SQL.usuarioPorEmail, ["admin@senai.com"]);
  if (admin.rows.length === 0) {
    await executar(SQL.inserirUsuario, ["admin@senai.com", bcrypt.hashSync("senha_super_secreta_123", 10)]);
  }
}

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

// Rota de integridade do sistema (Health Check) — o Render só libera o site se ela der 200
app.get("/api/health", async (_req: Request, res: Response) => {
  try {
    await db.execute("SELECT 1");
    return res.json({ status: "ok", message: "Servidor do Gestor de Tarefas ativo!", banco: MODO_BANCO });
  } catch {
    return res.status(503).json({
      status: "erro",
      message: "O servidor está no ar, mas o banco de dados não respondeu.",
      banco: MODO_BANCO,
    });
  }
});

app.get("/api/version", (req: Request, res: Response) => {
  res.json({ appName: "Gerenciador de Tarefas Multi-Usuário", version: "1.1.0" });
});

// Diagnóstico do banco: confirma a conexão, lista as tabelas e conta os registros.
// Os nomes das tabelas vêm do próprio sqlite_master (não do usuário).
app.get("/api/db-check", async (_req: Request, res: Response) => {
  try {
    await db.execute("SELECT 1");
    const { rows: tabelas } = await db.execute({
      sql: "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
    });
    const contagem: Record<string, number> = {};
    for (const t of tabelas) {
      const nome = (t as any).name;
      const { rows } = await db.execute({ sql: `SELECT COUNT(*) as total FROM ${nome}` });
      contagem[nome] = Number((rows[0] as any).total);
    }
    return res.json({ ok: true, tabelas: tabelas.map((t) => (t as any).name), contagem });
  } catch (erro: any) {
    return res.status(503).json({ ok: false, erro: erro?.message || "Falha ao consultar banco" });
  }
});

// ============================================
// Autenticação — cadastro e login
// ============================================

app.post("/api/auth/register", async (req: Request, res: Response) => {
  const { email, senha } = req.body ?? {};

  if (!emailValido(email)) {
    return res.status(400).json({ error: "Informe um e-mail válido." });
  }
  if (!senhaValida(senha)) {
    return res.status(400).json({ error: `A senha deve ter pelo menos ${SENHA_MINIMA} caracteres.` });
  }

  // Nunca guardamos a senha: só o hash (custo 10)
  const hash = bcrypt.hashSync(senha, 10);
  const emailLimpo = email.trim().toLowerCase();

  try {
    const resultado = await executar(SQL.inserirUsuario, [emailLimpo, hash]);
    return res.status(201).json({ id: Number(resultado.lastInsertRowid), email: emailLimpo });
  } catch (erro) {
    // Só o erro de e-mail repetido vira 409; o resto é erro interno
    if (ehEmailRepetido(erro)) {
      return res.status(409).json({ error: "Este e-mail já está cadastrado." });
    }
    return res.status(500).json({ error: "Erro ao cadastrar usuário." });
  }
});

app.post("/api/auth/login", async (req: Request, res: Response) => {
  const { email, senha } = req.body ?? {};

  if (typeof email !== "string" || typeof senha !== "string") {
    return res.status(400).json({ error: "Informe e-mail e senha." });
  }

  try {
    const linha = (await executar(SQL.usuarioPorEmail, [email.trim()])).rows[0];
    const usuario = linha ? paraUsuario(linha) : undefined;

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
  } catch {
    return res.status(500).json({ error: "Erro ao fazer login." });
  }
});

// Todas as rotas de tarefas exigem login daqui pra baixo
app.use("/api/tasks", exigirLogin);

// ============================================
// GET — listagem blindada
// ============================================

app.get("/api/tasks", async (req: Request, res: Response) => {
  const usuarioId = req.usuarioId!;
  // 1. Coerção Segura: string vazia caso tentem nos enviar um Array
  const search = typeof req.query.search === "string" ? req.query.search : "";

  try {
    // 2. Proteção: o '%' entra DEPOIS, apenas dentro do parâmetro
    const resultado = search
      ? await executar(SQL.buscarPorTitulo, [usuarioId, `%${search}%`])
      : await executar(SQL.listarTodas, [usuarioId]);

    res.json(resultado.rows.map(paraTarefa));
  } catch {
    // 3. Erro Controlado: mensagem genérica para não vazar a estrutura do banco
    res.status(500).json({ error: "Erro interno ao processar a listagem." });
  }
});

// ============================================
// POST — criação blindada
// ============================================

app.post("/api/tasks", async (req: Request, res: Response) => {
  const usuarioId = req.usuarioId!;
  const { titulo, prioridade } = req.body ?? {};
  const prioridadeValida = normalizarPrioridade(prioridade);

  if (!tituloValido(titulo)) {
    return res.status(400).json({
      error: "O título da tarefa é obrigatório e deve conter pelo menos 3 caracteres válidos."
    });
  }

  try {
    const resultado = await executar(SQL.inserirTarefa, [titulo.trim(), prioridadeValida, usuarioId]);
    const novaId = Number(resultado.lastInsertRowid);
    const linha = (await executar(SQL.buscarPorId, [novaId, usuarioId])).rows[0];
    return res.status(201).json(paraTarefa(linha));
  } catch {
    return res.status(500).json({ error: "Erro ao processar persistência" });
  }
});

// ============================================
// DELETE — exclusão blindada
// ============================================

app.delete("/api/tasks/:id", async (req: Request, res: Response) => {
  const usuarioId = req.usuarioId!;
  const id = parsearId(String(req.params.id));

  if (id === null) {
    return res.status(400).json({ error: "ID inválido." });
  }

  try {
    const resultado = await executar(SQL.deletarTarefa, [id, usuarioId]);

    // Sucesso é medido pelas linhas afetadas (rowsAffected).
    // Tarefa de outro usuário também dá 0: respondemos 404 sem contar que ela existe.
    if (resultado.rowsAffected === 0) {
      return res.status(404).json({ error: "Tarefa não localizada para exclusão." });
    }

    return res.json({ message: "Tarefa excluída com sucesso!" });
  } catch {
    return res.status(500).json({ error: "Erro ao processar a exclusão no banco de dados." });
  }
});

// ============================================
// PUT — atualização completa blindada
// ============================================

app.put("/api/tasks/:id", async (req: Request, res: Response) => {
  const usuarioId = req.usuarioId!;
  const id = parsearId(String(req.params.id));

  if (id === null) {
    return res.status(400).json({ error: "ID inválido." });
  }

  const { titulo, prioridade, status } = req.body ?? {};

  if (!tituloValido(titulo)) {
    return res.status(400).json({
      error: "O título da tarefa é obrigatório e deve conter pelo menos 3 caracteres válidos."
    });
  }

  try {
    const resultado = await executar(SQL.atualizarTarefa, [
      titulo.trim(),
      normalizarStatus(status),
      normalizarPrioridade(prioridade),
      id,
      usuarioId,
    ]);

    if (resultado.rowsAffected === 0) {
      return res.status(404).json({ error: "Tarefa não encontrada para atualização!" });
    }

    // Devolve a tarefa atualizada no corpo (Princípio REST)
    const linha = (await executar(SQL.buscarPorId, [id, usuarioId])).rows[0];
    return res.status(200).json(paraTarefa(linha));
  } catch {
    return res.status(500).json({ error: "Erro ao processar a atualização no banco de dados." });
  }
});

// ============================================
// PATCH — atualização parcial, atômica e validada sob demanda
// ============================================

app.patch("/api/tasks/:id", async (req: Request, res: Response) => {
  const usuarioId = req.usuarioId!;
  const id = parsearId(String(req.params.id));

  if (id === null) {
    return res.status(400).json({ error: "ID inválido." });
  }

  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ error: "Nenhum campo fornecido para atualização." });
  }

  const { titulo, prioridade, status } = req.body;

  // Validação antes de abrir a transação: nada inválido chega ao banco
  const campos: string[] = [];
  const valores: (string | number)[] = [];

  try {
    if (titulo !== undefined) {
      if (!tituloValido(titulo)) {
        throw new ErroValidacao("O título da tarefa deve conter pelo menos 3 caracteres válidos.");
      }
      campos.push("titulo = ?");
      valores.push(titulo.trim());
    }

    if (prioridade !== undefined) {
      const listaPrioridades = PRIORIDADES as readonly string[];
      if (typeof prioridade !== "string" || !listaPrioridades.includes(prioridade)) {
        throw new ErroValidacao("Prioridade inválida. Use 'low', 'medium' ou 'high'.");
      }
      campos.push("prioridade = ?");
      valores.push(prioridade);
    }

    if (status !== undefined) {
      const listaStatus = STATUS_VALIDOS as readonly string[];
      if (typeof status !== "string" || !listaStatus.includes(status)) {
        throw new ErroValidacao("Status inválido. Use 'pending' ou 'completed'.");
      }
      campos.push("status = ?");
      valores.push(status);
    }
  } catch (erro) {
    if (erro instanceof ErroValidacao) {
      return res.status(400).json({ error: erro.message });
    }
    throw erro;
  }

  // Transação: buscar e atualizar acontecem juntos (ou nada acontece)
  const tx = await db.transaction("write");
  try {
    const existente = (await tx.execute({ sql: SQL.buscarPorId, args: [id, usuarioId] })).rows[0];
    if (!existente) {
      await tx.rollback();
      return res.status(404).json({ error: "Tarefa não encontrada para atualização parcial!" });
    }

    if (campos.length > 0) {
      // Só nomes de coluna nossos entram no texto; valores do usuário seguem como parâmetros (?)
      await tx.execute({
        sql: `UPDATE tarefas SET ${campos.join(", ")} WHERE id = ? AND usuario_id = ?`,
        args: [...valores, id, usuarioId],
      });
    }

    const atualizada = (await tx.execute({ sql: SQL.buscarPorId, args: [id, usuarioId] })).rows[0];
    await tx.commit();
    return res.status(200).json(paraTarefa(atualizada));
  } catch {
    await tx.rollback().catch(() => {});
    return res.status(500).json({ error: "Erro ao processar a atualização parcial no banco." });
  } finally {
    tx.close();
  }
});

// Rota /api que não existe: 404 em JSON (e não a página do front)
app.use("/api", (req: Request, res: Response) => {
  res.status(404).json({ error: "Rota não encontrada." });
});

// ============================================
// Front-end React (SPA) — o mesmo serviço entrega a página e a API
// ============================================

const pastaFront = path.join(__dirname, "web", "dist");
const indexFront = path.join(pastaFront, "index.html");

app.use(express.static(pastaFront));

// Qualquer outro GET devolve o index.html: quem decide a tela é o React.
// É isso que faz o F5 em /tarefas não dar 404.
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method !== "GET") return next();
  if (!existsSync(indexFront)) {
    return res
      .status(503)
      .type("text/plain")
      .send("Ainda não existe o build do front-end. Rode: npm run build\nA API continua em /api/health.");
  }
  return res.sendFile(indexFront);
});

try {
  await inicializarBanco();
} catch (erro: any) {
  console.error(`[ERRO] Não consegui preparar o banco (${MODO_BANCO}): ${erro?.message}`);
  if (usandoNuvem) {
    console.error("Confira se a TURSO_URL não tem barra no final e se o TURSO_TOKEN está completo.");
  }
  process.exit(1);
}
console.log(`Banco de dados: ${MODO_BANCO}`);

app.listen(PORT, () => {
  console.log(`Servidor rodando em: http://localhost:${PORT}`);
});
