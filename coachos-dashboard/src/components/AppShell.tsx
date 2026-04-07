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

  if (pathname === '/login') {
    return <>{children}</>
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
