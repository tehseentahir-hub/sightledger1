'use client'
import { useEffect, useState } from 'react'
import axios from 'axios'
import {
  Save, Settings, Plus, Edit, Trash2, KeyRound, UserCog, Bike, Store
} from 'lucide-react'
import { useAuth } from '../../../context/AuthContext'
import CenterDialog from '../../../components/CenterDialog'

import { API_URL, getRequestErrorMessage } from '../../../lib/api'
import { isPetTradingMode } from '../../../lib/businessMode'

const emptyRider = { name: '', is_active: true }
const emptyCashier = { name: '', phone: '', password: '', is_active: true }
const numberOrEmpty = (value) => value === '' ? '' : Number(value)
const numberOrZero = (value) => value === '' ? 0 : Number(value || 0)

export default function SettingsPage() {
  const { user, setUser } = useAuth()
  const petMode = isPetTradingMode(user)
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [staffLoading, setStaffLoading] = useState(true)
  const [staff, setStaff] = useState([])
  const [riderForm, setRiderForm] = useState(emptyRider)
  const [cashierForm, setCashierForm] = useState(emptyCashier)
  const [editingRiderId, setEditingRiderId] = useState(null)
  const [editingCashierId, setEditingCashierId] = useState(null)
  const [profile, setProfile] = useState({
    shop_name: '',
    owner_name: '',
    phone: '',
    address: '',
    default_refill_rate: 100,
  })
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [dialog, setDialog] = useState({ open: false, type: 'error', title: '', message: '', onConfirm: null, onCancel: null })

  const showError = (message, title = 'Action Failed') => {
    setDialog({
      open: true,
      type: 'error',
      title,
      message,
      onConfirm: () => setDialog(prev => ({ ...prev, open: false })),
      onCancel: null,
    })
  }
  const showSuccess = (message, title = 'Done') => {
    setDialog({
      open: true,
      type: 'success',
      title,
      message,
      onConfirm: () => setDialog(prev => ({ ...prev, open: false })),
      onCancel: null,
    })
  }

  useEffect(() => {
    loadSettings()
    loadStaff()
  }, [])

  const loadSettings = async () => {
    try {
      const res = await axios.get(`${API_URL}/auth/me`)
      setProfile({
        shop_name: res.data.shop_name || '',
        owner_name: res.data.owner_name || '',
        phone: res.data.phone || '',
        address: res.data.address || '',
        default_refill_rate: Number(res.data.default_refill_rate || 100),
      })
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const loadStaff = async () => {
    try {
      const res = await axios.get(`${API_URL}/staff`)
      setStaff(res.data || [])
    } catch (err) {
      console.error(err)
    }
    setStaffLoading(false)
  }

  const riders = staff.filter(member => member.role === 'rider')
  const cashiers = staff.filter(member => member.role === 'cashier')

  const handleProfileSave = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const res = await axios.put(`${API_URL}/auth/me`, {
        ...profile,
        default_refill_rate: numberOrZero(profile.default_refill_rate),
      })
      setUser(prev => prev ? {
        ...prev,
        shop_name: res.data.shop_name,
        name: res.data.owner_name,
        default_refill_rate: res.data.default_refill_rate,
      } : prev)
      showSuccess('Shop settings updated successfully.')
      loadSettings()
    } catch (err) {
      showError(getRequestErrorMessage(err, 'Unable to save settings right now.'))
    }
    setSavingProfile(false)
  }

  const handleOwnerPasswordSave = async (e) => {
    e.preventDefault()
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      return showError('New password and confirm password must match.', 'Password Mismatch')
    }
    setSavingPassword(true)
    try {
      await axios.put(`${API_URL}/auth/me`, {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      })
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
      showSuccess('Owner password updated successfully.')
    } catch (err) {
      showError(getRequestErrorMessage(err, 'Unable to update password right now.'))
    }
    setSavingPassword(false)
  }

  const saveRider = async (e) => {
    e.preventDefault()
    try {
      if (editingRiderId) {
        await axios.put(`${API_URL}/staff/${editingRiderId}`, { ...riderForm, role: 'rider' })
      } else {
        await axios.post(`${API_URL}/staff`, { ...riderForm, role: 'rider' })
      }
      setRiderForm(emptyRider)
      setEditingRiderId(null)
      loadStaff()
    } catch (err) {
      showError(getRequestErrorMessage(err, 'Unable to save rider.'))
    }
  }

  const saveCashier = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...cashierForm, role: 'cashier' }
      if (editingCashierId && !payload.password) {
        delete payload.password
      }
      if (editingCashierId) {
        await axios.put(`${API_URL}/staff/${editingCashierId}`, payload)
      } else {
        await axios.post(`${API_URL}/staff`, payload)
      }
      setCashierForm(emptyCashier)
      setEditingCashierId(null)
      loadStaff()
    } catch (err) {
      showError(getRequestErrorMessage(err, 'Unable to save cashier.'))
    }
  }

  const startEditRider = (member) => {
    setEditingRiderId(member.id)
    setRiderForm({
      name: member.name || '',
      is_active: Boolean(member.is_active),
    })
  }

  const startEditCashier = (member) => {
    setEditingCashierId(member.id)
    setCashierForm({
      name: member.name || '',
      phone: member.phone || '',
      password: '',
      is_active: Boolean(member.is_active),
    })
  }

  const deleteStaff = (id, label) => {
    setDialog({
      open: true,
      type: 'confirm',
      title: `Delete ${label}?`,
      message: `This will permanently remove this ${label} record.`,
      onCancel: () => setDialog(prev => ({ ...prev, open: false })),
      onConfirm: async () => {
        setDialog(prev => ({ ...prev, open: false }))
        try {
          await axios.delete(`${API_URL}/staff/${id}`)
          loadStaff()
          showSuccess(`${label[0].toUpperCase()}${label.slice(1)} deleted.`)
        } catch (err) {
          showError(getRequestErrorMessage(err, `Unable to delete ${label}.`))
        }
      },
    })
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Settings size={24} /> Settings & Team
        </h1>
        <p className="text-gray-500">Manage profile, refill defaults, riders, cashier accounts, and passwords in one place.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Store size={20} className="text-primary" />
            <h2 className="text-lg font-semibold">{petMode ? 'Shop Profile' : 'Shop Profile & Delivery Defaults'}</h2>
          </div>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Shop Name</label>
              <input type="text" value={profile.shop_name} onChange={e => setProfile({ ...profile, shop_name: e.target.value })} className="input" required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Owner Name</label>
                <input type="text" value={profile.owner_name} onChange={e => setProfile({ ...profile, owner_name: e.target.value })} className="input" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input type="text" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} className="input" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Address</label>
              <textarea value={profile.address} onChange={e => setProfile({ ...profile, address: e.target.value })} className="input" rows={3} />
            </div>
            {!petMode && (
              <div>
                <label className="block text-sm font-medium mb-1">Default Refill Rate per Bottle</label>
                <input type="number" min="1" value={profile.default_refill_rate} onChange={e => setProfile({ ...profile, default_refill_rate: numberOrEmpty(e.target.value) })} className="input" required />
                <p className="text-xs text-gray-500 mt-1">This default rate is auto-filled for walk-in refills.</p>
              </div>
            )}
            <button type="submit" disabled={savingProfile} className="btn btn-primary inline-flex items-center gap-2">
              <Save size={18} /> {savingProfile ? 'Saving...' : 'Save Settings'}
            </button>
          </form>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <KeyRound size={20} className="text-primary" />
            <h2 className="text-lg font-semibold">Owner Password</h2>
          </div>
          <form onSubmit={handleOwnerPasswordSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Current Password</label>
              <input type="password" value={passwordForm.current_password} onChange={e => setPasswordForm({ ...passwordForm, current_password: e.target.value })} className="input" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">New Password</label>
              <input type="password" value={passwordForm.new_password} onChange={e => setPasswordForm({ ...passwordForm, new_password: e.target.value })} className="input" minLength={6} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Confirm New Password</label>
              <input type="password" value={passwordForm.confirm_password} onChange={e => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })} className="input" minLength={6} required />
            </div>
            <button type="submit" disabled={savingPassword} className="btn btn-secondary inline-flex items-center gap-2">
              <KeyRound size={18} /> {savingPassword ? 'Updating...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bike size={20} className="text-primary" />
            <h2 className="text-lg font-semibold">Rider Names</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">Rider accounts do not need login access. Add rider names for delivery assignment only.</p>
          <form onSubmit={saveRider} className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1">Rider Name</label>
              <input type="text" value={riderForm.name} onChange={e => setRiderForm({ ...riderForm, name: e.target.value })} className="input" required />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={riderForm.is_active} onChange={e => setRiderForm({ ...riderForm, is_active: e.target.checked })} />
              Active rider
            </label>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary inline-flex items-center gap-2">
                <Plus size={18} /> {editingRiderId ? 'Update Rider' : 'Add Rider'}
              </button>
              {editingRiderId && (
                <button type="button" className="btn btn-secondary" onClick={() => { setEditingRiderId(null); setRiderForm(emptyRider) }}>
                  Cancel
                </button>
              )}
            </div>
          </form>
          <div className="space-y-3">
            {staffLoading ? (
              <p className="text-sm text-gray-400">Loading riders...</p>
            ) : riders.length === 0 ? (
              <p className="text-sm text-gray-400">No rider added yet.</p>
            ) : riders.map(member => (
              <div key={member.id} className="border rounded-lg p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-xs text-gray-500">{member.is_active ? 'Active for delivery selection' : 'Hidden from delivery selection'}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => startEditRider(member)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Edit size={18} />
                  </button>
                  <button type="button" onClick={() => deleteStaff(member.id, 'rider')} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <UserCog size={20} className="text-primary" />
            <h2 className="text-lg font-semibold">Cashier Accounts</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">Create and manage cashier accounts with phone and password.</p>
          <form onSubmit={saveCashier} className="space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Cashier Name</label>
                <input type="text" value={cashierForm.name} onChange={e => setCashierForm({ ...cashierForm, name: e.target.value })} className="input" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone / Login ID</label>
                <input type="text" value={cashierForm.phone} onChange={e => setCashierForm({ ...cashierForm, phone: e.target.value })} className="input" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{editingCashierId ? 'New Password (leave blank to keep same)' : 'Password'}</label>
              <input type="password" value={cashierForm.password} onChange={e => setCashierForm({ ...cashierForm, password: e.target.value })} className="input" required={!editingCashierId} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={cashierForm.is_active} onChange={e => setCashierForm({ ...cashierForm, is_active: e.target.checked })} />
              Active cashier account
            </label>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary inline-flex items-center gap-2">
                <Plus size={18} /> {editingCashierId ? 'Update Cashier' : 'Add Cashier'}
              </button>
              {editingCashierId && (
                <button type="button" className="btn btn-secondary" onClick={() => { setEditingCashierId(null); setCashierForm(emptyCashier) }}>
                  Cancel
                </button>
              )}
            </div>
          </form>
          <div className="space-y-3">
            {staffLoading ? (
              <p className="text-sm text-gray-400">Loading cashiers...</p>
            ) : cashiers.length === 0 ? (
              <p className="text-sm text-gray-400">No cashier account added yet.</p>
            ) : cashiers.map(member => (
              <div key={member.id} className="border rounded-lg p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-sm text-gray-500">{member.phone}</p>
                  <p className="text-xs text-gray-500">{member.is_active ? 'Login enabled' : 'Login disabled'}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => startEditCashier(member)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Edit size={18} />
                  </button>
                  <button type="button" onClick={() => deleteStaff(member.id, 'cashier')} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-4 bg-gray-50 border border-gray-200">
        <p className="text-sm text-gray-600">
          Current shop: <span className="font-medium text-gray-800">{user?.shop_name}</span>
        </p>
      </div>
      <CenterDialog
        open={dialog.open}
        type={dialog.type}
        title={dialog.title}
        message={dialog.message}
        onConfirm={dialog.onConfirm}
        onCancel={dialog.onCancel}
      />
    </div>
  )
}
