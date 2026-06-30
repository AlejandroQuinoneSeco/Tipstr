import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GlobalResultsPanel } from '@/components/admin/global-results-panel'

export default async function GlobalAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: isPlatformAdmin } = await supabase
    .from('platform_admins')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (!isPlatformAdmin) redirect('/pools')

  const [awardResultsRes, spainResultsRes] = await Promise.all([
    supabase.from('global_award_results').select('*'),
    supabase.from('global_spain_results').select('*'),
  ])

  return (
    <GlobalResultsPanel
      awardResults={awardResultsRes.data ?? []}
      spainResults={spainResultsRes.data ?? []}
    />
  )
}
