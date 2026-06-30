import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminPanel } from '@/components/admin/admin-panel'

export default async function AdminPage({
  params,
}: {
  params: Promise<{ poolId: string }>
}) {
  const { poolId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: membership } = await supabase
    .from('pool_members')
    .select('*')
    .eq('pool_id', poolId)
    .eq('user_id', user.id)
    .single()

  if (!membership || membership.role !== 'admin') {
    redirect(`/p/${poolId}/partidos`)
  }

  const [membersRes, usersRes, openPhasesRes, squadRes, matchesRes, matchTeamsRes] = await Promise.all([
    supabase.from('pool_members').select('*').eq('pool_id', poolId).order('joined_at'),
    supabase.from('users').select('*'),
    supabase.from('pool_open_phases').select('*').eq('pool_id', poolId),
    supabase.from('pool_spain_squad').select('*').eq('pool_id', poolId).order('name'),
    supabase.from('matches').select('*').order('match_number'),
    supabase.from('pool_match_teams').select('*').eq('pool_id', poolId),
  ])

  // Join members with usernames
  const usersMap = new Map((usersRes.data ?? []).map(u => [u.id, u.username]))
  const members = (membersRes.data ?? []).map(m => ({
    ...m,
    username: usersMap.get(m.user_id) ?? 'Desconocido',
  }))

  return (
    <AdminPanel
      poolId={poolId}
      members={members}
      openPhases={openPhasesRes.data ?? []}
      squad={squadRes.data ?? []}
      matches={matchesRes.data ?? []}
      matchTeams={matchTeamsRes.data ?? []}
      currentUserId={user.id}
    />
  )
}
