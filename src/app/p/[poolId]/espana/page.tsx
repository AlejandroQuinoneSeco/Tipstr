import { createClient } from '@/lib/supabase/server'
import { SpainPredictionsView } from '@/components/spain/spain-predictions-view'

export default async function EspanaPage({
  params,
}: {
  params: Promise<{ poolId: string }>
}) {
  const { poolId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [predsRes, resultsRes, squadRes, membershipRes] = await Promise.all([
    supabase.from('spain_predictions').select('*').eq('pool_id', poolId).eq('user_id', user!.id),
    supabase.from('global_spain_results').select('*'),
    supabase.from('pool_spain_squad').select('*').eq('pool_id', poolId).order('name'),
    supabase.from('pool_members').select('*').eq('pool_id', poolId).eq('user_id', user!.id).single(),
  ])

  return (
    <SpainPredictionsView
      poolId={poolId}
      predictions={predsRes.data ?? []}
      results={resultsRes.data ?? []}
      squad={(squadRes.data ?? []).map(p => p.name)}
      membership={membershipRes.data!}
    />
  )
}
