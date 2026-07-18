import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import HouseholdSetupPage from './pages/HouseholdSetupPage'
import DashboardPage from './pages/DashboardPage'
import ExpensesPage from './pages/ExpensesPage'
import InvestmentsPage from './pages/InvestmentsPage'
import BudgetPage from './pages/BudgetPage'
import SettingsPage from './pages/SettingsPage'

function Gate() {
  const { session, profile, household, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
        Carregando...
      </div>
    )
  }

  if (!session) return <LoginPage />
  if (!profile || !household) return <HouseholdSetupPage />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="gastos" element={<ExpensesPage />} />
        <Route path="investimentos" element={<InvestmentsPage />} />
        <Route path="orcamento" element={<BudgetPage />} />
        <Route path="configuracoes" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </BrowserRouter>
  )
}
