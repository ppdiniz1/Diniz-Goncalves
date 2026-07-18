import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useCategories } from '../lib/useCategories'
import { formatCurrency, firstDayOfMonth } from '../lib/format'
import type { Budget, Transaction } from '../types'

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const date = new Date(y, m - 1 + delta, 1)
  return firstDayOfMonth(date)
}

function monthDisplayName(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

export default function BudgetPage() {
  const { household } = useAuth()
  const { categories } = useCategories()
  const [month, setMonth] = useState(firstDayOfMonth())
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  const expenseCategories = categories.filter((c) => c.kind === 'expense')

  async function loadData() {
    if (!household) return
    setLoading(true)
    const monthEnd = shiftMonth(month, 1)
    const [{ data: budgetData }, { data: txData }] = await Promise.all([
      supabase.from('budgets').select('*').eq('household_id', household.id).eq('month', month),
      supabase
        .from('transactions')
        .select('*')
        .eq('household_id', household.id)
        .eq('type', 'expense')
        .gte('occurred_on', month)
        .lt('occurred_on', monthEnd),
    ])
    setBudgets(budgetData ?? [])
    setTransactions(txData ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household?.id, month])

  const spentByCategory = useMemo(() => {
    const map = new Map<string, number>()
    transactions.forEach((t) => {
      if (!t.category_id) return
      map.set(t.category_id, (map.get(t.category_id) ?? 0) + Number(t.amount))
    })
    return map
  }, [transactions])

  function budgetFor(categoryId: string): Budget | undefined {
    return budgets.find((b) => b.category_id === categoryId)
  }

  async function saveBudget(categoryId: string) {
    if (!household) return
    const raw = drafts[categoryId]
    const value = Number(raw)
    if (Number.isNaN(value) || raw === undefined) return

    const existing = budgetFor(categoryId)
    if (existing) {
      await supabase.from('budgets').update({ planned_amount: value }).eq('id', existing.id)
    } else {
      await supabase.from('budgets').insert({
        household_id: household.id,
        category_id: categoryId,
        month,
        planned_amount: value,
      })
    }
    setDrafts((d) => {
      const next = { ...d }
      delete next[categoryId]
      return next
    })
    await loadData()
  }

  const totalPlanned = budgets.reduce((s, b) => s + Number(b.planned_amount), 0)
  const totalSpent = Array.from(spentByCategory.values()).reduce((s, v) => s + v, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Orçamento</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            className="w-8 h-8 rounded-lg border border-black/10 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5"
          >
            ‹
          </button>
          <span className="text-sm font-medium capitalize w-40 text-center">{monthDisplayName(month)}</span>
          <button
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            className="w-8 h-8 rounded-lg border border-black/10 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5"
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#151824] rounded-xl border border-black/5 dark:border-white/10 p-5">
          <p className="text-xs text-gray-500">Planejado</p>
          <p className="text-2xl font-semibold mt-1">{formatCurrency(totalPlanned)}</p>
        </div>
        <div className="bg-white dark:bg-[#151824] rounded-xl border border-black/5 dark:border-white/10 p-5">
          <p className="text-xs text-gray-500">Gasto até agora</p>
          <p className="text-2xl font-semibold mt-1">{formatCurrency(totalSpent)}</p>
        </div>
        <div className="bg-white dark:bg-[#151824] rounded-xl border border-black/5 dark:border-white/10 p-5">
          <p className="text-xs text-gray-500">Diferença</p>
          <p className={`text-2xl font-semibold mt-1 ${totalPlanned - totalSpent >= 0 ? 'text-mint-500' : 'text-coral-500'}`}>
            {formatCurrency(totalPlanned - totalSpent)}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#151824] rounded-xl border border-black/5 dark:border-white/10 divide-y divide-black/5 dark:divide-white/5">
        {loading ? (
          <p className="p-5 text-sm text-gray-400">Carregando...</p>
        ) : expenseCategories.length === 0 ? (
          <p className="p-5 text-sm text-gray-400">Nenhuma categoria de gasto cadastrada.</p>
        ) : (
          expenseCategories.map((cat) => {
            const budget = budgetFor(cat.id)
            const planned = Number(budget?.planned_amount ?? 0)
            const spent = spentByCategory.get(cat.id) ?? 0
            const pct = planned > 0 ? Math.min(100, (spent / planned) * 100) : 0
            const over = planned > 0 && spent > planned

            return (
              <div key={cat.id} className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-sm">
                    {cat.icon} {cat.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {formatCurrency(spent)} /
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={String(planned || 0)}
                      className="w-24 rounded-lg border border-gray-300 dark:border-white/10 dark:bg-white/5 px-2 py-1 text-xs text-right"
                      value={drafts[cat.id] ?? ''}
                      onChange={(e) => setDrafts((d) => ({ ...d, [cat.id]: e.target.value }))}
                      onBlur={() => drafts[cat.id] !== undefined && saveBudget(cat.id)}
                    />
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${over ? 'bg-coral-500' : 'bg-brand-500'}`}
                    style={{ width: `${planned > 0 ? pct : 0}%` }}
                  />
                </div>
                {over && (
                  <p className="text-xs text-coral-500 mt-1">
                    Estourou o orçamento em {formatCurrency(spent - planned)}
                  </p>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
