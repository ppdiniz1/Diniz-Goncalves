import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useCategories } from '../lib/useCategories'
import { formatCurrency, todayISO } from '../lib/format'
import type { Profile, Transaction, TransactionType } from '../types'

export default function ExpensesPage() {
  const { profile, household } = useAuth()
  const { categories } = useCategories()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  // form state
  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [occurredOn, setOccurredOn] = useState(todayISO())
  const [saving, setSaving] = useState(false)

  // filters
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterPerson, setFilterPerson] = useState('all')
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all')

  async function loadTransactions() {
    if (!household) return
    setLoading(true)
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('household_id', household.id)
      .order('occurred_on', { ascending: false })
    setTransactions(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadTransactions()
    if (household) {
      supabase
        .from('profiles')
        .select('*')
        .eq('household_id', household.id)
        .then(({ data }) => setMembers(data ?? []))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household?.id])

  const expenseCategories = categories.filter((c) => c.kind === type)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!household || !profile) return
    setSaving(true)
    try {
      const { error } = await supabase.from('transactions').insert({
        household_id: household.id,
        user_id: profile.id,
        category_id: categoryId || null,
        type,
        amount: Number(amount),
        description,
        occurred_on: occurredOn,
        source: 'manual',
      })
      if (error) throw error
      setAmount('')
      setDescription('')
      setCategoryId('')
      await loadTransactions()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    await supabase.from('transactions').delete().eq('id', id)
    await loadTransactions()
  }

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filterFrom && t.occurred_on < filterFrom) return false
      if (filterTo && t.occurred_on > filterTo) return false
      if (filterCategory !== 'all' && t.category_id !== filterCategory) return false
      if (filterPerson !== 'all' && t.user_id !== filterPerson) return false
      if (filterType !== 'all' && t.type !== filterType) return false
      return true
    })
  }, [transactions, filterFrom, filterTo, filterCategory, filterPerson, filterType])

  const totalExpense = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const totalIncome = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)

  function categoryFor(id: string | null) {
    return categories.find((c) => c.id === id)
  }
  function personFor(id: string) {
    return members.find((m) => m.id === id)?.display_name ?? '—'
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Gastos e Receitas</h1>

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-[#151824] rounded-xl border border-black/5 dark:border-white/10 p-5 grid grid-cols-2 md:grid-cols-6 gap-3 items-end"
      >
        <div className="col-span-2 md:col-span-1">
          <label className="block text-xs text-gray-500 mb-1">Tipo</label>
          <select
            className="w-full rounded-lg border border-gray-300 dark:border-white/10 dark:bg-white/5 px-2 py-2 text-sm"
            value={type}
            onChange={(e) => {
              setType(e.target.value as TransactionType)
              setCategoryId('')
            }}
          >
            <option value="expense">Gasto</option>
            <option value="income">Receita</option>
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
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="col-span-2 md:col-span-2">
          <label className="block text-xs text-gray-500 mb-1">Descrição</label>
          <input
            className="w-full rounded-lg border border-gray-300 dark:border-white/10 dark:bg-white/5 px-2 py-2 text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="ex: Supermercado"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Categoria</label>
          <select
            className="w-full rounded-lg border border-gray-300 dark:border-white/10 dark:bg-white/5 px-2 py-2 text-sm"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">—</option>
            {expenseCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Data</label>
          <input
            type="date"
            className="w-full rounded-lg border border-gray-300 dark:border-white/10 dark:bg-white/5 px-2 py-2 text-sm"
            value={occurredOn}
            onChange={(e) => setOccurredOn(e.target.value)}
          />
        </div>
        <div className="col-span-2 md:col-span-6">
          <button
            disabled={saving}
            className="w-full md:w-auto px-5 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Adicionar lançamento'}
          </button>
        </div>
      </form>

      <div className="bg-white dark:bg-[#151824] rounded-xl border border-black/5 dark:border-white/10 p-5 grid grid-cols-2 md:grid-cols-5 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">De</label>
          <input
            type="date"
            className="w-full rounded-lg border border-gray-300 dark:border-white/10 dark:bg-white/5 px-2 py-1.5 text-sm"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Até</label>
          <input
            type="date"
            className="w-full rounded-lg border border-gray-300 dark:border-white/10 dark:bg-white/5 px-2 py-1.5 text-sm"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Categoria</label>
          <select
            className="w-full rounded-lg border border-gray-300 dark:border-white/10 dark:bg-white/5 px-2 py-1.5 text-sm"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Pessoa</label>
          <select
            className="w-full rounded-lg border border-gray-300 dark:border-white/10 dark:bg-white/5 px-2 py-1.5 text-sm"
            value={filterPerson}
            onChange={(e) => setFilterPerson(e.target.value)}
          >
            <option value="all">Ambos</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.display_name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Tipo</label>
          <select
            className="w-full rounded-lg border border-gray-300 dark:border-white/10 dark:bg-white/5 px-2 py-1.5 text-sm"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'all' | TransactionType)}
          >
            <option value="all">Todos</option>
            <option value="expense">Gastos</option>
            <option value="income">Receitas</option>
          </select>
        </div>
      </div>

      <div className="flex gap-4 text-sm">
        <p className="text-coral-500 font-medium">Gastos: {formatCurrency(totalExpense)}</p>
        <p className="text-mint-500 font-medium">Receitas: {formatCurrency(totalIncome)}</p>
        <p className="text-gray-500">Saldo: {formatCurrency(totalIncome - totalExpense)}</p>
      </div>

      <div className="bg-white dark:bg-[#151824] rounded-xl border border-black/5 dark:border-white/10 overflow-hidden">
        {loading ? (
          <p className="p-5 text-sm text-gray-400">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="p-5 text-sm text-gray-400">Nenhum lançamento encontrado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b border-black/5 dark:border-white/10">
              <tr>
                <th className="p-3">Data</th>
                <th className="p-3">Descrição</th>
                <th className="p-3">Categoria</th>
                <th className="p-3">Pessoa</th>
                <th className="p-3 text-right">Valor</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const cat = categoryFor(t.category_id)
                return (
                  <tr key={t.id} className="border-b border-black/5 dark:border-white/5 last:border-0">
                    <td className="p-3 whitespace-nowrap">
                      {new Date(`${t.occurred_on}T00:00:00`).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-3">{t.description || '—'}</td>
                    <td className="p-3 whitespace-nowrap">
                      {cat ? `${cat.icon} ${cat.name}` : '—'}
                    </td>
                    <td className="p-3 whitespace-nowrap">{personFor(t.user_id)}</td>
                    <td className={`p-3 text-right font-medium whitespace-nowrap ${t.type === 'expense' ? 'text-coral-500' : 'text-mint-500'}`}>
                      {t.type === 'expense' ? '-' : '+'}
                      {formatCurrency(Number(t.amount))}
                    </td>
                    <td className="p-3 text-right">
                      <button onClick={() => handleDelete(t.id)} className="text-gray-400 hover:text-coral-500 text-xs">
                        excluir
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
