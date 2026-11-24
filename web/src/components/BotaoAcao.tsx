// Botão reutilizável (mesma ideia da Aula 05, agora com tipos)
interface BotaoAcaoProps {
  texto: string
  aoClicar?: () => void
  tipo?: 'principal' | 'neutro'
  desabilitado?: boolean
  enviar?: boolean
}

function BotaoAcao({ texto, aoClicar, tipo = 'principal', desabilitado = false, enviar = false }: BotaoAcaoProps) {
  return (
    <button
      type={enviar ? 'submit' : 'button'}
      className={`botao botao-${tipo}`}
      onClick={aoClicar}
      disabled={desabilitado}
    >
      {texto}
    </button>
  )
}

export default BotaoAcao
