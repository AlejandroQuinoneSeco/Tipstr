'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PHASE_INFO, PHASE_ORDER, GROUPS } from '@/lib/data/matches'
import { Flag } from '@/components/ui/flag'
import { cn } from '@/lib/utils'
import type { Match, Result, Prediction, PoolMember, PoolMatchTeams } from '@/types'

interface OpenPhase { phase: string; is_open: boolean }

interface MatchesListProps {
  poolId: string
  matches: Match[]
  results: Result[]
  predictions: Prediction[]
  openPhases: OpenPhase[]
  membership: PoolMember
  matchTeams: PoolMatchTeams[]
}

function scoreMatch(
  pred: { home_score: number; away_score: number } | undefined,
  result: { home_score: number; away_score: number } | undefined,
  match: { pts_exact: number; pts_winner: number }
): number | null {
  if (!pred || !result) return null
  const { home_score: ph, away_score: pa } = pred
  const { home_score: rh, away_score: ra } = result
  if (ph === rh && pa === ra) return match.pts_exact
  if (Math.sign(ph - pa) === Math.sign(rh - ra)) return match.pts_winner
  return 0
}

export function MatchesList({
  poolId,
  matches,
  results: initialResults,
  predictions: initialPredictions,
  openPhases: initialOpenPhases,
  membership,
  matchTeams: initialMatchTeams,
}: MatchesListProps) {
  const [results, setResults] = useState<Result[]>(initialResults)
  const [predictions, setPredictions] = useState<Prediction[]>(initialPredictions)
  const [openPhases, setOpenPhases] = useState<OpenPhase[]>(initialOpenPhases)
  const [matchTeams, setMatchTeams] = useState<PoolMatchTeams[]>(initialMatchTeams)
  const [phase, setPhase] = useState<string>('grupos')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const supabase = createClient()

  const [localLocked, setLocalLocked] = useState(membership.locked_matches)
  const isLocked = localLocked
  const isAdmin = membership.role === 'admin'

  useEffect(() => {
    const channel = supabase
      .channel(`matches-${poolId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'results', filter: `pool_id=eq.${poolId}` },
        (payload) => {
          setResults(prev => {
            const filtered = prev.filter(r => r.id !== (payload.new as Result)?.id)
            return payload.eventType === 'DELETE' ? filtered : [...filtered, payload.new as Result]
          })
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pool_open_phases', filter: `pool_id=eq.${poolId}` },
        (payload) => {
          setOpenPhases(prev => prev.map(op =>
            op.phase === (payload.new as OpenPhase).phase ? payload.new as OpenPhase : op
          ))
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pool_match_teams', filter: `pool_id=eq.${poolId}` },
        (payload) => {
          setMatchTeams(prev => {
            const filtered = prev.filter(mt => mt.id !== (payload.new as PoolMatchTeams)?.id)
            return payload.eventType === 'DELETE' ? filtered : [...filtered, payload.new as PoolMatchTeams]
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, poolId])

  const isPhaseOpen = (p: string) => p === 'grupos' || (openPhases.find(op => op.phase === p)?.is_open ?? false)
  const getPred = (matchId: string) => predictions.find(p => p.match_id === matchId)
  const getResult = (matchId: string) => results.find(r => r.match_id === matchId)
  const getRealTeams = (matchId: string) => matchTeams.find(mt => mt.match_id === matchId)

  const handlePrediction = useCallback(async (matchId: string, side: 'home_score' | 'away_score', value: string) => {
    if (isLocked) return
    const num = value === '' ? 0 : Math.min(30, Math.max(0, parseInt(value) || 0))
    const existing = predictions.find(p => p.match_id === matchId)
    const homeScore = side === 'home_score' ? num : (existing?.home_score ?? 0)
    const awayScore = side === 'away_score' ? num : (existing?.away_score ?? 0)
    const updated = existing
      ? { ...existing, home_score: homeScore, away_score: awayScore }
      : { match_id: matchId, pool_id: poolId, user_id: membership.user_id, home_score: homeScore, away_score: awayScore }

    setPredictions(prev => [...prev.filter(p => p.match_id !== matchId), updated as Prediction])

    await supabase.from('predictions').upsert({
      pool_id: poolId,
      user_id: membership.user_id,
      match_id: matchId,
      home_score: homeScore,
      away_score: awayScore,
    }, { onConflict: 'pool_id,user_id,match_id' })
  }, [isLocked, predictions, poolId, membership.user_id, supabase])

  const handleLock = async () => {
    setSaving(true)
    await supabase
      .from('pool_members')
      .update({ locked_matches: true })
      .eq('pool_id', poolId)
      .eq('user_id', membership.user_id)
    setSaving(false)
    setLocalLocked(true)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const visibleMatches = phase === 'grupos'
    ? matches.filter(m => m.phase === 'grupos')
    : matches.filter(m => phase === 'semis' ? (m.phase === 'semis' || m.phase === '3er') : m.phase === phase)

  const phaseInfo = PHASE_INFO[phase]
  const phaseTabs = PHASE_ORDER.filter(p => p !== '3er')

  return (
    <div className="space-y-4">
      {isLocked ? (
        <div className="bg-blue-900/30 border border-blue-700 rounded-xl px-4 py-3 text-sm">
          🔒 Partidos bloqueados · Ve a <strong>Ver</strong> para ver las predicciones de tus amigos
        </div>
      ) : (
        <div className="bg-amber-900/30 border border-amber-700 rounded-xl px-4 py-3 text-sm text-amber-200">
          ⚠️ Al guardar, tus predicciones quedarán <strong>bloqueadas definitivamente</strong>
        </div>
      )}

      {isAdmin && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl px-4 py-2 text-xs text-red-300 font-bold uppercase tracking-wide">
          Admin — Los resultados se actualizan automáticamente via API
        </div>
      )}

      <div className="flex gap-1.5 flex-wrap">
        {phaseTabs.map((key) => {
          const open = isPhaseOpen(key)
          const label = PHASE_INFO[key]?.label ?? key
          return (
            <button
              key={key}
              onClick={() => open && setPhase(key)}
              disabled={!open}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-bold transition-all',
                phase === key
                  ? 'bg-gold text-background'
                  : open
                    ? 'border border-border text-muted hover:border-gold hover:text-gold'
                    : 'border border-border text-border cursor-not-allowed opacity-50'
              )}
            >
              {label} {!open && '🔒'}
            </button>
          )
        })}
      </div>

      {phase !== 'grupos' && phaseInfo && (
        <div className="text-center text-xs text-muted">
          Exacto = <span className="text-gold font-bold">{phaseInfo.ptsExact}pts</span>
          {' · '}
          Ganador = <span className="text-gold font-bold">{phaseInfo.ptsWinner}pts</span>
        </div>
      )}

      {phase === 'grupos'
        ? Object.keys(GROUPS).map(g => {
            const groupMatches = visibleMatches.filter(m => m.group_name === g)
            if (!groupMatches.length) return null
            return (
              <div key={g}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-black text-gold text-lg tracking-widest">GRUPO {g}</span>
                  {g === 'H' && <span className="text-xs text-[#c60b1e] font-bold">🇪🇸 España</span>}
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="space-y-2">
                  {groupMatches.map(m => (
                    <MatchCard
                      key={m.id}
                      match={m}
                      realTeams={getRealTeams(m.id)}
                      pred={getPred(m.id)}
                      result={getResult(m.id)}
                      isLocked={isLocked}
                      onPred={handlePrediction}
                    />
                  ))}
                </div>
              </div>
            )
          })
        : (
          <div className="space-y-2">
            {visibleMatches.map(m => (
              <MatchCard
                key={m.id}
                match={m}
                realTeams={getRealTeams(m.id)}
                pred={getPred(m.id)}
                result={getResult(m.id)}
                isLocked={isLocked}
                onPred={handlePrediction}
              />
            ))}
          </div>
        )
      }

      {!isLocked && (
        <div className="fixed bottom-16 left-0 right-0 z-30 bg-surface-2 border-t border-gold px-4 py-3 shadow-2xl">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-amber-200">
              {saved ? '✓ Guardado y bloqueado para siempre' : '⚠️ Guardar bloqueará definitivamente'}
            </span>
            <button onClick={handleLock} disabled={saving} className="btn-primary text-sm disabled:opacity-50">
              {saving ? 'Guardando...' : '🔒 Guardar y bloquear'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Match Card ───────────────────────────────────────────────────────────────

interface MatchCardProps {
  match: Match
  realTeams?: PoolMatchTeams
  pred?: Prediction
  result?: Result
  isLocked: boolean
  onPred: (id: string, side: 'home_score' | 'away_score', v: string) => void
}

function MatchCard({ match, realTeams, pred, result, isLocked, onPred }: MatchCardProps) {
  const hasResult = !!result
  const hasPred = !!pred
  const pts = hasPred && hasResult ? scoreMatch(pred, result, match) : null
  const displayHome = realTeams?.real_home || match.home
  const displayAway = realTeams?.real_away || match.away
  const isSpain = displayHome === 'España' || displayAway === 'España'
  const isKO = match.phase !== 'grupos'

  const cardClass = cn(
    'bg-surface-2 border rounded-xl p-3 transition-colors',
    isSpain && 'border-l-2 border-l-[#c60b1e] border-border',
    pts !== null && pts === match.pts_exact && 'border-green-700 bg-green-950/30',
    pts !== null && pts > 0 && pts < match.pts_exact && 'border-amber-700 bg-amber-950/20',
    !isSpain && pts === null && 'border-border',
  )

  return (
    <div className={cardClass}>
      <div className="text-center text-xs text-muted mb-2 flex items-center justify-center gap-2">
        <span>{match.date}</span>
        {isKO && (
          <span className="text-[10px] bg-gold/10 text-gold px-1.5 py-0.5 rounded-full">
            Exacto {match.pts_exact}pts · Ganador {match.pts_winner}pts
          </span>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex items-center gap-1.5 font-semibold text-sm overflow-hidden">
          <Flag team={displayHome} />
          <span className="truncate">{displayHome}</span>
        </div>

        <div className="flex flex-col items-center gap-1 min-w-[100px]">
          {hasResult && (
            <div className="font-black text-2xl text-gold tracking-widest leading-none">
              {result!.home_score}–{result!.away_score}
              {result!.source === 'api' && <span className="ml-1 text-[9px] text-green-400 font-normal">⚡</span>}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <ScoreInput value={pred?.home_score} disabled={isLocked || hasResult} onChange={(v) => onPred(match.id, 'home_score', v)} />
            <span className="text-muted font-bold text-sm">:</span>
            <ScoreInput value={pred?.away_score} disabled={isLocked || hasResult} onChange={(v) => onPred(match.id, 'away_score', v)} />
          </div>
          {pts !== null && (
            <span className={cn(
              'text-xs font-bold px-2 py-0.5 rounded-full',
              pts === match.pts_exact ? 'bg-green-900 text-green-300' : pts > 0 ? 'bg-amber-900 text-amber-300' : 'bg-red-900 text-red-300'
            )}>
              {pts}pt{pts !== 1 ? 's' : ''}
            </span>
          )}
          {match.phase === 'grupos' && <span className="text-[9px] text-muted">Exacto=3pts · Ganador=1pt</span>}
        </div>

        <div className="flex items-center gap-1.5 font-semibold text-sm overflow-hidden flex-row-reverse">
          <Flag team={displayAway} />
          <span className="truncate text-right">{displayAway}</span>
        </div>
      </div>
    </div>
  )
}

interface ScoreInputProps {
  value?: number
  disabled?: boolean
  onChange: (v: string) => void
  adminStyle?: boolean
}

function ScoreInput({ value, disabled, onChange, adminStyle }: ScoreInputProps) {
  const [localValue, setLocalValue] = useState<string>(value !== undefined ? String(value) : '')

  // Sync from parent only when the prop actually changes externally
  // (e.g. realtime update from another tab), not on every keystroke
  useEffect(() => {
    setLocalValue(value !== undefined ? String(value) : '')
  }, [value])

  return (
    <input
      type="number"
      min={0}
      max={30}
      value={localValue}
      disabled={disabled}
      placeholder="–"
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={(e) => onChange(e.target.value)}
      className={cn(
        'w-9 h-9 text-center rounded-lg font-black text-lg outline-none transition-colors',
        adminStyle
          ? 'bg-red-950 border border-red-800 text-red-300 w-8 h-8 text-sm'
          : 'bg-surface border border-border text-cream focus:border-gold disabled:opacity-35 disabled:cursor-not-allowed'
      )}
    />
  )
}