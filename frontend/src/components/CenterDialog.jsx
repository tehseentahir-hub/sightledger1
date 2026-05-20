'use client'

import { AlertTriangle, CheckCircle2 } from 'lucide-react'

export default function CenterDialog({
  open,
  title = 'Notice',
  message = '',
  type = 'error', // error | success | confirm
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}) {
  if (!open) return null

  const isConfirm = type === 'confirm'
  const isSuccess = type === 'success'

  return (
    <div className="fixed inset-0 z-[80] bg-black/45 p-4 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200">
        <div className="p-5">
          <div className="flex items-start gap-3">
            {isSuccess ? (
              <CheckCircle2 className="text-emerald-600 mt-0.5" size={22} />
            ) : (
              <AlertTriangle className="text-red-600 mt-0.5" size={22} />
            )}
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
              <p className="text-sm text-slate-600 mt-1">{message}</p>
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            {isConfirm && (
              <button onClick={onCancel} className="btn btn-secondary flex-1">
                {cancelText}
              </button>
            )}
            <button
              onClick={onConfirm}
              className={`btn flex-1 ${isSuccess ? 'btn-primary' : isConfirm ? 'btn-primary' : 'btn-primary'}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
