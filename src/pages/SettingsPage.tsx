import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import type { Profile } from '../types'

export default function SettingsPage() {
  const { profile, household, refreshProfile } = useAuth()
  const [members, setMembers] = useState<Profile[]>([])
  const [name, setName] = useState(household?.name ?? '')
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!household) return
    supabase
      .from('profiles')
      .select('*')
      .eq('household_id', household.id)
      .then(({ data }) => setMembers(data ?? []))
  }, [household])

  async function saveHouseholdName() {
    if (!household) return
    await supabase.from('households').update({ name }).eq('id', household.id)
    await refreshProfile()
  }

  async function saveDisplayName() {
    if (!profile) return
    await supabase.from('profiles').update({ display_name: displayName }).eq('id', profile.id)
    await refreshProfile()
  }

  function copyInviteCode() {
    if (!household) return
    navigator.clipboard.writeText(household.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-semibold">Configurações</h1>

      <div className="bg-white dark:bg-[#151824] rounded-xl border border-black/5 dark:border-white/10 p-5 space-y-3">
        <h2 className="font-medium text-sm text-gray-500">Espaço compartilhado</h2>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-gray-300 dark:border-white/10 dark:bg-white/5 px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button onClick={saveHouseholdName} className="px-3 py-2 rounded-lg bg-brand-500 text-white text-sm">
            Salvar
          </button>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">
            Compartilhe este código com seu par para vocês verem os mesmos dados:
          </p>
          <button
            onClick={copyInviteCode}
            className="font-mono text-sm bg-gray-100 dark:bg-white/10 px-3 py-1.5 rounded-lg"
          >
            {household?.invite_code} {copied ? '✓ copiado' : '📋'}
          </button>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Membros</p>
          <ul className="text-sm space-y-1">
            {members.map((m) => (
              <li key={m.id}>{m.display_name}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-white dark:bg-[#151824] rounded-xl border border-black/5 dark:border-white/10 p-5 space-y-3">
        <h2 className="font-medium text-sm text-gray-500">Meu perfil</h2>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-gray-300 dark:border-white/10 dark:bg-white/5 px-3 py-2 text-sm"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <button onClick={saveDisplayName} className="px-3 py-2 rounded-lg bg-brand-500 text-white text-sm">
            Salvar
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#151824] rounded-xl border border-black/5 dark:border-white/10 p-5 space-y-2">
        <h2 className="font-medium text-sm text-gray-500">Importação Nubank</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          A integração automática com o Nubank ainda não está disponível nesta versão (o Nubank não
          oferece API pública). Por enquanto, registre gastos e investimentos manualmente na aba
          correspondente. Veja o README do projeto para as opções futuras de integração (Open Finance,
          importação de CSV/OFX).
        </p>
      </div>
    </div>
  )
}
