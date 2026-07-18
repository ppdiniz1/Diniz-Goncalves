import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { formatCurrency, todayISO } from '../lib/format'
import type { InvestmentAccount, InvestmentMovement, MovementType } from '../types'

const INVESTMENT_CATEGORIES = ['Renda Fixa', 'Ações', 'Fundos Imobiliários', 'Tesouro Direto', 'Cripto', 'Previdência', 'Outros']
const PALETTE = ['#3a63f5', '#10b981', '#f59e0b', '#a855f7', '#ef4444', '#0ea5e9', '#6b7280']

export default function InvestmentsPage() {
  const { profile, household } = useAuth()
  const [accounts, setAccounts] = useState<InvestmentAccount[]>([])
  const [movements, setMovements] = useState<InvestmentMovement[]>([])
  const [loading, setLoading] = useState(true)

  const [showAccountForm, setShowAccountForm] = useState(false)
  const [accName, setAccName] = useState('')
  const [accCategory, setAccCategory] = useState(INVESTMENT_CATEGORIES[0])
  const [accBroker, setAccBroker] = useState('')

  const [movAccountId, setMovAccountId] = useState('')
  const [movType, setMovType] = useState<MovementType>('aporte')
  const [movAmount, setMovAmount] = useState('')
  const [movDate, setMovDate] = useState(todayISO())
  const [saving, setSaving] = useState(false)

  async function loadAll() {
    if (!household) return
    setLoading(true)
    const [{ data: accData }, { data: movData }] = await Promise.all([
      supabase.from('investment_accounts').select('*').eq('household_id', household.id).order('name'),
      supabase.from('investment_movements').select('*').eq('household_id', household.id).order('occurred_on'),
    ])
    setAccounts(accData ?? [])
    setMovements(movData ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household?.id])

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault()
    if (!household || !profile) return
    setSaving(true)
    try {
      const { error } = await supabase.from('investment_accounts').insert({
        household_id: household.id,
        user_id: profile.id,
        name: accName,
        category: accCategory,
        broker: accBroker,
      })
      if (error) throw error
      setAccName('')
      setAccBroker('')
      setShowAccountForm(false)
      await loadAll()
    } finally {
      setSaving(false)
    }
  }

  async function handleAddMovement(e: React.FormEvent) {
    e.preventDefault()
    if (!household || !movAccountId) return
    setSaving(true)
    try {
      const { error } = await supabase.from('investment_movements').insert({
        household_id: household.id,
        account_id: movAccountId,
        movement_type: movType,
        amount: Number(movAmount),
        occurred_on: movDate,
      })
      if (error) throw error
      setMovAmount('')
      await loadAll()
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteAccount(id: string) {
    await supabase.from('investment_accounts').delete().eq('id', id)
    await loadAll()
  }

  async function handleDeleteMovement(id: string) {
    await supabase.from('investment_movements').delete().eq('id', id)
    await loadAll()
  }

  // saldo atual de cada conta = última "saldo_atual" registrada; se não houver, soma aportes - resgates
  function currentBalance(accountId: string): number {
    const accMovs = movements.filter((m) => m.account_id === accountId)
    const lastBalance = [...accMovs].reverse().find((m) => m.movement_type === 'saldo_atual')
    if (lastBalance) return Number(lastBalance.amount)
    return accMovs.reduce((sum, m) => {
      if (m.movement_type === 'aporte') return sum + Number(m.amount)
      if (m.movement_type === 'resgate') return sum - Number(m.amount)
      return sum
    }, 0)
  }

  function totalInvested(accountId: string): number {
    return movements
      .filter((m) => m.account_id === accountId && m.movement_type === 'aporte')
      .reduce((s, m) => s + Number(m.amount), 0)
  }

  const totalBalance = accounts.reduce((s, a) => s + currentBalance(a.id), 0)
  const totalInvestedAll = accounts.reduce((s, a) => s + totalInvested(a.id), 0)

  const allocationData = useMemo(() => {
    const byCategory = new Map<string, number>()
    accounts.forEach((a) => {
      byCategory.set(a.category, (byCategory.get(a.category) ?? 0) + currentBalance(a.id))
    })
    return Array.from(byCategory.entries())
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, movements])

  const growthData = useMemo(() => {
    // saldo total acumulado por mês, usando o último saldo conhecido (ou aportes acumulados) de cada conta até aquele mês
    const months = Array.from(
      new Set(movements.map((m) => m.occurred_on.slice(0, 7)))
    ).sort()
    if (months.length === 0) return []

    return months.map((month) => {
      let total = 0
      accounts.forEach((acc) => {
        const upToMonth = movements.filter(
          (m) => m.account_id === acc.id && m.occurred_on.slice(0, 7) <= month
        )
        const lastBalance = [...upToMonth].reverse().find((m) => m.movement_type === 'saldo_atual')
        if (lastBalance) {
          total += Number(lastBalance.amount)
        } else {
          total += upToMonth.reduce((sum, m) => {
            if (m.movement_type === 'aporte') return sum + Number(m.amount)
            if (m.movement_type === 'resgate') return sum - Number(m.amount)
            return sum
          }, 0)
        }
      })
      return { month, total }
    })
  }, [movements, accounts])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Investimentos</h1>
        <button
          onClick={() => setShowAccountForm((v) => !v)}
          className="px-4 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium"
        >
          {showAccountForm ? 'Cancelar' : '+ Nova conta/ativo'}
        </button>
      </div>

      {showAccountForm && (
        <form
          onSubmit={handleCreateAccount}
          className="bg-white dark:bg-[#151824] rounded-xl border border-black/5 dark:border-white/10 p-5 grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
        >
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nome</label>
            <input
              required
              className="w-full rounded-lg border border-gray-300 dark:border-white/10 dark:bg-white/5 px-2 py-2 text-sm"
              value={accName}
              onChange={(e) => setAccName(e.target.value)}
              placeholder="ex: Tesouro Selic 2029"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Categoria</label>
            <select
              className="w-full rounded-lg border border-gray-300 dark:border-white/10 dark:bg-white/5 px-2 py-2 text-sm"
              value={accCategory}
              onChange={(e) => setAccCategory(e.target.value)}
            >
              {INVESTMENT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Corretora/Banco</label>
            <input
              className="w-full rounded-lg border border-gray-300 dark:border-white/10 dark:bg-white/5 px-2 py-2 text-sm"
              value={accBroker}
              onChange={(e) => setAccBroker(e.target.value)}
              placeholder="ex: Nubank"
            />
          </div>
          <button disabled={saving} className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium disabled:opacity-50">
            Criar
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#151824] rounded-xl border border-black/5 dark:border-white/10 p-5">
          <p className="text-xs text-gray-500">Patrimônio total</p>
          <p className="text-2xl font-semibold mt-1">{formatCurrency(totalBalance)}</p>
        </div>
        <div className="bg-white dark:bg-[#151824] rounded-xl border border-black/5 dark:border-white/10 p-5">
          <p className="text-xs text-gray-500">Total aportado</p>
          <p className="text-2xl font-semibold mt-1">{formatCurrency(totalInvestedAll)}</p>
        </div>
        <div className="bg-white dark:bg-[#151824] rounded-xl border border-black/5 dark:border-white/10 p-5">
          <p className="text-xs text-gray-500">Rentabilidade acumulada</p>
          <p className={`text-2xl font-semibold mt-1 ${totalBalance - totalInvestedAll >= 0 ? 'text-mint-500' : 'text-coral-500'}`}>
            {formatCurrency(totalBalance - totalInvestedAll)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#151824] rounded-xl border border-black/5 dark:border-white/10 p-5">
          <h2 className="text-sm font-medium text-gray-500 mb-3">Evolução do patrimônio</h2>
          {growthData.length === 0 ? (
            <p className="text-sm text-gray-400">Adicione movimentações para ver o gráfico.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => formatCurrency(v)} width={90} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Line type="monotone" dataKey="total" stroke="#3a63f5" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white dark:bg-[#151824] rounded-xl border border-black/5 dark:border-white/10 p-5">
          <h2 className="text-sm font-medium text-gray-500 mb-3">Alocação por categoria</h2>
          {allocationData.length === 0 ? (
            <p className="text-sm text-gray-400">Sem dados de alocação ainda.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={allocationData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85}>
                  {allocationData.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-[#151824] rounded-xl border border-black/5 dark:border-white/10 p-5">
        <h2 className="text-sm font-medium text-gray-500 mb-3">Registrar movimentação</h2>
        <form onSubmit={handleAddMovement} className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Conta/Ativo</label>
            <select
              required
              className="w-full rounded-lg border border-gray-300 dark:border-white/10 dark:bg-white/5 px-2 py-2 text-sm"
              value={movAccountId}
              onChange={(e) => setMovAccountId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.category})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tipo</label>
            <select
              className="w-full rounded-lg border border-gray-300 dark:border-white/10 dark:bg-white/5 px-2 py-2 text-sm"
              value={movType}
              onChange={(e) => setMovType(e.target.value as MovementType)}
            >
              <option value="aporte">Aporte</option>
              <option value="resgate">Resgate</option>
              <option value="saldo_atual">Atualizar saldo</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Valor (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              className="w-full rounded-lg border border-gray-300 dark:border-white/10 dark:bg-white/5 px-2 py-2 text-sm"
              value={movAmount}
              onChange={(e) => setMovAmount(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Data</label>
            <input
              type="date"
              className="w-full rounded-lg border border-gray-300 dark:border-white/10 dark:bg-white/5 px-2 py-2 text-sm"
              value={movDate}
              onChange={(e) => setMovDate(e.target.value)}
            />
          </div>
          <div className="col-span-2 md:col-span-5">
            <button disabled={saving} className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium disabled:opacity-50">
              Adicionar movimentação
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-4">
        {loading ? (
          <p className="text-sm text-gray-400">Carregando...</p>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhuma conta de investimento cadastrada ainda.</p>
        ) : (
          accounts.map((acc) => {
            const accMovs = movements.filter((m) => m.account_id === acc.id).slice().reverse()
            return (
              <div key={acc.id} className="bg-white dark:bg-[#151824] rounded-xl border border-black/5 dark:border-white/10 p-5">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium">{acc.name}</p>
                    <p className="text-xs text-gray-500">
                      {acc.category} {acc.broker ? `· ${acc.broker}` : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(currentBalance(acc.id))}</p>
                    <button onClick={() => handleDeleteAccount(acc.id)} className="text-xs text-gray-400 hover:text-coral-500">
                      excluir conta
                    </button>
                  </div>
                </div>
                {accMovs.length > 0 && (
                  <ul className="text-xs text-gray-500 space-y-1 mt-2">
                    {accMovs.slice(0, 5).map((m) => (
                      <li key={m.id} className="flex justify-between">
                        <span>
                          {new Date(`${m.occurred_on}T00:00:00`).toLocaleDateString('pt-BR')} ·{' '}
                          {m.movement_type === 'aporte' ? 'Aporte' : m.movement_type === 'resgate' ? 'Resgate' : 'Saldo atualizado'}
                        </span>
                        <span className="flex items-center gap-2">
                          {formatCurrency(Number(m.amount))}
                          <button onClick={() => handleDeleteMovement(m.id)} className="hover:text-coral-500">
                            ✕
                          </button>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
