'use client'

import { usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default function AppShell({
  children,
  userEmail,
}: Readonly<{
  children: React.ReactNode
  userEmail: string | null
}>) {
  const pathname = usePathname()
  const isPublicRoute = pathname === '/login' || pathname.startsWith('/check-in/')
  const isClientRoute = pathname.startsWith('/client/')

  if (isPublicRoute) {
    return <>{children}</>
  }

  if (isClientRoute) {
    return (
      <main
        style={{
          minHeight: '100vh',
          overflowY: 'auto',
          background: '#f4f1ea',
        }}
      >
        {children}
      </main>
    )
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar userEmail={userEmail} />
      <main
        style={{
          marginLeft: '200px',
          flex: 1,
          overflowY: 'auto',
          background: '#f9fafb',
          minHeight: '100vh',
        }}
      >
        {children}
      </main>
    </div>
  )
}
