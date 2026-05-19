'use client'
import { useAuth } from '../../context/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { LayoutDashboard, Store, CreditCard, LogOut, Menu, X, Crown, ClipboardList } from 'lucide-react'

const menuItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/shops', icon: Store, label: 'Shops' },
  { href: '/admin/plans', icon: CreditCard, label: 'Plans' },
  { href: '/admin/audit', icon: ClipboardList, label: 'Audit Logs' },
]

export default function AdminLayout({ children }) {
  const { user, logout, loading, mounted } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (mounted && (!user || user.role !== 'super_admin')) {
      router.replace('/')
    }
  }, [mounted, user, router])

  if (!mounted || loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
  }

  if (!user || user.role !== 'super_admin') return null

  const handleLogout = () => {
    logout()
    router.replace('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-gradient-to-b from-primary to-primary-dark text-white transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform`}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-white/20">
            <div className="flex items-center gap-2">
              <Crown className="w-8 h-8" />
              <span className="font-bold text-xl">Super Admin</span>
            </div>
            <p className="text-sm text-white/70 mt-1">Sight Ledger System</p>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive ? 'bg-white/20' : 'hover:bg-white/10'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="p-4 border-t border-white/20">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full hover:bg-white/10 rounded-lg"
            >
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-h-screen p-4 lg:p-8 pt-16 lg:pt-8">
        {children}
      </main>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  )
}
