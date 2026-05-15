import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Intensity = 'mild' | 'moderate' | 'severe'
export type Outcome = 'resolved' | 'reduced' | 'no_change' | 'got_worse'

export interface Episode {
  id: string
  user_id: string
  date: string       // YYYY-MM-DD
  time: string       // HH:MM:SS
  intensity: Intensity
  medication_taken: boolean
  outcome: Outcome
  triggers: string[]
  notes: string | null
  created_at: string
}

export const TRIGGERS = [
  { value: 'stress',       label: 'Stress',       emoji: '😤' },
  { value: 'poor_sleep',   label: 'Poor sleep',   emoji: '😴' },
  { value: 'dehydration',  label: 'Dehydration',  emoji: '💧' },
  { value: 'bright_light', label: 'Bright light', emoji: '☀️' },
  { value: 'screen_time',  label: 'Screen time',  emoji: '💻' },
  { value: 'weather',      label: 'Weather',      emoji: '🌦️' },
  { value: 'food',         label: 'Food / drink', emoji: '🍔' },
  { value: 'hormones',     label: 'Hormones',     emoji: '🔄' },
  { value: 'exercise',     label: 'Exercise',     emoji: '🏃' },
  { value: 'noise',        label: 'Noise',        emoji: '🔊' },
] as const
