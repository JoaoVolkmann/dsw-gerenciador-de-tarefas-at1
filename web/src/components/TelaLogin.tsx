import { useState, type FormEvent } from 'react'
import { cadastrar, entrar } from '../api'
import BotaoAcao from './BotaoAcao'

interface TelaLoginProps {
  aoEntrar: (token: string) => void
}

function TelaLogin({ aoEntrar }: TelaLoginProps) {
  const [modo, setModo] = useState<'entrar' | 'cadastrar'>('entrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    setErro('')
    setCarregando(true)

    try {
      // No cadastro, já fazemos o login em seguida
      if (modo === 'cadastrar') await cadastrar(email, senha)
      const token = await entrar(email, senha)
      aoEntrar(token)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Algo deu errado.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <form className="cartao" onSubmit={enviar}>
      <h2>{modo === 'entrar' ? 'Entrar' : 'Criar conta'}</h2>

      <label>
        E-mail
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      </label>

      <label>
        Senha
        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
          minLength={modo === 'cadastrar' ? 8 : undefined}
          autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
        />
      </label>

      {erro && <p className="erro">{erro}</p>}

      <BotaoAcao texto={carregando ? 'Aguarde...' : modo === 'entrar' ? 'Entrar' : 'Cadastrar'} enviar desabilitado={carregando} />

      <button
        type="button"
        className="link"
        onClick={() => {
          setModo(modo === 'entrar' ? 'cadastrar' : 'entrar')
          setErro('')
        }}
      >
        {modo === 'entrar' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
      </button>
    </form>
  )
}

export default TelaLogin
