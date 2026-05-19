'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function StaffPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/settings')
  }, [router])

  return <div className="text-sm text-gray-500">Redirecting to settings...</div>
}
