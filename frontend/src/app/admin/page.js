'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { Store, DollarSign, Crown, AlertCircle, CalendarClock, BellRing, Wallet } from 'lucide-react'

import { API_URL } from '../../lib/api'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/dashboard`)
      setStats(res.data)
    } catch (err) { console.error(err) }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(amount || 0)
  }

  const getPlanColor = (type) => {
    if (type?.toLowerCase().includes('free')) return 'bg-gray-100 text-gray-700'
    if (type?.toLowerCase().includes('200')) return 'bg-blue-100 text-blue-700'
    if (type?.toLowerCase().includes('300')) return 'bg-purple-100 text-purple-700'
    if (type?.toLowerCase().includes('600')) return 'bg-amber-100 text-amber-700'
    if (type?.toLowerCase().includes('custom')) return 'bg-green-100 text-green-700'
    return 'bg-gray-100 text-gray-700'
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
          <Crown className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">SaaS Dashboard</h1>
          <p className="text-gray-500 text-sm">Sight Ledger SaaS Overview</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card p-5 border-l-4 border-blue-500">
          <p className="text-gray-500 text-sm">Total Shops</p>
          <p className="text-3xl font-bold">{stats?.total_shops || 0}</p>
          <p className="text-xs text-gray-400 mt-1">All registered shops</p>
        </div>
        <div className="card p-5 border-l-4 border-green-500">
          <p className="text-gray-500 text-sm">Active Shops</p>
          <p className="text-3xl font-bold text-green-600">{stats?.active_shops || 0}</p>
          <p className="text-xs text-gray-400 mt-1">Currently subscribed</p>
        </div>
        <div className="card p-5 border-l-4 border-red-500">
          <p className="text-gray-500 text-sm">Expired</p>
          <p className="text-3xl font-bold text-red-600">{stats?.expired_shops || 0}</p>
          <p className="text-xs text-gray-400 mt-1">Need renewal</p>
        </div>
        <div className="card p-5 border-l-4 border-amber-500">
          <p className="text-gray-500 text-sm">Monthly Revenue</p>
          <p className="text-3xl font-bold text-amber-600">{formatCurrency(stats?.monthly_revenue)}</p>
          <p className="text-xs text-gray-400 mt-1">Potential monthly</p>
        </div>
      </div>

      {/* Renewal-Focused Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <CalendarClock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Expiring in 7 Days</p>
              <p className="text-2xl font-bold text-amber-700">{stats?.expiring_7_days || 0}</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <BellRing className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Expiring in 30 Days</p>
              <p className="text-2xl font-bold text-blue-700">{stats?.expiring_30_days || 0}</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-100 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Renewal Due Amount</p>
              <p className="text-2xl font-bold text-rose-700">{formatCurrency(stats?.renewal_due_amount || 0)}</p>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">Renewal Soon Amount (7d)</p>
              <p className="text-2xl font-bold text-emerald-700">{formatCurrency(stats?.renewal_soon_amount || 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Distribution */}
      {stats?.plan_stats?.length > 0 && (
        <div className="card p-6 mb-8">
          <h2 className="font-semibold mb-4">Plan Distribution</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {stats.plan_stats.map((plan, i) => (
              <div key={i} className={`p-4 rounded-lg ${getPlanColor(plan.subscription_type)}`}>
                <p className="font-medium">{plan.subscription_type || 'Unknown'}</p>
                <p className="text-2xl font-bold mt-1">{plan.shop_count}</p>
                <p className="text-xs opacity-75">Active: {plan.active_count} | Expired: {plan.expired_count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Shops */}
      {stats?.recent_shops?.length > 0 && (
        <div className="card p-6">
          <h2 className="font-semibold mb-4">Recent Shops</h2>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Shop Name</th>
                  <th>Owner</th>
                  <th>Plan</th>
                  <th>Expiry</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent_shops.map((shop, i) => (
                  <tr key={i}>
                    <td className="font-medium">{shop.shop_name}</td>
                    <td>{shop.owner_name}</td>
                    <td><span className={`badge ${getPlanColor(shop.subscription_type)}`}>{shop.subscription_type}</span></td>
                    <td className={new Date(shop.subscription_expiry) < new Date() ? 'text-red-600' : ''}>
                      {shop.subscription_expiry}
                    </td>
                    <td className="text-gray-500">{shop.created_at?.split('T')[0]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!stats && (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Store className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-semibold text-lg">No Data Yet</h3>
          <p className="text-gray-500">Shops and customers will appear here once registered.</p>
        </div>
      )}
    </div>
  )
}
