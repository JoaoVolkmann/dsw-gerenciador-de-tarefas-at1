// Aula 06 — Gerenciador de tarefas em React (ainda sem API, tudo em memória).
import { useState } from 'react'
import BotaoAcao from './BotaoAcao.jsx'
import ItemTarefa from './ItemTarefa.jsx'

const FILTROS = ['todas', 'pendentes', 'concluidas']

function App() {
  const [tarefas, setTarefas] = useState([])
  const [titulo, setTitulo] = useState('')
  const [prioridade, setPrioridade] = useState('medium')
  const [filtro, setFiltro] = useState('todas')

  function adicionar(evento) {
    evento.preventDefault()
    const tituloLimpo = titulo.trim()

    // mesma regra do back-end: pelo menos 3 caracteres
    if (tituloLimpo.length < 3) return

    const nova = {
      id: crypto.randomUUID(),
      titulo: tituloLimpo,
      prioridade,
      concluida: false,
    }

    setTarefas((atual) => [...atual, nova])
    setTitulo('')
  }

  function marcar(id) {
    setTarefas((atual) =>
      atual.map((t) => (t.id === id ? { ...t, concluida: !t.concluida } : t))
    )
  }

  function remover(id) {
    setTarefas((atual) => atual.filter((t) => t.id !== id))
  }

  function limparConcluidas() {
    setTarefas((atual) => atual.filter((t) => !t.concluida))
  }

  // valores derivados: saem do estado, não precisam de useState próprio
  const qtdConcluidas = tarefas.filter((t) => t.concluida).length
  const qtdPendentes = tarefas.length - qtdConcluidas

  const visiveis = tarefas.filter((t) => {
    if (filtro === 'pendentes') return !t.concluida
    if (filtro === 'concluidas') return t.concluida
    return true
  })

  return (
    <main style={{ maxWidth: '560px', margin: '0 auto', padding: '32px 16px' }}>
      <h1>Gerenciador de Tarefas</h1>

      <form onSubmit={adicionar} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <input
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Nova tarefa (mín. 3 letras)"
          aria-label="Título da tarefa"
          style={{ flex: 1, minWidth: '180px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
        />
        <select
          value={prioridade}
          onChange={(e) => setPrioridade(e.target.value)}
          aria-label="Prioridade"
          style={{ padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
        >
          <option value="low">Baixa</option>
          <option value="medium">Média</option>
          <option value="high">Alta</option>
        </select>
        <BotaoAcao texto="Adicionar" desabilitado={titulo.trim().length < 3} />
      </form>

      <div style={{ display: 'flex', gap: '8px', margin: '20px 0' }}>
        {FILTROS.map((f) => (
          <BotaoAcao
            key={f}
            texto={f === 'concluidas' ? 'concluídas' : f}
            tipo={filtro === f ? 'principal' : 'neutro'}
            aoClicar={() => setFiltro(f)}
          />
        ))}
      </div>

      {visiveis.length === 0 ? (
        <p style={{ color: '#64748b' }}>Nenhuma tarefa aqui.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {visiveis.map((t) => (
            <ItemTarefa key={t.id} tarefa={t} aoMarcar={marcar} aoRemover={remover} />
          ))}
        </ul>
      )}

      <p>
        {tarefas.length} no total · {qtdPendentes} pendentes · {qtdConcluidas} concluídas
      </p>

      {qtdConcluidas > 0 && (
        <BotaoAcao texto="Limpar concluídas" tipo="neutro" aoClicar={limparConcluidas} />
      )}
    </main>
  )
}

export default App
