// Uma tarefa da lista. O componente não muda o estado sozinho:
// ele só avisa o App (pai) chamando as funções que recebeu por props.
import BotaoAcao from './BotaoAcao.jsx'

const NOME_PRIORIDADE = { low: 'Baixa', medium: 'Média', high: 'Alta' }

function ItemTarefa({ tarefa, aoMarcar, aoRemover }) {
  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 12px',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        marginBottom: '8px',
        backgroundColor: '#ffffff',
      }}
    >
      <input
        type="checkbox"
        checked={tarefa.concluida}
        onChange={() => aoMarcar(tarefa.id)}
        aria-label={`Marcar "${tarefa.titulo}"`}
      />

      <span
        style={{
          flex: 1,
          textDecoration: tarefa.concluida ? 'line-through' : 'none',
          color: tarefa.concluida ? '#94a3b8' : '#0f172a',
        }}
      >
        {tarefa.titulo}
      </span>

      <small>{NOME_PRIORIDADE[tarefa.prioridade]}</small>

      <BotaoAcao texto="Remover" tipo="neutro" aoClicar={() => aoRemover(tarefa.id)} />
    </li>
  )
}

export default ItemTarefa
