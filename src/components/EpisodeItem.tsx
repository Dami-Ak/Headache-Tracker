import { useState, useEffect } from 'react'
import type { Episode, Intensity, Outcome } from '../lib/supabase'
import { TRIGGERS } from '../lib/supabase'
import { format, parseISO } from 'date-fns'

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

const OUTCOME_LABEL: Record<Outcome, string> = {
  resolved: 'Resolved',
  reduced: 'Reduced',
  no_change: 'No change',
  got_worse: 'Got worse',
}

const TRASH = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6M9 6V4h6v2" />
  </svg>
)

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`
}

interface EpisodeItemProps {
  episode: Episode
  onDelete?: (id: string) => void
}

export default function EpisodeItem({ episode, onDelete }: EpisodeItemProps) {
  const [confirming, setConfirming] = useState(false)
  const dateLabel = format(parseISO(episode.date), 'MMM d')
  const timeLabel = formatTime(episode.time)

  useEffect(() => {
    if (!confirming) return
    const t = setTimeout(() => setConfirming(false), 3000)
    return () => clearTimeout(t)
  }, [confirming])

  return (
    <div className="bg-white rounded-2xl px-4 py-3 flex items-center gap-3">
      <span className="text-2xl flex-shrink-0">{INTENSITY_EMOJI[episode.intensity]}</span>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-[#18103A]">
          {dateLabel}, {timeLabel}
        </div>
        <div className="text-xs text-[#6B7280] flex items-center gap-1 mt-0.5">
          <span>{OUTCOME_EMOJI[episode.outcome]} {OUTCOME_LABEL[episode.outcome]}</span>
          <span>·</span>
          <span>{episode.medication_taken ? '💊 Medicated' : 'No medication'}</span>
        </div>
        {episode.triggers && episode.triggers.length > 0 && (
          <div className="text-xs text-[#9CA3AF] mt-0.5">
            {episode.triggers.map(v => TRIGGERS.find(t => t.value === v)?.emoji ?? '').filter(Boolean).join(' ')}
          </div>
        )}
      </div>

      {onDelete && (
        confirming ? (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setConfirming(false)}
              className="text-xs text-[#9CA3AF] px-2 py-1"
            >
              Cancel
            </button>
            <button
              onClick={() => onDelete(episode.id)}
              className="text-xs text-white bg-red-500 rounded-full px-2.5 py-1 font-medium"
            >
              Delete
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="flex-shrink-0 text-[#D1D5DB] hover:text-red-400 p-1 transition-colors"
          >
            {TRASH}
          </button>
        )
      )}
    </div>
  )
}
