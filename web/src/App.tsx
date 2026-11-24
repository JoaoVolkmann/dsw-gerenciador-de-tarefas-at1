// Decide a tela: sem token mostra o login; com token mostra as tarefas.
import { useState } from 'react'
import { lerToken, salvarToken } from './api'
import TelaLogin from './components/TelaLogin'
import TelaTarefas from './components/TelaTarefas'

function App() {
  const [token, setToken] = useState<string | null>(() => lerToken())

  function aoEntrar(novoToken: string) {
    salvarToken(novoToken)
    setToken(novoToken)
  }

  function sair() {
    salvarToken(null)
    setToken(null)
  }

  return (
    <main className="pagina">
      <h1>Gerenciador de Tarefas</h1>
      {token ? <TelaTarefas token={token} aoSair={sair} /> : <TelaLogin aoEntrar={aoEntrar} />}
    </main>
  )
}

export default App
