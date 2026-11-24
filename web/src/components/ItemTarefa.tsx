// Uma tarefa da lista. Não mexe no estado: só avisa o pai pelas props.
import type { Tarefa } from '../api'
import BotaoAcao from './BotaoAcao'

const NOME_PRIORIDADE = { low: 'Baixa', medium: 'Média', high: 'Alta' } as const

interface ItemTarefaProps {
  tarefa: Tarefa
  aoMarcar: (tarefa: Tarefa) => void
  aoRemover: (id: number) => void
}

function ItemTarefa({ tarefa, aoMarcar, aoRemover }: ItemTarefaProps) {
  const concluida = tarefa.status === 'completed'

  return (
    <li className="item">
      <input
        type="checkbox"
        checked={concluida}
        onChange={() => aoMarcar(tarefa)}
        aria-label={`Marcar "${tarefa.titulo}"`}
      />
      <span className={concluida ? 'titulo concluida' : 'titulo'}>{tarefa.titulo}</span>
      <small className={`prioridade prioridade-${tarefa.prioridade}`}>{NOME_PRIORIDADE[tarefa.prioridade]}</small>
      <BotaoAcao texto="Remover" tipo="neutro" aoClicar={() => aoRemover(tarefa.id)} />
    </li>
  )
}

export default ItemTarefa
