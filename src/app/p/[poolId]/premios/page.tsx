import { createClient } from '@/lib/supabase/server'
import { AwardsPredictionsView } from '@/components/awards/awards-predictions-view'
import { SPAIN_SQUAD_DEFAULT } from '@/lib/data/matches'

export default async function PremiosPage({
  params,
}: {
  params: Promise<{ poolId: string }>
}) {
  const { poolId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [predsRes, resultsRes, squadRes, membershipRes] = await Promise.all([
    supabase.from('award_predictions').select('*').eq('pool_id', poolId).eq('user_id', user!.id),
    supabase.from('global_award_results').select('*'),
    supabase.from('pool_spain_squad').select('*').eq('pool_id', poolId).order('name'),
    supabase.from('pool_members').select('*').eq('pool_id', poolId).eq('user_id', user!.id).single(),
  ])

  const squadNames = (squadRes.data ?? []).map(p => p.name)

  return (
    <AwardsPredictionsView
      poolId={poolId}
      predictions={predsRes.data ?? []}
      results={resultsRes.data ?? []}
      squad={squadNames.length > 0 ? squadNames : SPAIN_SQUAD_DEFAULT}
      membership={membershipRes.data!}
    />
  )
}
