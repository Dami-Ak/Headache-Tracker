import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import type { Stats } from '../hooks/useEpisodes'
import HeroCard from './HeroCard'
import EpisodeItem from './EpisodeItem'
import type { Intensity, Outcome } from '../lib/supabase'

const INTENSITY_EMOJI: Record<Intensity, string> = {
  mild: '😐',
  moderate: '😣',
  severe: '🤯',
}

const OUTCOME_EMOJI: Record<Outcome, string> = {
  resolved: '✅',
  reduced: '📉',
  no_change: '➡️',
  got_worse: '📈',
}

function avgIntensity(episodes: { intensity: Intensity }[]): Intensity | null {
  if (!episodes.length) return null
  const map: Record<Intensity, number> = { mild: 1, moderate: 2, severe: 3 }
  const avg = episodes.reduce((s, e) => s + map[e.intensity], 0) / episodes.length
  if (avg <= 1.5) return 'mild'
  if (avg <= 2.5) return 'moderate'
  return 'severe'
}

function mostCommonOutcome(episodes: { outcome: Outcome }[]): Outcome | null {
  if (!episodes.length) return null
  const counts = {} as Record<Outcome, number>
  for (const e of episodes) counts[e.outcome] = (counts[e.outcome] ?? 0) + 1
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0] as Outcome
}

function achievementFor(days: number): { emoji: string; label: string } | null {
  if (days >= 90) return { emoji: '👑', label: '3 months headache-free!' }
  if (days >= 60) return { emoji: '💎', label: '2 months headache-free!' }
  if (days >= 30) return { emoji: '🏆', label: '30 days headache-free!' }
  if (days >= 14) return { emoji: '🌳', label: '2 weeks headache-free!' }
  if (days >= 7)  return { emoji: '🌿', label: '1 week headache-free!'  }
  if (days >= 3)  return { emoji: '🌱', label: '3 days headache-free!'  }
  return null
}

const SETTINGS_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="1.5" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke="currentColor" strokeWidth="1.5" />
  </svg>
)

interface HomeScreenProps {
  stats: Stats
  loading: boolean
  error: string | null
  medication: string
  onLogPress: () => void
  onSettingsPress: () => void
  onDelete: (id: string) => void
}

function fadeUp(delay: number) {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, type: 'spring' as const, stiffness: 300, damping: 28 },
  }
}

export default function HomeScreen({
  stats,
  loading,
  error,
  medication,
  onLogPress,
  onSettingsPress,
  onDelete,
}: HomeScreenProps) {
  const navigate = useNavigate()
  const today = new Date()
  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
  const weekRange = `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'd')}`

  const medPct = stats.medicationPct
  const avgI = avgIntensity(stats.weeklyEpisodes)
  const topOutcome = mostCommonOutcome(stats.weeklyEpisodes)
  const medRate =
    stats.weeklyEpisodes.length > 0
      ? Math.round(
          (stats.weeklyEpisodes.filter(e => e.medication_taken).length /
            stats.weeklyEpisodes.length) *
            100
        )
      : null

  const achievement = stats.daysSince !== null ? achievementFor(stats.daysSince) : null
  const isNewPersonalBest =
    stats.daysSince !== null &&
    stats.daysSince > 0 &&
    stats.daysSince >= stats.personalBest

  const weekDelta = stats.thisWeekCount - stats.prevWeekCount
  const weekDeltaLabel =
    stats.prevWeekCount === 0 && stats.thisWeekCount === 0
      ? 'episodes logged'
      : weekDelta === 0
      ? 'same as last week'
      : weekDelta < 0
      ? `↓ ${Math.abs(weekDelta)} from last week`
      : `↑ ${weekDelta} from last week`

  return (
    <div className="flex flex-col flex-1 overflow-y-auto pb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-12 pb-4">
        <h1 className="text-xl font-bold text-[#18103A]">Headache Tracker</h1>
        <button
          onClick={onSettingsPress}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-sm text-[#6B7280]"
        >
          {SETTINGS_ICON}
        </button>
      </div>

      <div className="flex flex-col gap-3 px-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-4 py-3 leading-snug">
            <p className="font-semibold mb-0.5">⚠️ Could not load data</p>
            <p>{error.includes('does not exist') || error.includes('relation')
              ? 'Run supabase-schema.sql in your Supabase SQL Editor, then refresh.'
              : 'Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file, then restart the dev server.'
            }</p>
          </div>
        )}

        {/* Hero */}
        <motion.div {...fadeUp(0.05)}>
          <HeroCard daysSince={stats.daysSince} personalBest={stats.personalBest} />
        </motion.div>

        {/* Achievement banner */}
        {achievement && (
          <motion.div {...fadeUp(0.10)}>
            <div
              className="flex items-center gap-3 rounded-2xl px-4 py-3"
              style={{ background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)' }}
            >
              <span className="text-2xl">{achievement.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white">{achievement.label}</div>
                {isNewPersonalBest && (
                  <div className="text-xs text-[#86EFAC]">New personal best 🎉</div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Two stat cards */}
        <motion.div className="flex gap-3" {...fadeUp(achievement ? 0.16 : 0.13)}>
          <div className="flex-1 bg-white rounded-2xl p-4">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[#9CA3AF] mb-1">
              Medication
            </div>
            <div className="text-sm font-semibold text-[#18103A] truncate">{medication || '—'}</div>
            <div className="text-3xl font-bold text-[#18103A] mt-2">
              {medPct !== null ? `${medPct}%` : '—'}
            </div>
            <div className="text-xs text-[#6B7280] mt-0.5">resolved or improved</div>
          </div>

          <div className="flex-1 rounded-2xl p-4" style={{ background: '#16A34A' }}>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[#86EFAC] mb-1">
              This Week
            </div>
            <div className="text-3xl font-bold text-white mt-2">{stats.thisWeekCount}</div>
            <div className="text-xs text-[#86EFAC] mt-0.5">{weekDeltaLabel}</div>
          </div>
        </motion.div>

        {/* Weekly Summary */}
        <motion.div className="bg-white rounded-2xl p-4" {...fadeUp(0.21)}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-[#18103A]">Weekly Summary</span>
            <span className="text-xs text-[#9CA3AF]">{weekRange}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#F9FAFB] rounded-xl p-3">
              <div className="text-xs text-[#6B7280]">Episodes</div>
              <div className="text-lg font-bold text-[#18103A]">{stats.weeklyEpisodes.length}</div>
            </div>
            <div className="bg-[#F9FAFB] rounded-xl p-3">
              <div className="text-xs text-[#6B7280]">Avg intensity</div>
              <div className="text-lg">{avgI ? INTENSITY_EMOJI[avgI] : '—'}</div>
            </div>
            <div className="bg-[#F9FAFB] rounded-xl p-3">
              <div className="text-xs text-[#6B7280]">% medicated</div>
              <div className="text-lg font-bold text-[#18103A]">
                {medRate !== null ? `${medRate}%` : '—'}
              </div>
            </div>
            <div className="bg-[#F9FAFB] rounded-xl p-3">
              <div className="text-xs text-[#6B7280]">Top outcome</div>
              <div className="text-lg">{topOutcome ? OUTCOME_EMOJI[topOutcome] : '—'}</div>
            </div>
          </div>
        </motion.div>

        {/* Recent Episodes */}
        <motion.div {...fadeUp(0.29)}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-[#18103A]">Recent Episodes</span>
            <button
              onClick={() => navigate('/calendar')}
              className="text-xs text-[#16A34A] font-medium"
            >
              See all →
            </button>
          </div>
          {loading ? (
            <div className="bg-white rounded-2xl px-4 py-8 text-center text-sm text-[#9CA3AF]">
              Loading…
            </div>
          ) : stats.recentEpisodes.length === 0 && !error ? (
            <div className="bg-white rounded-2xl px-4 py-8 text-center">
              <div className="text-3xl mb-2">🌿</div>
              <div className="text-sm text-[#6B7280]">
                No episodes yet. Tap <strong>Log Headache</strong> when you get one.
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {stats.recentEpisodes.map(ep => (
                <EpisodeItem key={ep.id} episode={ep} onDelete={onDelete} />
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Log button */}
      <div className="px-4 mt-4">
        <button
          onClick={onLogPress}
          className="w-full bg-[#16A34A] text-white font-semibold text-base rounded-full py-4 flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-md"
        >
          <span className="text-xl">+</span> Log Headache
        </button>
      </div>
    </div>
  )
}
