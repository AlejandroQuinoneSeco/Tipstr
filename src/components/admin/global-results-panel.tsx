'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AWARDS, SPAIN_FIELDS, ALL_TEAMS, SPAIN_SQUAD_DEFAULT } from '@/lib/data/matches'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import type { AwardResult, SpainResult } from '@/types'

interface GlobalResultsPanelProps {
  awardResults: AwardResult[]
  spainResults: SpainResult[]
}

export function GlobalResultsPanel({ awardResults: initialAwards, spainResults: initialSpain }: GlobalResultsPanelProps) {
  const supabase = createClient()
  const router = useRouter()
  const [awardResults, setAwardResults] = useState(initialAwards)
  const [spainResults, setSpainResults] = useState(initialSpain)
  const [tab, setTab] = useState<'awards' | 'spain'>('awards')

  const getAwardValue = (id: string) => awardResults.find(r => r.award_id === id)?.value ?? ''
  const getSpainValue = (id: string) => spainResults.find(r => r.field_id === id)?.value ?? ''

  const handleSetAward = async (awardId: string, value: string) => {
    setAwardResults(prev => [...prev.filter(r => r.award_id !== awardId), { id: awardId, award_id: awardId, value, updated_at: '' }])
    await supabase.from('global_award_results').upsert({ award_id: awardId, value }, { onConflict: 'award_id' })
  }

  const handleSetSpain = async (fieldId: string, value: string) => {
    setSpainResults(prev => [...prev.filter(r => r.field_id !== fieldId), { id: fieldId, field_id: fieldId, value, updated_at: '' }])
    await supabase.from('global_spain_results').upsert({ field_id: fieldId, value }, { onConflict: 'field_id' })
  }

  return (
    <div className="min-h-screen max-w-2xl mx-auto px-4 py-8 pb-16">
      <button onClick={() => router.push('/pools')} className="text-muted hover:text-cream text-sm mb-4 flex items-center gap-1">
        ← Volver a mis porras
      </button>

      <div className="card border-red-900 mb-4">
        <h1 className="font-black text-xl text-red-300 mb-1">🌐 Resultados Globales</h1>
        <p className="text-xs text-muted">
          Estos resultados se aplican automáticamente a <strong className="text-cream">todas las porras</strong> de la plataforma.
          Introdúcelos solo cuando estén confirmados oficialmente por la FIFA.
        </p>
      </div>

      <div className="flex gap-1.5 mb-4">
        <button
          onClick={() => setTab('awards')}
          className={cn('px-4 py-2 rounded-full text-xs font-bold transition-all', tab === 'awards' ? 'bg-gold text-background' : 'border border-border text-muted')}
        >
          🏅 Premios FIFA
        </button>
        <button
          onClick={() => setTab('spain')}
          className={cn('px-4 py-2 rounded-full text-xs font-bold transition-all', tab === 'spain' ? 'bg-gold text-background' : 'border border-border text-muted')}
        >
          🇪🇸 España
        </button>
      </div>

      {tab === 'awards' && (
        <div className="space-y-2">
          {AWARDS.map(award => {
            const options = award.type === 'team' ? ALL_TEAMS : [...SPAIN_SQUAD_DEFAULT]
            const listId = `g-award-${award.id}`
            return (
              <div key={award.id} className="bg-surface-2 border border-border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{award.icon}</span>
                  <span className="font-semibold text-sm flex-1">{award.label}</span>
                  <span className="text-xs text-gold font-bold">+{award.pts}pts</span>
                </div>
                <datalist id={listId}>{options.map(o => <option key={o} value={o} />)}</datalist>
                <input
                  className="input text-sm"
                  list={listId}
                  defaultValue={getAwardValue(award.id)}
                  placeholder="Resultado oficial..."
                  onBlur={(e) => handleSetAward(award.id, e.target.value)}
                />
              </div>
            )
          })}
        </div>
      )}

      {tab === 'spain' && (
        <div className="space-y-2">
          {SPAIN_FIELDS.map(field => {
            const listId = `g-spain-${field.id}`
            return (
              <div key={field.id} className="bg-surface-2 border border-border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-sm flex-1">{field.label}</span>
                  <span className="text-xs text-gold font-bold">+{field.pts}pts</span>
                </div>
                {field.type === 'select' ? (
                  <select
                    className="input text-sm"
                    defaultValue={getSpainValue(field.id)}
                    onChange={(e) => handleSetSpain(field.id, e.target.value)}
                  >
                    <option value="">— Selecciona —</option>
                    {field.options!.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <>
                    {field.type === 'player' && <datalist id={listId}>{SPAIN_SQUAD_DEFAULT.map(o => <option key={o} value={o} />)}</datalist>}
                    <input
                      className="input text-sm"
                      type={field.type === 'number' ? 'number' : 'text'}
                      list={field.type === 'player' ? listId : undefined}
                      defaultValue={getSpainValue(field.id)}
                      placeholder="Resultado oficial..."
                      onBlur={(e) => handleSetSpain(field.id, e.target.value)}
                    />
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
