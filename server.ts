import express from "express";
import Database from "better-sqlite3";

const app = express();
const PORT = 3000;

// ============================================
// Tipagem, regras centralizadas e helpers
// ============================================

interface Tarefa {
  id: number;
  titulo: string;
  status: string;
  prioridade: string;
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
  // Number("12abc") vira NaN imediatamente, o que é mais seguro!
  return isNaN(id) ? null : id;
};

// Erro de validação separado do erro de banco, para responder 400 em vez de 500
class ErroValidacao extends Error {}

// Middleware para ler o corpo das requisições em formato JSON
app.use(express.json());

const db = new Database("tarefas.db");

db.exec(`
    CREATE TABLE IF NOT EXISTS tarefas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        prioridade TEXT DEFAULT 'medium'
    );

    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        senha TEXT NOT NULL
    );
`);

// ============================================
// Prepared Statements (compilados UMA ÚNICA VEZ)
// ============================================

const stmtContarUsuarios = db.prepare("SELECT COUNT(*) as count FROM usuarios");
const stmtInserirUsuario = db.prepare("INSERT INTO usuarios (email, senha) VALUES (?, ?)");
const stmtListarTodas = db.prepare("SELECT * FROM tarefas");
const stmtBuscarPorTitulo = db.prepare("SELECT * FROM tarefas WHERE titulo LIKE ?");
const stmtBuscarPorId = db.prepare("SELECT * FROM tarefas WHERE id = ?");
const stmtInserirTarefa = db.prepare("INSERT INTO tarefas (titulo, status, prioridade) VALUES (?, 'pending', ?)");
const stmtDeletarTarefa = db.prepare("DELETE FROM tarefas WHERE id = ?");
const stmtAtualizarTarefa = db.prepare("UPDATE tarefas SET titulo = ?, status = ?, prioridade = ? WHERE id = ?");

// Inserindo dados falsos para serem vazados
const usuariosExistentes = stmtContarUsuarios.get() as { count: number };

if (usuariosExistentes.count === 0) {
  // Bom: Usamos a busca já preparada e passamos os dados de forma parametrizada
  stmtInserirUsuario.run("admin@senai.com", "senha_super_secreta_123");
}

console.log("Banco de dados SQLite inicializado com sucesso!");

// Rota de integridade do sistema (Health Check)
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Servidor do Gestor de Tarefas ativo!" });
});

app.get("/api/version", (req, res) => {
  res.json({ appName: "Gerenciador de Tarefas Multi-Usuário", version: "1.0.0" });
});

// ============================================
// GET — listagem blindada
// ============================================

app.get("/api/tasks", (req, res) => {
  // 1. Coerção Segura: Forçamos a variável a ser uma String vazia caso tentem nos enviar um Array
  const search = typeof req.query.search === "string" ? req.query.search : "";

  try {
    if (search) {
      // 2. Proteção: O '%' entra DEPOIS, apenas dentro do parâmetro
      const tarefas = stmtBuscarPorTitulo.all(`%${search}%`);
      res.json(tarefas);
    } else {
      // 3. Performance: Usamos a busca compilada
      const tarefas = stmtListarTodas.all();
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
  const { titulo, prioridade } = req.body;
  const prioridadeValida = normalizarPrioridade(prioridade);

  // Validação via helper (type guard)
  if (!tituloValido(titulo)) {
    return res.status(400).json({
      error: "O título da tarefa é obrigatório e deve conter pelo menos 3 caracteres válidos."
    });
  }

  try {
    const resultado = stmtInserirTarefa.run(titulo.trim(), prioridadeValida);
    const novaTarefa = stmtBuscarPorId.get(resultado.lastInsertRowid) as Tarefa;
    return res.status(201).json(novaTarefa);
  } catch {
    return res.status(500).json({ error: "Erro ao processar persistência" });
  }
});

// ============================================
// DELETE — exclusão blindada
// ============================================

app.delete("/api/tasks/:id", (req, res) => {
  const id = parsearId(req.params.id);

  if (id === null) {
    return res.status(400).json({ error: "ID inválido." });
  }

  try {
    const resultado = stmtDeletarTarefa.run(id);

    // No SQLite, o sucesso é medido pelo número de linhas afetadas (changes)
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
  const id = parsearId(req.params.id);

  if (id === null) {
    return res.status(400).json({ error: "ID inválido." });
  }

  const { titulo, prioridade, status } = req.body;

  if (!tituloValido(titulo)) {
    return res.status(400).json({
      error: "O título da tarefa é obrigatório e deve conter pelo menos 3 caracteres válidos."
    });
  }

  const prioridadeValida = normalizarPrioridade(prioridade);
  const statusValido = normalizarStatus(status);

  try {
    const resultado = stmtAtualizarTarefa.run(titulo.trim(), statusValido, prioridadeValida, id);

    if (resultado.changes === 0) {
      return res.status(404).json({ message: "Tarefa não encontrada para atualização!" });
    }

    // Busca a tarefa recém-atualizada para devolver no corpo (Princípio REST)
    const tarefaAtualizada = stmtBuscarPorId.get(id) as Tarefa;
    return res.status(200).json(tarefaAtualizada);
  } catch {
    return res.status(500).json({ error: "Erro ao processar a atualização no banco de dados." });
  }
});

// ============================================
// PATCH — atualização parcial, atômica e validada sob demanda
// ============================================

app.patch("/api/tasks/:id", (req, res) => {
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
      const tarefaExistente = stmtBuscarPorId.get(id) as Tarefa | undefined;
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
      const sql = `UPDATE tarefas SET ${camposParaAtualizar.join(", ")} WHERE id = ?`;
      valoresParaAtualizar.push(id);

      db.prepare(sql).run(...valoresParaAtualizar);
      return stmtBuscarPorId.get(id) as Tarefa;
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