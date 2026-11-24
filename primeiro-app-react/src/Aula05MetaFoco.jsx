// Aula 05 — primeiro contato com useState, props e renderização condicional.
// Para ver esta tela de novo, troque o import no main.jsx.
import { useState } from 'react'
import BotaoAcao from './BotaoAcao.jsx'

const META = 5

function Aula05MetaFoco() {
  const [concluidas, setConcluidas] = useState(0)
  const [modoFoco, setModoFoco] = useState(false)

  const metaBatida = concluidas >= META

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '40px 16px',
        textAlign: 'center',
        backgroundColor: modoFoco ? '#0f172a' : '#f8fafc',
        color: modoFoco ? '#f8fafc' : '#0f172a',
      }}
    >
      <h1>Meta do dia</h1>
      <p>
        Tarefas concluídas: <strong>{concluidas}</strong> de {META}
      </p>
      <p>Modo foco: {modoFoco ? 'ligado' : 'desligado'}</p>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <BotaoAcao
          texto="Concluí uma tarefa"
          aoClicar={() => setConcluidas(concluidas + 1)}
          desabilitado={metaBatida}
        />
        <BotaoAcao texto="Zerar" tipo="neutro" aoClicar={() => setConcluidas(0)} />
        <BotaoAcao
          texto={modoFoco ? 'Desligar modo foco' : 'Ligar modo foco'}
          tipo="neutro"
          aoClicar={() => setModoFoco(!modoFoco)}
        />
      </div>

      {metaBatida && <p style={{ marginTop: '24px', fontWeight: 600 }}>Meta batida! 🎉</p>}
    </main>
  )
}

export default Aula05MetaFoco
