import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { Category } from '../types'
import { useAuth } from '../context/AuthContext'

export function useCategories() {
  const { household } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  async function reload() {
    if (!household) return
    setLoading(true)
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('household_id', household.id)
      .order('name')
    setCategories(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household?.id])

  return { categories, loading, reload }
}
