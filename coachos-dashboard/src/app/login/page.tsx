'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    router.replace('/')
    router.refresh()
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f9fafb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '380px',
          background: '#fff',
          border: '0.5px solid #e5e7eb',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 12px 32px rgba(17, 24, 39, 0.06)',
        }}
      >
        <div style={{ marginBottom: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.01em', marginBottom: '6px' }}>
            <span style={{ color: '#111827' }}>Coach</span>
            <span style={{ color: '#7F77DD' }}>OS</span>
          </div>
          <div style={{ fontSize: '13px', color: '#6b7280' }}>
            Sign in to access your coaching dashboard
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label
              htmlFor="email"
              style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#6b7280', marginBottom: '4px' }}
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="coach@coachos.com"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                fontSize: '13px',
                color: '#111827',
                border: '0.5px solid #e5e7eb',
                borderRadius: '8px',
                padding: '10px 12px',
                outline: 'none',
                fontFamily: 'inherit',
                background: '#fff',
              }}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#6b7280', marginBottom: '4px' }}
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              style={{
                width: '100%',
                boxSizing: 'border-box',
                fontSize: '13px',
                color: '#111827',
                border: '0.5px solid #e5e7eb',
                borderRadius: '8px',
                padding: '10px 12px',
                outline: 'none',
                fontFamily: 'inherit',
                background: '#fff',
              }}
            />
          </div>

          {error && (
            <div
              style={{
                fontSize: '12px',
                color: '#A32D2D',
                background: '#fee2e2',
                border: '0.5px solid #fecaca',
                borderRadius: '8px',
                padding: '8px 10px',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '4px',
              background: loading ? '#d1d5db' : '#7F77DD',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 500,
              padding: '10px 14px',
              borderRadius: '8px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
