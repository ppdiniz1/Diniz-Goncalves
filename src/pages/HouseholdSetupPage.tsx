import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function HouseholdSetupPage() {
  const { profile, refreshProfile, signOut } = useAuth()
  const [tab, setTab] = useState<'create' | 'join'>('create')
  const [name, setName] = useState('Nosso Orçamento')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setError(null)
    setLoading(true)
    try {
      const { data: newHousehold, error: createError } = await supabase
        .from('households')
        .insert({ name })
        .select()
        .single()
      if (createError) throw createError

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ household_id: newHousehold.id })
        .eq('id', profile.id)
      if (updateError) throw updateError

      await supabase.rpc('seed_default_categories', { p_household_id: newHousehold.id })

      await refreshProfile()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar o espaço compartilhado')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setError(null)
    setLoading(true)
    try {
      const { data: found, error: findError } = await supabase
        .from('households')
        .select('*')
        .eq('invite_code', inviteCode.trim())
        .maybeSingle()
      if (findError) throw findError
      if (!found) throw new Error('Código de convite não encontrado. Confira com seu par.')

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ household_id: found.id })
        .eq('id', profile.id)
      if (updateError) throw updateError

      await refreshProfile()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar no espaço compartilhado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0f1117] px-4">
      <div className="w-full max-w-md bg-white dark:bg-[#1a1d29] rounded-2xl shadow-lg p-8 border border-black/5 dark:border-white/10">
        <h1 className="text-xl font-semibold mb-1">Vamos compartilhar as finanças 💑</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Crie um espaço novo ou entre no espaço que seu par já criou usando o código de convite.
        </p>

        <div className="flex mb-6 rounded-lg bg-gray-100 dark:bg-white/5 p-1 text-sm">
          <button
            className={`flex-1 py-1.5 rounded-md transition ${tab === 'create' ? 'bg-white dark:bg-brand-600 shadow font-medium' : 'text-gray-500'}`}
            onClick={() => setTab('create')}
            type="button"
          >
            Criar espaço
          </button>
          <button
            className={`flex-1 py-1.5 rounded-md transition ${tab === 'join' ? 'bg-white dark:bg-brand-600 shadow font-medium' : 'text-gray-500'}`}
            onClick={() => setTab('join')}
            type="button"
          >
            Entrar com código
          </button>
        </div>

        {tab === 'create' ? (
          <form className="space-y-3" onSubmit={handleCreate}>
            <label className="block text-sm font-medium">Nome do espaço</label>
            <input
              className="w-full rounded-lg border border-gray-300 dark:border-white/10 dark:bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            {error && <p className="text-sm text-coral-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium py-2 text-sm transition disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar espaço'}
            </button>
          </form>
        ) : (
          <form className="space-y-3" onSubmit={handleJoin}>
            <label className="block text-sm font-medium">Código de convite</label>
            <input
              className="w-full rounded-lg border border-gray-300 dark:border-white/10 dark:bg-white/5 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 uppercase"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              placeholder="ex: a1b2c3d4"
              required
            />
            {error && <p className="text-sm text-coral-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-medium py-2 text-sm transition disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar no espaço'}
            </button>
          </form>
        )}

        <button onClick={() => signOut()} className="mt-6 text-xs text-gray-400 hover:underline">
          Sair da conta
        </button>
      </div>
    </div>
  )
}
