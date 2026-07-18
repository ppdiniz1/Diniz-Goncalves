import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useCategories } from '../lib/useCategories'
import { formatCurrency, firstDayOfMonth } from '../lib/format'
import type { Profile, Transaction } from '../types'

const PALETTE = ['#3a63f5', '#10b981', '#f59e0b', '#a855f7', '#ef4444', '#0ea5e9', '#ec4899', '#6366f1', '#6b7280']

function monthsBack(n: number): string[] {
  const out: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    out.push(firstDayOfMonth(new Date(now.getFullYear(), now.getMonth() - i, 1)))
  }
  return out
}

function monthName(m: string) {
  const [y, mm] = m.split('-').map(Number)
  return new Date(y, mm - 1, 1).toLocaleDateString('pt-BR', { month: 'short' })
}

export default function DashboardPage() {
  const { household } = useAuth()
  const { categories } = useCategories()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [rangeMonths, setRangeMonths] = useState(6)

  useEffect(() => {
    if (!household) return
    setLoading(true)
    const since = monthsBack(rangeMonths)[0]
    Promise.all([
      supabase
        .from('transactions')
        .select('*')
        .eq('household_id', household.id)
        .gte('occurred_on', since)
        .order('occurred_on'),
      supabase.from('profiles').select('*').eq('household_id', household.id),
    ]).then(([txRes, membersRes]) => {
      setTransactions(txRes.data ?? [])
      setMembers(membersRes.data ?? [])
      setLoading(false)
    })
  }, [household?.id, rangeMonths])

  const months = monthsBack(rangeMonths)

  const monthlyTotals = useMemo(() => {
    return months.map((m) => {
      const monthTx = transactions.filter((t) => t.occurred_on.slice(0, 7) === m.slice(0, 7))
      const expense = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
      const income = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
      return { month: monthName(m), expense, income }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, rangeMonths])

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const cat = categories.find((c) => c.id === t.category_id)
        const key = cat ? `${cat.icon} ${cat.name}` : 'Sem categoria'
        map.set(key, (map.get(key) ?? 0) + Number(t.amount))
      })
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [transactions, categories])

  const personComparison = useMemo(() => {
    return members.map((m) => {
      const spent = transactions
        .filter((t) => t.user_id === m.id && t.type === 'expense')
        .reduce((s, t) => s + Number(t.amount), 0)
      return { name: m.display_name, gasto: spent }
    })
  }, [members, transactions])

  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const currentMonthKey = firstDayOfMonth().slice(0, 7)
  const currentMonthExpense = transactions
    .filter((t) => t.type === 'expense' && t.occurred_on.slice(0, 7) === currentMonthKey)
    .reduce((s, t) => s + Number(t.amount), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold">Painel</h1>
        <select
          className="rounded-lg border border-gray-300 dark:border-white/10 dark:bg-white/5 px-3 py-1.5 text-sm"
          value={rangeMonths}
          onChange={(e) => setRangeMonths(Number(e.target.value))}
        >
          <option value={3}>Últimos 3 meses</option>
          <option value={6}>Últimos 6 meses</option>
          <option value={12}>Últimos 12 meses</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#151824] rounded-xl border border-black/5 dark:border-white/10 p-5">
          <p className="text-xs text-gray-500">Gasto no mês atual</p>
          <p className="text-2xl font-semibold mt-1 text-coral-500">{formatCurrency(currentMonthExpense)}</p>
        </div>
        <div className="bg-white dark:bg-[#151824] rounded-xl border border-black/5 dark:border-white/10 p-5">
          <p className="text-xs text-gray-500">Gastos no período</p>
          <p className="text-2xl font-semibold mt-1">{formatCurrency(totalExpense)}</p>
        </div>
        <div className="bg-white dark:bg-[#151824] rounded-xl border border-black/5 dark:border-white/10 p-5">
          <p className="text-xs text-gray-500">Receitas no período</p>
          <p className="text-2xl font-semibold mt-1 text-mint-500">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="bg-white dark:bg-[#151824] rounded-xl border border-black/5 dark:border-white/10 p-5">
          <p className="text-xs text-gray-500">Saldo no período</p>
          <p className="text-2xl font-semibold mt-1">{formatCurrency(totalIncome - totalExpense)}</p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Carregando dados...</p>
      ) : (
        <>
          <div className="bg-white dark:bg-[#151824] rounded-xl border border-black/5 dark:border-white/10 p-5">
            <h2 className="text-sm font-medium text-gray-500 mb-3">Gastos x Receitas por mês</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyTotals}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => formatCurrency(v)} width={90} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Legend />
                <Bar dataKey="income" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-[#151824] rounded-xl border border-black/5 dark:border-white/10 p-5">
              <h2 className="text-sm font-medium text-gray-500 mb-3">Gastos por categoria</h2>
              {categoryBreakdown.length === 0 ? (
                <p className="text-sm text-gray-400">Sem gastos no período.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={categoryBreakdown} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                      {categoryBreakdown.map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white dark:bg-[#151824] rounded-xl border border-black/5 dark:border-white/10 p-5">
              <h2 className="text-sm font-medium text-gray-500 mb-3">Comparativo de gastos entre vocês</h2>
              {personComparison.length === 0 ? (
                <p className="text-sm text-gray-400">Sem dados suficientes.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={personComparison} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis type="number" fontSize={12} tickFormatter={(v) => formatCurrency(v)} />
                    <YAxis type="category" dataKey="name" fontSize={12} width={90} />
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                    <Bar dataKey="gasto" fill="#3a63f5" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
