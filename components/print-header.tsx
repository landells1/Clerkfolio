'use client'

import { useEffect, useState } from 'react'

export function PrintHeader({ userName }: { userName: string }) {
  const [date, setDate] = useState('')

  useEffect(() => {
    setDate(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }))
  }, [])

  return (
    <div className="print-header hidden print:block text-xs text-gray-500 pb-2 mb-4 border-b border-gray-200">
      {userName || 'Clerkfolio user'} - Clerkfolio portfolio - {date}
    </div>
  )
}
