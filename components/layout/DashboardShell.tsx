'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Sidebar from './Sidebar'
import Header from './Header'

interface DashboardShellProps {
  children: React.ReactNode
}

export default function DashboardShell({ children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { update } = useSession()

  // Rafraîchit le solde SMS depuis la DB dès que l'utilisateur revient sur l'onglet
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        update({ refreshSolde: true })
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [update])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar fixe à gauche */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Zone de contenu principale */}
      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
