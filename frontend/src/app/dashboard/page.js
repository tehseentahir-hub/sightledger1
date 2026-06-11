'use client'
import { useState, useEffect } from 'react'
import axios from 'axios'
import { Users, Truck, DollarSign, Package, Calendar, Droplets, Wallet } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

import { API_URL } from '../../lib/api'
import { isHybridMode, isPetTradingMode } from '../../lib/businessMode'
import HybridDashboardView from '../../components/pet/HybridDashboardView'
import PetDashboardView from '../../components/pet/PetDashboardView'

function MiniChart({ data = [], valueKey = 'bottles', color = '#16a34a' }) {
  if (!data.length) return null
  const values = data.map(d => Number(d[valueKey] || 0))
  const max = Math.max(1, ...values)
  const width = data.length * 32
  const height = 60

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-16">
      {data.map((item, i) => {
        const val = Number(item[valueKey] || 0)
        const barWidth = 20
        const barHeight = Math.max(4, (val / max) * (height - 10))
        const x = i * 32 + 6
        const y = height - barHeight
        return <rect key={i} x={x} y={y} width={barWidth} height={barHeight} rx="3" fill={color} opacity="0.8" />
      })}
    </svg>
  )
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [shopInfo, setShopInfo] = useState(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const { user } = useAuth()
  const activeShop = shopInfo || user || null
  const petMode = isPetTradingMode(activeShop)
  const hybridMode = isHybridMode(activeShop)

  useEffect(() => {
    loadShopInfo()
    try {
      const hidden = localStorage.getItem('sightledger_onboarding_hidden') === '1'
      setShowOnboarding(!hidden)
    } catch {}
  }, [])

  useEffect(() => {
    if (petMode || hybridMode) {
      setLoading(false)
      return
    }
    loadDashboard()
  }, [hybridMode, petMode])

  const loadDashboard = async () => {
    try {
      const res = await axios.get(`${API_URL}/dashboard`)
      setData(res.data)
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  const loadShopInfo = async () => {
    try {
      const res = await axios.get(`${API_URL}/auth/me`)
      setShopInfo(res.data)
    } catch (err) { console.error(err) }
  }

  const normalizePlanName = (rawType) => {
    const plan = String(rawType || '').trim().toLowerCase()
    if (!plan) return 'Free Trial'
    if (plan === 'free_trial' || plan === 'free trial') return 'Free Trial'
    if (plan === 'monthly - 200' || plan === 'plus') return 'Plus'
    if (plan === 'monthly - 300' || plan === 'aqua plus') return 'Aqua Plus'
    if (plan === 'monthly - 600' || plan === 'aqua premium') return 'Aqua Premium'
    if (plan === 'aqua custom plan') return 'Aqua Custom Plan'
    if (plan === 'super_admin' || plan === 'super admin') return 'System Plan'
    return String(rawType)
  }

  const toUtcMidnight = (dateLike) => {
    const dt = new Date(dateLike)
    return new Date(Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate()))
  }

  const expiryDate = activeShop?.subscription_expiry ? toUtcMidnight(activeShop.subscription_expiry) : null
  const todayUtc = toUtcMidnight(new Date())
  const rawDaysLeft = expiryDate ? Math.ceil((expiryDate - todayUtc) / (1000 * 60 * 60 * 24)) : 0
  const daysLeft = Math.max(0, rawDaysLeft)
  const isExpired = Boolean(expiryDate && rawDaysLeft < 0)
  const packageName = normalizePlanName(activeShop?.subscription_type)
  const expiryLabel = expiryDate ? new Date(activeShop.subscription_expiry).toLocaleDateString('en-GB') : 'N/A'

  if (hybridMode) {
    return <HybridDashboardView user={activeShop} />
  }

  if (petMode) {
    return <PetDashboardView user={activeShop} />
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {showOnboarding && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-blue-900">Quick Start</p>
              <p className="text-sm text-blue-800 mt-1">1) Add Customers 2) Add Deliveries 3) Record Payments 4) Check Reports</p>
            </div>
            <button
              className="text-sm text-blue-700 underline"
              onClick={() => {
                setShowOnboarding(false)
                try { localStorage.setItem('sightledger_onboarding_hidden', '1') } catch {}
              }}
            >
              Hide
            </button>
          </div>
        </div>
      )}

      {/* Welcome Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            Welcome back! 👋
          </h1>
          <p className="text-gray-500 mt-1">
            Here's what's happening with your business today
          </p>
        </div>

        {/* Subscription Status Pill */}
        {activeShop && (
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
            isExpired ? 'bg-red-100 text-red-700' :
            daysLeft <= 7 ? 'bg-amber-100 text-amber-700' :
            'bg-green-100 text-green-700'
          }`}>
            <Calendar className="w-4 h-4" />
            <span>{packageName}</span>
            <span className="opacity-70">|</span>
            <span>{isExpired ? 'Subscription Expired' : `${daysLeft} days left`}</span>
            <span className="opacity-70">|</span>
            <span>Expires: {expiryLabel}</span>
          </div>
        )}
      </div>

      {/* Key Metrics Cards - Modern Design */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Deliveries */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Today</span>
          </div>
          <p className="text-3xl font-bold">{data?.today_deliveries || 0}</p>
          <p className="text-blue-100 text-sm mt-1">{data?.today_bottles || 0} bottles delivered</p>
        </div>

        {/* Active Customers */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Active</span>
          </div>
          <p className="text-3xl font-bold">{data?.active_customers || 0}</p>
          <p className="text-green-100 text-sm mt-1">Registered customers</p>
        </div>

        {/* Monthly Revenue */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">This Month</span>
          </div>
          <p className="text-3xl font-bold">Rs {(data?.monthly_sales || 0).toLocaleString()}</p>
          <p className="text-purple-100 text-sm mt-1">Total revenue</p>
        </div>

        {/* Bottles Outstanding */}
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Outside</span>
          </div>
          <p className="text-3xl font-bold">{data?.bottles_outside || 0}</p>
          <p className="text-amber-100 text-sm mt-1">Bottles with customers</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Today Cash Collection</p>
          <p className="text-xl font-bold text-green-600 mt-1">Rs {(data?.today_collection || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Total Pending</p>
          <p className="text-xl font-bold text-red-600 mt-1">Rs {(data?.pending_payments || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Advance Balance</p>
          <p className="text-xl font-bold text-emerald-700 mt-1">Rs {(data?.advance_balance || 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Walk-in Today</p>
          <p className="text-xl font-bold text-blue-700 mt-1">{data?.today_walkins || 0} visits</p>
        </div>
      </div>

      {/* Walk-in Bottles Section - Focus on bottles, not visits */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center">
              <Droplets className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Walk-in Customers</h2>
              <p className="text-sm text-gray-500">Bottles refilled through counter sales</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Today */}
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-5 border border-emerald-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
              <span className="text-sm font-medium text-emerald-700">Today</span>
            </div>
            <p className="text-4xl font-bold text-emerald-600">{data?.today_walkin_bottles || 0}</p>
            <p className="text-sm text-emerald-600/70 mt-1">{data?.today_walkins || 0} visits</p>
          </div>

          {/* Last 7 Days */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span className="text-sm font-medium text-blue-700">Last 7 Days</span>
            </div>
            <p className="text-4xl font-bold text-blue-600">{data?.last7_walkin_bottles || 0}</p>
            <p className="text-sm text-blue-600/70 mt-1">{data?.last7_walkins || 0} visits</p>
            <div className="mt-3">
              <MiniChart data={data?.walkin_trend || []} valueKey="walkin_bottles" color="#2563eb" />
            </div>
          </div>

          {/* This Month */}
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-5 border border-purple-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              <span className="text-sm font-medium text-purple-700">This Month</span>
            </div>
            <p className="text-4xl font-bold text-purple-600">{data?.month_walkin_bottles || 0}</p>
            <p className="text-sm text-purple-600/70 mt-1">{data?.month_walkins || 0} visits</p>
          </div>
        </div>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Today Summary */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
            Today's Activity
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Home Deliveries</span>
              <span className="font-semibold text-gray-900">{data?.today_homes || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Home Bottles</span>
              <span className="font-semibold text-blue-600">{data?.today_home_bottles || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Walk-in Visits</span>
              <span className="font-semibold text-green-600">{data?.today_walkins || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Walk-in Bottles</span>
              <span className="font-semibold text-emerald-600">{data?.today_walkin_bottles || 0}</span>
            </div>
          </div>
        </div>

        {/* Last 7 Days */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
            Last 7 Days
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Total Deliveries</span>
              <span className="font-semibold text-gray-900">{data?.last7_deliveries || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Total Bottles</span>
              <span className="font-semibold text-blue-600">{data?.last7_bottles || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Walk-in Bottles</span>
              <span className="font-semibold text-emerald-600">{data?.last7_walkin_bottles || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Home Bottles</span>
              <span className="font-semibold text-blue-600">{data?.last7_home_bottles || 0}</span>
            </div>
          </div>
        </div>

        {/* This Month */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-3 h-3 bg-amber-500 rounded-full"></span>
            This Month
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Total Deliveries</span>
              <span className="font-semibold text-gray-900">{data?.month_deliveries || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Total Bottles</span>
              <span className="font-semibold text-blue-600">{data?.month_bottles || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Walk-in Bottles</span>
              <span className="font-semibold text-emerald-600">{data?.month_walkin_bottles || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Home Bottles</span>
              <span className="font-semibold text-blue-600">{data?.month_home_bottles || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Payments Alert */}
      {(data?.pending_payments || 0) > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="font-semibold text-red-900">Pending Payments</p>
              <p className="text-sm text-red-700">Credit customers have outstanding balances</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-red-600">Rs {(data?.pending_payments || 0).toLocaleString()}</p>
            <a href="/dashboard/payments" className="text-sm text-red-600 underline">View Details</a>
          </div>
        </div>
      )}

      {/* Recent Deliveries */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Recent Deliveries</h2>
          <a href="/dashboard/deliveries" className="text-sm text-primary hover:underline">View All</a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bottles</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.recent_deliveries?.length > 0 ? (
                data.recent_deliveries.slice(0, 5).map((d, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium ${
                          d.delivery_type === 'walk_in' ? 'bg-emerald-500' : 'bg-blue-500'
                        }`}>
                          {d.customer_name?.charAt(0) || 'W'}
                        </div>
                        <span className="font-medium text-gray-900">{d.customer_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-semibold text-gray-900">{d.bottles_delivered}</span>
                    </td>
                    <td className="px-5 py-4 text-gray-500">{d.delivery_date}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        d.delivery_type === 'walk_in' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {d.delivery_type === 'walk_in' ? 'Walk-in' : 'Home'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                    No recent deliveries
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
