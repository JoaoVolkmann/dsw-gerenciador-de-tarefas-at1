// Tudo que conversa com a API fica aqui. Os componentes só chamam estas funções.

export type Prioridade = 'low' | 'medium' | 'high'
export type Status = 'pending' | 'completed'

export interface Tarefa {
  id: number
  titulo: string
  status: Status
  prioridade: Prioridade
  usuario_id: number
}

// Vazio = mesmo endereço do site (Render com um serviço só, ou proxy do Vite).
// Se o front ficar em outro endereço, defina VITE_API_URL no build.
const BASE_URL = import.meta.env.VITE_API_URL ?? ''

const CHAVE_TOKEN = 'gt_token'

// localStorage pode falhar (modo privado, bloqueio do navegador): por isso o try/catch
export function lerToken(): string | null {
  try {
    return localStorage.getItem(CHAVE_TOKEN)
  } catch {
    return null
  }
}

export function salvarToken(token: string | null) {
  try {
    if (token) localStorage.setItem(CHAVE_TOKEN, token)
    else localStorage.removeItem(CHAVE_TOKEN)
  } catch {
    // sem localStorage o login vale só até recarregar a página
  }
}

// Erro com o status HTTP junto, para a tela saber quando é 401 (sessão expirada)
export class ErroApi extends Error {
  status: number
  constructor(status: number, mensagem: string) {
    super(mensagem)
    this.status = status
  }
}

async function requisicao<T>(caminho: string, opcoes: RequestInit = {}, token?: string | null): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`

  let resposta: Response
  try {
    resposta = await fetch(`${BASE_URL}${caminho}`, { ...opcoes, headers })
  } catch {
    throw new ErroApi(0, 'Não foi possível falar com o servidor. Tente de novo.')
  }

  const corpo = await resposta.json().catch(() => ({}))

  if (!resposta.ok) {
    const mensagem = corpo.error ?? corpo.message ?? 'Algo deu errado.'
    throw new ErroApi(resposta.status, mensagem)
  }

  return corpo as T
}

// ---------- Autenticação ----------

export function cadastrar(email: string, senha: string) {
  return requisicao<{ id: number; email: string }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, senha }),
  })
}

export async function entrar(email: string, senha: string) {
  const { token } = await requisicao<{ token: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, senha }),
  })
  return token
}

// ---------- Tarefas ----------

export function listarTarefas(token: string) {
  return requisicao<Tarefa[]>('/api/tasks', {}, token)
}

export function criarTarefa(token: string, titulo: string, prioridade: Prioridade) {
  return requisicao<Tarefa>('/api/tasks', {
    method: 'POST',
    body: JSON.stringify({ titulo, prioridade }),
  }, token)
}

export function alterarStatus(token: string, id: number, status: Status) {
  return requisicao<Tarefa>(`/api/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }, token)
}

export function removerTarefa(token: string, id: number) {
  return requisicao<{ message: string }>(`/api/tasks/${id}`, { method: 'DELETE' }, token)
}
