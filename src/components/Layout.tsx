import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/', label: 'Painel', icon: '📊', end: true },
  { to: '/gastos', label: 'Gastos', icon: '💸' },
  { to: '/investimentos', label: 'Investimentos', icon: '📈' },
  { to: '/orcamento', label: 'Orçamento', icon: '🗓️' },
  { to: '/configuracoes', label: 'Config', icon: '⚙️' },
]

export default function Layout() {
  const { profile, household, signOut } = useAuth()

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 dark:bg-[#0f1117]">
      <aside className="md:w-56 md:min-h-screen border-b md:border-b-0 md:border-r border-black/5 dark:border-white/10 bg-white dark:bg-[#151824] flex md:flex-col">
        <div className="hidden md:block p-5">
          <p className="font-semibold text-lg">💞 Finança a Dois</p>
          <p className="text-xs text-gray-500 mt-1 truncate">{household?.name}</p>
        </div>
        <nav className="flex md:flex-col flex-1 overflow-x-auto md:overflow-visible">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap transition ${
                  isActive
                    ? 'text-brand-600 dark:text-brand-300 font-medium bg-brand-50 dark:bg-brand-900/30 border-b-2 md:border-b-0 md:border-r-2 border-brand-500'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="hidden md:block p-4 mt-auto border-t border-black/5 dark:border-white/10">
          <p className="text-sm font-medium truncate">{profile?.display_name}</p>
          <button onClick={() => signOut()} className="text-xs text-gray-400 hover:underline mt-1">
            Sair
          </button>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  )
}
