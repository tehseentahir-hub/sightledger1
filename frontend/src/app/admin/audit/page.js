'use client'
import { useEffect, useMemo, useState } from 'react'
import axios from 'axios'
import { ClipboardList, Filter, ChevronLeft, ChevronRight } from 'lucide-react'

import { API_URL } from '../../../lib/api'

const formatPakistanTime = (value) => {
  if (!value) return '-'

  const text = String(value)
  const date = new Date(text.includes('T') ? text : `${text.replace(' ', 'T')}Z`)
  if (Number.isNaN(date.getTime())) return text

  return new Intl.DateTimeFormat('en-PK', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

export default function AuditLogsPage() {
  const [shops, setShops] = useState([])
  const [logs, setLogs] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, total_pages: 1 })
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    shop_id: '',
    action: '',
    entity_type: '',
    start_date: '',
    end_date: '',
  })

  const actions = ['create', 'update', 'delete']
  const entityTypes = ['shop', 'customer', 'payment', 'delivery']

  const canPrev = pagination.page > 1
  const canNext = pagination.page < pagination.total_pages

  const queryParams = useMemo(() => {
    const p = {
      page: pagination.page,
      limit: pagination.limit,
    }
    if (filters.shop_id) p.shop_id = filters.shop_id
    if (filters.action) p.action = filters.action
    if (filters.entity_type) p.entity_type = filters.entity_type
    if (filters.start_date) p.start_date = filters.start_date
    if (filters.end_date) p.end_date = filters.end_date
    return p
  }, [filters, pagination.page, pagination.limit])

  useEffect(() => {
    loadShops()
  }, [])

  useEffect(() => {
    loadLogs()
  }, [queryParams])

  const loadShops = async () => {
    try {
      const res = await axios.get(`${API_URL}/admin/shops`)
      setShops(res.data || [])
    } catch (err) {
      console.error(err)
    }
  }

  const loadLogs = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_URL}/admin/audit-logs`, { params: queryParams })
      setLogs(res.data?.items || [])
      setPagination((prev) => ({
        ...prev,
        page: res.data?.pagination?.page || prev.page,
        limit: res.data?.pagination?.limit || prev.limit,
        total: res.data?.pagination?.total || 0,
        total_pages: res.data?.pagination?.total_pages || 1,
      }))
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const applyFilters = (e) => {
    e.preventDefault()
    setPagination((prev) => ({ ...prev, page: 1 }))
    loadLogs()
  }

  const clearFilters = () => {
    setFilters({ shop_id: '', action: '', entity_type: '', start_date: '', end_date: '' })
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-r from-slate-700 to-slate-900 rounded-xl flex items-center justify-center">
          <ClipboardList className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-gray-500 text-sm">Trace who changed what and when</p>
        </div>
      </div>

      <form onSubmit={applyFilters} className="card p-4 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <select
            value={filters.shop_id}
            onChange={(e) => setFilters((f) => ({ ...f, shop_id: e.target.value }))}
            className="input"
          >
            <option value="">All Shops</option>
            {shops.map((s) => (
              <option key={s.id} value={s.id}>{s.shop_name}</option>
            ))}
          </select>

          <select
            value={filters.action}
            onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
            className="input"
          >
            <option value="">All Actions</option>
            {actions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>

          <select
            value={filters.entity_type}
            onChange={(e) => setFilters((f) => ({ ...f, entity_type: e.target.value }))}
            className="input"
          >
            <option value="">All Entities</option>
            {entityTypes.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>

          <input
            type="date"
            value={filters.start_date}
            onChange={(e) => setFilters((f) => ({ ...f, start_date: e.target.value }))}
            className="input"
          />
          <input
            type="date"
            value={filters.end_date}
            onChange={(e) => setFilters((f) => ({ ...f, end_date: e.target.value }))}
            className="input"
          />
        </div>

        <div className="flex gap-2 mt-3">
          <button type="submit" className="btn btn-primary">
            <Filter size={16} /> Apply Filters
          </button>
          <button type="button" onClick={clearFilters} className="btn">
            Clear
          </button>
        </div>
      </form>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Shop</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Entity ID</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8">Loading audit logs...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">No audit logs found</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td className="text-sm">{formatPakistanTime(log.created_at)}</td>
                    <td>{log.shop_name || '-'}</td>
                    <td className="text-sm">{log.actor_role || '-'} #{log.actor_id || '-'}</td>
                    <td>
                      <span className={`badge ${
                        log.action === 'create' ? 'badge-success' :
                        log.action === 'update' ? 'badge-info' :
                        log.action === 'delete' ? 'badge-danger' : 'badge-info'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td>{log.entity_type}</td>
                    <td>{log.entity_id || '-'}</td>
                    <td className="max-w-[320px]">
                      <pre className="text-xs text-gray-600 whitespace-pre-wrap break-all">{log.details ? JSON.stringify(log.details) : '-'}</pre>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-gray-500">
          Total records: <strong>{pagination.total}</strong>
        </p>
        <div className="flex items-center gap-2">
          <button
            disabled={!canPrev}
            onClick={() => canPrev && setPagination((p) => ({ ...p, page: p.page - 1 }))}
            className="btn disabled:opacity-50"
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <span className="text-sm text-gray-600">Page {pagination.page} of {pagination.total_pages}</span>
          <button
            disabled={!canNext}
            onClick={() => canNext && setPagination((p) => ({ ...p, page: p.page + 1 }))}
            className="btn disabled:opacity-50"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

