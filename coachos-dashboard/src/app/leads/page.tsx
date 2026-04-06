'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import { supabase } from '@/lib/supabase'

type Lead = {
  id: string
  full_name: string
  email: string
  coach_id: string | null
  heat_score: string | null
  budget_range: string | null
  timeline: string | null
  goal: string | null
  ai_brief: string | null
  created_at: string
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

const avatarColors = ['#A32D2D', '#0d9488', '#4338ca', '#ec4899', '#7F77DD', '#b45309']

function heatStyle(score: string | null) {
  if (score === 'hot') return { bg: '#fee2e2', color: '#A32D2D', label: 'Hot' }
  if (score === 'warm') return { bg: '#fef3c7', color: '#BA7517', label: 'Warm' }
  return { bg: '#e0e7ff', color: '#4338ca', label: 'New' }
}

export default function LeadsPage() {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBrief, setSelectedBrief] = useState<{ name: string; brief: string } | null>(null)
  const [convertingId, setConvertingId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLeads() {
      const { data, error } = await supabase
        .from('leads')
        .select('id, full_name, email, coach_id, heat_score, budget_range, timeline, goal, ai_brief, created_at')
        .order('created_at', { ascending: false })

      if (error) console.error('Error fetching leads:', error)
      else setLeads(data || [])
      setLoading(false)
    }
    fetchLeads()
  }, [])

  function parseBrief(raw: any): string {
    if (!raw) return 'No AI brief available.'
    if (typeof raw === 'object' && raw.brief) return raw.brief
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw)
        return parsed.brief ?? raw
      } catch {
        return raw
      }
    }
    return String(raw)
  }

  async function convertToClient(lead: Lead) {
    setConvertingId(lead.id)
    try {
      const { error: insertError } = await supabase.from('clients').insert({
        full_name: lead.full_name,
        email: lead.email,
        coach_id: lead.coach_id,
        status: 'active',
      })
      if (insertError) throw insertError

      const { error: updateError } = await supabase
        .from('leads')
        .update({ status: 'converted' })
        .eq('id', lead.id)
      if (updateError) throw updateError

      router.push('/clients')
    } catch (err: any) {
      console.error('Error converting lead:', err)
      alert(`Failed to convert lead: ${err.message}`)
    } finally {
      setConvertingId(null)
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '900px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '17px', fontWeight: 500, color: '#111827', margin: 0 }}>Leads</h1>
        <p style={{ margin: '2px 0 0', color: '#6b7280', fontSize: '13px' }}>
          {loading ? 'Loading...' : `${leads.length} leads total`}
        </p>
      </div>

      {!loading && leads.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af', fontSize: '14px' }}>
          No leads yet. Submit your Tally form to see them here.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {leads.map((lead, i) => {
          const initials = getInitials(lead.full_name)
          const avatarColor = avatarColors[i % avatarColors.length]
          const heat = heatStyle(lead.heat_score)

          return (
            <div
              key={lead.id}
              style={{
                background: '#fff',
                border: '0.5px solid #e5e7eb',
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
              }}
            >
              {/* Avatar */}
              <div style={{
                width: '38px', height: '38px', borderRadius: '50%',
                background: avatarColor, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 500, flexShrink: 0,
              }}>
                {initials}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827' }}>{lead.full_name}</span>
                  {lead.ai_brief && (
                    <span style={{
                      fontSize: '10px', fontWeight: 500, color: '#7F77DD',
                      background: '#ede9fe', padding: '2px 6px', borderRadius: '4px',
                    }}>
                      Brief ready
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  {lead.email}{lead.goal ? ` · ${lead.goal}` : ''}
                </div>
              </div>

              {/* Budget + Timeline */}
              <div style={{ fontSize: '12px', color: '#6b7280', flexShrink: 0, textAlign: 'right' }}>
                {lead.budget_range && <div>{lead.budget_range}</div>}
                {lead.timeline && <div style={{ color: '#9ca3af' }}>{lead.timeline}</div>}
              </div>

              {/* Date */}
              <div style={{ fontSize: '12px', color: '#9ca3af', flexShrink: 0 }}>
                {new Date(lead.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>

              {/* Heat badge */}
              <span style={{
                background: heat.bg, color: heat.color,
                fontSize: '10px', fontWeight: 500,
                padding: '3px 10px', borderRadius: '999px', flexShrink: 0,
              }}>
                {heat.label}
              </span>

              {/* Brief button */}
              <button
                onClick={() => setSelectedBrief({
                  name: lead.full_name,
                  brief: parseBrief(lead.ai_brief),
                })}
                style={{
                  background: '#111827', color: '#fff',
                  fontSize: '12px', fontWeight: 500,
                  padding: '6px 12px', borderRadius: '8px',
                  border: 'none', cursor: 'pointer', flexShrink: 0,
                }}
              >
                View Brief
              </button>

              {/* Convert to Client button */}
              <button
                onClick={() => convertToClient(lead)}
                disabled={convertingId === lead.id}
                style={{
                  background: convertingId === lead.id ? '#d1fae5' : '#ecfdf5',
                  color: '#059669',
                  fontSize: '12px', fontWeight: 500,
                  padding: '6px 12px', borderRadius: '8px',
                  border: '1px solid #a7f3d0', cursor: convertingId === lead.id ? 'not-allowed' : 'pointer',
                  flexShrink: 0,
                }}
              >
                {convertingId === lead.id ? 'Converting…' : 'Convert to Client'}
              </button>
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {selectedBrief && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px', maxWidth: '640px', width: '100%',
            maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '20px 24px', borderBottom: '1px solid #f3f4f6',
            }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>
                AI Sales Brief — {selectedBrief.name}
              </h2>
              <button onClick={() => setSelectedBrief(null)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#9ca3af' }}>
                ×
              </button>
            </div>
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#111827', margin: '16px 0 8px' }}>{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#374151', margin: '12px 0 6px' }}>{children}</h3>
                  ),
                  p: ({ children }) => (
                    <p style={{ fontSize: '13px', lineHeight: '1.7', color: '#374151', margin: '0 0 10px' }}>{children}</p>
                  ),
                  strong: ({ children }) => (
                    <strong style={{ fontWeight: 600, color: '#111827' }}>{children}</strong>
                  ),
                  em: ({ children }) => (
                    <em style={{ fontStyle: 'italic', color: '#374151' }}>{children}</em>
                  ),
                  hr: () => (
                    <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '16px 0' }} />
                  ),
                  blockquote: ({ children }) => (
                    <blockquote style={{
                      borderLeft: '3px solid #7F77DD', margin: '12px 0',
                      paddingLeft: '12px', color: '#6b7280', fontStyle: 'italic',
                    }}>{children}</blockquote>
                  ),
                  ul: ({ children }) => (
                    <ul style={{ fontSize: '13px', lineHeight: '1.7', color: '#374151', margin: '0 0 10px', paddingLeft: '18px' }}>{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol style={{ fontSize: '13px', lineHeight: '1.7', color: '#374151', margin: '0 0 10px', paddingLeft: '18px' }}>{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li style={{ marginBottom: '4px' }}>{children}</li>
                  ),
                }}
              >
                {selectedBrief.brief}
              </ReactMarkdown>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedBrief(null)}
                style={{ background: 'none', border: 'none', fontSize: '13px', color: '#6b7280', cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
