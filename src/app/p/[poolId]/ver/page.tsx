import { createClient } from '@/lib/supabase/server'
import { VerPredictionsView } from '@/components/ver/ver-predictions-view'

export default async function VerPage({
  params,
}: {
  params: Promise<{ poolId: string }>
}) {
  const { poolId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    membersRes, usersRes, membershipRes,
    matchesRes, resultsRes, predsRes,
    awardResultsRes, awardPredsRes,
    spainResultsRes, spainPredsRes,
    matchTeamsRes,
  ] = await Promise.all([
    supabase.from('pool_members').select('*').eq('pool_id', poolId).eq('status', 'approved'),
    supabase.from('users').select('*'),
    supabase.from('pool_members').select('*').eq('pool_id', poolId).eq('user_id', user!.id).single(),
    supabase.from('matches').select('*').order('match_number'),
    supabase.from('results').select('*').eq('pool_id', poolId),
    supabase.from('predictions').select('*').eq('pool_id', poolId),
    supabase.from('global_award_results').select('*'),
    supabase.from('award_predictions').select('*').eq('pool_id', poolId),
    supabase.from('global_spain_results').select('*'),
    supabase.from('spain_predictions').select('*').eq('pool_id', poolId),
    supabase.from('pool_match_teams').select('*').eq('pool_id', poolId),
  ])

  const usersMap = new Map((usersRes.data ?? []).map(u => [u.id, u.username]))
  const members = (membersRes.data ?? []).map(m => ({ ...m, username: usersMap.get(m.user_id) ?? 'Desconocido' }))

  return (
    <VerPredictionsView
      currentUserId={user!.id}
      currentMembership={membershipRes.data!}
      members={members}
      matches={matchesRes.data ?? []}
      results={resultsRes.data ?? []}
      predictions={predsRes.data ?? []}
      awardResults={awardResultsRes.data ?? []}
      awardPredictions={awardPredsRes.data ?? []}
      spainResults={spainResultsRes.data ?? []}
      spainPredictions={spainPredsRes.data ?? []}
      matchTeams={matchTeamsRes.data ?? []}
    />
  )
}