export type TransactionType = 'expense' | 'income'
export type MovementType = 'aporte' | 'resgate' | 'saldo_atual'

export interface Household {
  id: string
  name: string
  invite_code: string
  created_at: string
}

export interface Profile {
  id: string
  household_id: string | null
  display_name: string
  color: string
  created_at: string
}

export interface Category {
  id: string
  household_id: string
  name: string
  kind: TransactionType
  color: string
  icon: string
  created_at: string
}

export interface Transaction {
  id: string
  household_id: string
  user_id: string
  category_id: string | null
  type: TransactionType
  amount: number
  description: string
  occurred_on: string
  source: 'manual' | 'nubank_csv' | 'nubank_api'
  created_at: string
}

export interface InvestmentAccount {
  id: string
  household_id: string
  user_id: string
  name: string
  category: string
  broker: string
  created_at: string
}

export interface InvestmentMovement {
  id: string
  account_id: string
  household_id: string
  movement_type: MovementType
  amount: number
  occurred_on: string
  notes: string
  created_at: string
}

export interface Budget {
  id: string
  household_id: string
  category_id: string
  month: string
  planned_amount: number
  created_at: string
}
