import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInfo(null)
    setLoading(true)
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayName || email.split('@')[0] } },
        })
        if (error) throw error
        setInfo('Conta criada! Verifique seu e-mail para confirmar o acesso (se a confirmação estiver habilitada) e depois faça login.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-white dark:from-[#0f1117] dark:to-[#151824] px-4">
      <div className="w-full max-w-sm bg-white dark:bg-[#1a1d29] rounded-2xl shadow-lg p-8 border border-black/5 dark:border-white/10">
        <h1 className="text-2xl font-semibold text-center mb-1">💞 Finança a Dois</h1>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">
          Gastos, investimentos e orçamento, juntos.
        </p>

        <div className="flex mb-6 rounded-lg bg-gray-100 dark:bg-white/5 p-1 text-sm">
          <button
            className={`flex-1 py-1.5 rounded-md transition ${mode === 'signin' ? 'bg-white dark:bg-brand-600 shadow font-medium' : 'text-gray-500'}`}
            onClick={() => setMode('signin')}
            type="button"
          >
            Entrar
          </button>
          <button
            className={`flex-1 py-1.5 rounded-md transition ${mode === 'signup' ? 'bg-white dark:bg-brand-600 shadow font-medium' : 'text-gray-500'}`}
            onClick={() => setMode('signup')}
            type="button"
          >
            Criar conta
          </button>
        </div>

        <form className="space-y-3" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <input
              className="w-full rounded-lg border border-gray-300 dark:border-white/10 dark:bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="Seu nome"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          )}
          <input
            className="w-full rounded-lg border border-gray-300 dark:border-white/10 dark:bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            type="email"
            placeholder="E-mail"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="w-full rounded-lg border border-gray-300 dark:border-white/10 dark:bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            type="password"
            placeholder="Senha"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p className="text-sm text-coral-500">{error}</p>}
          {info && <p className="text-sm text-mint-500">{info}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium py-2 text-sm transition disabled:opacity-50"
          >
            {loading ? 'Aguarde...' : mode === 'signin' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>
      </div>
    </div>
  )
}
