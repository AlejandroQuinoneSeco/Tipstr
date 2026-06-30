'use client'

import { useMemo, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calculateBreakdown } from '@/lib/scoring'
import { cn } from '@/lib/utils'
import type { PoolMember, Prediction, Result, AwardPrediction, AwardResult, SpainPrediction, SpainResult, Match } from '@/types'

interface RankingTableProps {
  poolId: string
  members: (PoolMember & { username: string })[]
  predictions: Prediction[]
  results: Result[]
  awardPredictions: AwardPrediction[]
  awardResults: AwardResult[]
  spainPredictions: SpainPrediction[]
  spainResults: SpainResult[]
  matches: Match[]
  currentUserId: string
}

export function RankingTable({
  poolId,
  members,
  predictions,
  results: initialResults,
  awardPredictions,
  awardResults: initialAwardResults,
  spainPredictions,
  spainResults: initialSpainResults,
  matches,
  currentUserId,
}: RankingTableProps) {
  const supabase = createClient()
  const [results, setResults] = useState(initialResults)
  const [awardResults, setAwardResults] = useState(initialAwardResults)
  const [spainResults, setSpainResults] = useState(initialSpainResults)

  useEffect(() => {
    const channel = supabase
      .channel(`ranking-${poolId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'results', filter: `pool_id=eq.${poolId}` },
        (payload) => {
          setResults(prev => {
            const filtered = prev.filter(r => r.id !== (payload.new as Result)?.id)
            return payload.eventType === 'DELETE' ? filtered : [...filtered, payload.new as Result]
          })
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'global_award_results' },
        (payload) => {
          setAwardResults(prev => {
            const filtered = prev.filter(r => r.id !== (payload.new as AwardResult)?.id)
            return payload.eventType === 'DELETE' ? filtered : [...filtered, payload.new as AwardResult]
          })
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'global_spain_results' },
        (payload) => {
          setSpainResults(prev => {
            const filtered = prev.filter(r => r.id !== (payload.new as SpainResult)?.id)
            return payload.eventType === 'DELETE' ? filtered : [...filtered, payload.new as SpainResult]
          })
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, poolId])

  const resultsMap = useMemo(() => new Map(results.map(r => [r.match_id, r])), [results])

  const ranking = useMemo(() => {
    return members
      .map(member => {
        const userPreds = predictions.filter(p => p.user_id === member.user_id)
        const userAwardPreds = awardPredictions.filter(p => p.user_id === member.user_id)
        const userSpainPreds = spainPredictions.filter(p => p.user_id === member.user_id)

        const breakdown = calculateBreakdown(
          userPreds, resultsMap, matches,
          userAwardPreds, awardResults,
          userSpainPreds, spainResults
        )

        return { member, ...breakdown }
      })
      .sort((a, b) => b.total - a.total)
  }, [members, predictions, awardPredictions, spainPredictions, resultsMap, matches, awardResults, spainResults])

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="font-black text-lg tracking-wide text-gold mb-4">🏆 CLASIFICACIÓN</h2>

        {ranking.length === 0 ? (
          <p className="text-muted text-sm">Sin jugadores aún.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-xs text-muted uppercase tracking-wide">
                <th className="text-left pb-2">#</th>
                <th className="text-left pb-2">Jugador</th>
                <th className="text-right pb-2">Partidos</th>
                <th className="text-right pb-2">🇪🇸</th>
                <th className="text-right pb-2">Premios</th>
                <th className="text-right pb-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((entry, i) => {
                const isMe = entry.member.user_id === currentUserId
                const isLocked = entry.member.locked_matches && entry.member.locked_spain && entry.member.locked_awards
                return (
                  <tr key={entry.member.id} className={cn('border-b border-surface-2 text-sm', isMe && 'bg-gold/5')}>
                    <td className="py-2.5 pr-2 text-lg">
                      {medals[i] ?? <span className="text-muted font-bold">{i + 1}</span>}
                    </td>
                    <td className="py-2.5">
                      <div className="font-bold flex items-center gap-1.5 flex-wrap">
                        {entry.member.username}
                        {entry.member.role === 'admin' && <span className="badge badge-admin">ADMIN</span>}
                        {isMe && <span className="text-muted text-xs">(tú)</span>}
                        {isLocked && <span className="text-xs">🔒</span>}
                      </div>
                    </td>
                    <td className="py-2.5 text-right text-muted text-xs">{entry.matchPoints}pts</td>
                    <td className="py-2.5 text-right text-muted text-xs">{entry.spainPoints}pts</td>
                    <td className="py-2.5 text-right text-muted text-xs">{entry.awardPoints}pts</td>
                    <td className="py-2.5 text-right font-black text-xl text-gold">{entry.total}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h3 className="font-bold text-sm text-gold mb-3">Sistema de puntos</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            ['3 / 1pts', 'Grupos exacto/ganador'],
            ['5 / 2pts', '32avos y Octavos'],
            ['6 / 3pts', 'Cuartos de final'],
            ['8 / 4pts', 'Semifinales'],
            ['10 / 5pts', 'Gran Final'],
            ['12pts', 'Campeón del Mundial'],
            ['10pts', 'Balón/Bota Oro/Plata/Bronce'],
            ['10pts', '1er Goleador España'],
          ].map(([pts, label]) => (
            <div key={label} className="flex gap-2 items-start">
              <span className="font-bold text-gold min-w-[60px] shrink-0">{pts}</span>
              <span className="text-muted">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
