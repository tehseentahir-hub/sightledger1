'use client'

import { XCircle } from 'lucide-react'

export default function CenterAlert({ open, title = 'Error', message, onClose }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[70] bg-black/40 p-4 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-red-100">
        <div className="p-5">
          <div className="flex items-start gap-3">
            <XCircle className="text-red-600 mt-0.5" size={22} />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
              <p className="text-sm text-slate-600 mt-1">{message || 'Something went wrong.'}</p>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-primary w-full mt-4">OK</button>
        </div>
      </div>
    </div>
  )
}

