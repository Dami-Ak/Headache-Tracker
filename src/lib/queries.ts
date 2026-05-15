import { supabase } from './supabase'
import type { Episode } from './supabase'
import { getUserId } from './userId'

export async function fetchAllEpisodes(): Promise<Episode[]> {
  const { data, error } = await supabase
    .from('episodes')
    .select('*')
    .eq('user_id', getUserId())
    .order('date', { ascending: true })
    .order('time', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function insertEpisode(episode: Omit<Episode, 'id' | 'user_id' | 'created_at'>): Promise<Episode> {
  const { data, error } = await supabase
    .from('episodes')
    .insert({ ...episode, user_id: getUserId() })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteEpisode(id: string): Promise<void> {
  const { error } = await supabase
    .from('episodes')
    .delete()
    .eq('id', id)
    .eq('user_id', getUserId())
  if (error) throw error
}
