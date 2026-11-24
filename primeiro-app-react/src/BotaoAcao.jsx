// Componente reutilizável: tudo que muda de um botão para outro vem por props.
const CORES = {
  principal: { fundo: '#059669', texto: '#ffffff' },
  neutro: { fundo: '#e2e8f0', texto: '#0f172a' },
}

function BotaoAcao({ texto, aoClicar, tipo = 'principal', desabilitado = false }) {
  const cor = CORES[tipo] ?? CORES.principal

  return (
    <button
      onClick={aoClicar}
      disabled={desabilitado}
      style={{
        padding: '10px 18px',
        border: 'none',
        borderRadius: '8px',
        fontSize: '15px',
        fontWeight: 600,
        backgroundColor: cor.fundo,
        color: cor.texto,
        cursor: desabilitado ? 'not-allowed' : 'pointer',
        opacity: desabilitado ? 0.5 : 1,
      }}
    >
      {texto}
    </button>
  )
}

export default BotaoAcao
