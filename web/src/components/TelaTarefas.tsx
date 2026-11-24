// Lista de tarefas do usuário logado, agora lida e gravada pela API (banco Turso).
import { useEffect, useState, type FormEvent } from 'react'
import {
  ErroApi,
  alterarStatus,
  criarTarefa,
  listarTarefas,
  removerTarefa,
  type Prioridade,
  type Tarefa,
} from '../api'
import BotaoAcao from './BotaoAcao'
import ItemTarefa from './ItemTarefa'

type Filtro = 'todas' | 'pendentes' | 'concluidas'
const FILTROS: Filtro[] = ['todas', 'pendentes', 'concluidas']

interface TelaTarefasProps {
  token: string
  aoSair: () => void
}

function TelaTarefas({ token, aoSair }: TelaTarefasProps) {
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [titulo, setTitulo] = useState('')
  const [prioridade, setPrioridade] = useState<Prioridade>('medium')
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  // Token expirado (401): volta para o login. Outros erros: mostra a mensagem.
  function tratarErro(e: unknown) {
    if (e instanceof ErroApi && e.status === 401) {
      aoSair()
      return
    }
    setErro(e instanceof Error ? e.message : 'Algo deu errado.')
  }

  // Busca as tarefas uma vez, quando a tela abre (ou o token muda)
  useEffect(() => {
    let ativo = true
    listarTarefas(token)
      .then((lista) => ativo && setTarefas(lista))
      .catch((e) => ativo && tratarErro(e))
      .finally(() => ativo && setCarregando(false))
    return () => {
      ativo = false
    }
  }, [token])

  async function adicionar(evento: FormEvent) {
    evento.preventDefault()
    const tituloLimpo = titulo.trim()
    if (tituloLimpo.length < 3) return

    setErro('')
    try {
      const nova = await criarTarefa(token, tituloLimpo, prioridade)
      setTarefas((atual) => [...atual, nova])
      setTitulo('')
    } catch (e) {
      tratarErro(e)
    }
  }

  async function marcar(tarefa: Tarefa) {
    setErro('')
    try {
      const novoStatus = tarefa.status === 'completed' ? 'pending' : 'completed'
      const atualizada = await alterarStatus(token, tarefa.id, novoStatus)
      setTarefas((atual) => atual.map((t) => (t.id === atualizada.id ? atualizada : t)))
    } catch (e) {
      tratarErro(e)
    }
  }

  async function remover(id: number) {
    setErro('')
    try {
      await removerTarefa(token, id)
      setTarefas((atual) => atual.filter((t) => t.id !== id))
    } catch (e) {
      tratarErro(e)
    }
  }

  // valores derivados: saem do estado, não precisam de useState próprio
  const qtdConcluidas = tarefas.filter((t) => t.status === 'completed').length
  const qtdPendentes = tarefas.length - qtdConcluidas

  const visiveis = tarefas.filter((t) => {
    if (filtro === 'pendentes') return t.status === 'pending'
    if (filtro === 'concluidas') return t.status === 'completed'
    return true
  })

  return (
    <section className="cartao">
      <div className="topo">
        <h2>Minhas tarefas</h2>
        <BotaoAcao texto="Sair" tipo="neutro" aoClicar={aoSair} />
      </div>

      <form className="linha" onSubmit={adicionar}>
        <input
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Nova tarefa (mín. 3 letras)"
          aria-label="Título da tarefa"
        />
        <select value={prioridade} onChange={(e) => setPrioridade(e.target.value as Prioridade)} aria-label="Prioridade">
          <option value="low">Baixa</option>
          <option value="medium">Média</option>
          <option value="high">Alta</option>
        </select>
        <BotaoAcao texto="Adicionar" enviar desabilitado={titulo.trim().length < 3} />
      </form>

      <div className="linha">
        {FILTROS.map((f) => (
          <BotaoAcao
            key={f}
            texto={f === 'concluidas' ? 'concluídas' : f}
            tipo={filtro === f ? 'principal' : 'neutro'}
            aoClicar={() => setFiltro(f)}
          />
        ))}
      </div>

      {erro && <p className="erro">{erro}</p>}

      {carregando ? (
        <p className="vazio">Carregando...</p>
      ) : visiveis.length === 0 ? (
        <p className="vazio">Nenhuma tarefa aqui.</p>
      ) : (
        <ul className="lista">
          {visiveis.map((t) => (
            <ItemTarefa key={t.id} tarefa={t} aoMarcar={marcar} aoRemover={remover} />
          ))}
        </ul>
      )}

      <p className="resumo">
        {tarefas.length} no total · {qtdPendentes} pendentes · {qtdConcluidas} concluídas
      </p>
    </section>
  )
}

export default TelaTarefas
