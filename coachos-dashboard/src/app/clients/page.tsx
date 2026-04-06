'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type ClientStatus = 'active' | 'at_risk' | 'review' | string

type Client = {
  id: string
  full_name: string
  email: string
  status: ClientStatus
  created_at: string
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

const avatarColors = ['#A32D2D', '#0d9488', '#4338ca', '#ec4899', '#7F77DD', '#b45309']

function getStatusConfig(status: ClientStatus) {
  if (status === 'at_risk') return { bg: '#fee2e2', color: '#A32D2D', border: '#A32D2D', label: 'At risk' }
  if (status === 'review') return { bg: '#fef3c7', color: '#BA7517', border: '#BA7517', label: 'Review' }
  return { bg: '#dcfce7', color: '#639922', border: '#639922', label: 'On track' }
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchClients() {
      const { data, error } = await supabase
        .from('clients')
        .select('id, full_name, email, status, created_at')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching clients:', error)
        setError('Failed to load clients.')
      } else {
        setClients(data || [])
      }
      setLoading(false)
    }
    fetchClients()
  }, [])

  return (
    <div style={{ padding: '24px', maxWidth: '900px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '17px', fontWeight: 500, color: '#111827', margin: 0 }}>Clients</h1>
        <p style={{ margin: '2px 0 0', color: '#6b7280', fontSize: '13px' }}>
          {loading ? 'Loading...' : `${clients.length} active clients`}
        </p>
      </div>

      {error && (
        <div style={{
          background: '#fee2e2', color: '#A32D2D', border: '1px solid #fecaca',
          borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '16px',
        }}>
          {error}
        </div>
      )}

      {!loading && !error && clients.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af', fontSize: '14px' }}>
          No clients yet. Convert a lead to get started.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {clients.map((client, i) => {
          const initials = getInitials(client.full_name)
          const avatarColor = avatarColors[i % avatarColors.length]
          const cfg = getStatusConfig(client.status)

          return (
            <Link key={client.id} href={`/clients/${client.id}`} style={{ textDecoration: 'none' }}>
              <div
                style={{
                  background: '#fff',
                  border: '0.5px solid #e5e7eb',
                  borderLeft: `3px solid ${cfg.border}`,
                  borderRadius: '12px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  cursor: 'pointer',
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: avatarColor,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 500,
                    flexShrink: 0,
                  }}
                >
                  {initials}
                </div>

                {/* Name + goal */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>{client.full_name}</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af' }}>{client.email}</div>
                </div>

                {/* Joined date */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '3px' }}>Joined</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {new Date(client.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>

                {/* Status */}
                <span
                  style={{
                    background: cfg.bg,
                    color: cfg.color,
                    fontSize: '10px',
                    fontWeight: 500,
                    padding: '3px 10px',
                    borderRadius: '999px',
                    flexShrink: 0,
                  }}
                >
                  {cfg.label}
                </span>

                <span style={{ color: '#d1d5db', fontSize: '14px' }}>›</span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
