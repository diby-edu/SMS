'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import AdminSidebar from './AdminSidebar'

const PAGE_TITLES: Record<string, string> = {
  '/admin': 'Tableau de bord',
  '/admin/clients': 'Gestion des clients',
  '/admin/senders': 'Validation des Senders',
  '/admin/transactions': 'Transactions',
  '/admin/config': 'Configuration',
}

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  const pageTitle = Object.entries(PAGE_TITLES).find(([key]) =>
    pathname === key || (key !== '/admin' && pathname.startsWith(key))
  )?.[1] ?? 'Admin'

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        {/* Header admin */}
        <header className="h-16 bg-surface border-b border-border flex items-center gap-4 px-4 md:px-6 shrink-0 sticky top-0 z-20">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-foreground-subtle hover:text-foreground p-1.5 rounded-lg hover:bg-border"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="font-syne font-semibold text-base text-foreground flex-1 truncate">
            {pageTitle}
          </h1>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
