'use client'
import { useAuth } from '../../context/AuthContext'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard, Users, Truck, Package, DollarSign,
  TrendingUp, LogOut, Menu, X, FileText, SlidersHorizontal
} from 'lucide-react'
import BrandLogo from '../../components/BrandLogo'

const menuItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/customers', icon: Users, label: 'Customers' },
  { href: '/dashboard/deliveries', icon: Truck, label: 'Deliveries' },
  { href: '/dashboard/inventory', icon: Package, label: 'Inventory' },
  { href: '/dashboard/payments', icon: DollarSign, label: 'Payments' },
  { href: '/dashboard/invoice', icon: FileText, label: 'Invoice' },
  { href: '/dashboard/settings', icon: SlidersHorizontal, label: 'Settings', ownerOnly: true },
  { href: '/dashboard/expenses', icon: TrendingUp, label: 'Expenses' },
  { href: '/dashboard/reports', icon: TrendingUp, label: 'Reports' },
]

export default function DashboardLayout({ children }) {
  const { user, logout, loading, mounted } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!mounted) return
    if (!user) {
      router.replace('/')
      return
    }
    if (user.role === 'super_admin') {
      router.replace('/admin')
    }
  }, [mounted, user, router])

  if (!mounted || loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
  }

  if (!user || user.role === 'super_admin') return null
  const visibleMenuItems = menuItems.filter((item) => !item.ownerOnly || user?.type !== 'staff')

  const handleLogout = () => {
    logout()
    router.replace('/')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex w-full max-w-full overflow-x-hidden">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform`}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b">
            <BrandLogo href="/dashboard" variant="sidebar" priority />
            <p className="text-xs text-gray-500 mt-1 truncate">{user?.shop_name}</p>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {visibleMenuItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="p-4 border-t">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full text-red-600 hover:bg-red-50 rounded-lg"
            >
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 w-full max-w-full min-h-screen p-4 lg:p-8 pt-16 lg:pt-8 overflow-x-hidden">
        {children}
      </main>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
