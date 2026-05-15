import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isFuture,
  isToday,
  parseISO,
  addMonths,
  subMonths,
} from 'date-fns'
import type { Episode, Intensity } from '../lib/supabase'
import { TRIGGERS } from '../lib/supabase'
import DayCell from './DayCell'

const DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function monFirst(d: Date): number {
  return (getDay(d) + 6) % 7
}

function getIntensityForDay(episodes: Episode[], dateStr: string): Intensity | null {
  const dayEps = episodes.filter(e => e.date === dateStr)
  if (!dayEps.length) return null
  const order: Intensity[] = ['severe', 'moderate', 'mild']
  for (const i of order) {
    if (dayEps.some(e => e.intensity === i)) return i
  }
  return null
}

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`
}

const INTENSITY_EMOJI: Record<Intensity, string> = {
  mild: '😐',
  moderate: '😣',
  severe: '🤯',
}

const OUTCOME_LABEL: Record<string, string> = {
  resolved: 'Resolved completely',
  reduced: 'Reduced / improved',
  no_change: 'No change',
  got_worse: 'Got worse',
}

const SETTINGS_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="1.5" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" stroke="currentColor" strokeWidth="1.5" />
  </svg>
)

const TRASH = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6M9 6V4h6v2" />
  </svg>
)

const PENCIL = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

interface CalendarViewProps {
  episodes: Episode[]
  medication: string
  userName: string
  onLogPress: (date?: string) => void
  onSettingsPress: () => void
  onSwitchUser: () => void
  onEdit: (episode: Episode) => void
  onDelete: (id: string) => void
}

export default function CalendarView({ episodes, medication, userName, onLogPress, onSettingsPress, onSwitchUser, onEdit, onDelete }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (!deletingId) return
    const t = setTimeout(() => setDeletingId(null), 3000)
    return () => clearTimeout(t)
  }, [deletingId])
  const [selectedDate, setSelectedDate] = useState<string | null>(format(new Date(), 'yyyy-MM-dd'))

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const leadingEmpty = monFirst(monthStart)
  const cells: (Date | null)[] = [...Array(leadingEmpty).fill(null), ...days]
  while (cells.length % 7 !== 0) cells.push(null)

  const rows: (Date | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))

  const selectedEpisodes = selectedDate
    ? episodes.filter(e => e.date === selectedDate).sort((a, b) => a.time.localeCompare(b.time))
    : []

  return (
    <div className="flex flex-col flex-1 overflow-y-auto pb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-12 pb-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-[#18103A]">Calendar</h1>
          {userName && (
            <button onClick={onSwitchUser} className="flex items-center gap-1.5 w-fit">
              <span className="w-5 h-5 rounded-full bg-[#16A34A] flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                {userName.charAt(0).toUpperCase()}
              </span>
              <span className="text-xs text-[#6B7280]">{userName}</span>
              <span className="text-[10px] text-[#9CA3AF]">· switch</span>
            </button>
          )}
        </div>
        <button
          onClick={onSettingsPress}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-sm text-[#6B7280]"
        >
          {SETTINGS_ICON}
        </button>
      </div>

      <div className="px-4 flex flex-col gap-4">
        {/* Calendar card */}
        <div className="bg-white rounded-3xl p-4">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentMonth(m => subMonths(m, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F0FAF3] text-[#6B7280] text-lg font-medium"
            >
              ‹
            </button>
            <span className="font-semibold text-[#18103A]">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button
              onClick={() => setCurrentMonth(m => addMonths(m, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F0FAF3] text-[#6B7280] text-lg font-medium"
            >
              ›
            </button>
          </div>

          {/* DOW header */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DOW.map(d => (
              <div key={d} className="w-10 h-6 flex items-center justify-center text-[11px] text-[#9CA3AF] font-medium">
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="flex flex-col gap-1">
            {rows.map((row, ri) => (
              <div key={ri} className="grid grid-cols-7 gap-1">
                {row.map((day, ci) => {
                  if (!day) return <div key={ci} className="w-10 h-10" />
                  const dateStr = format(day, 'yyyy-MM-dd')
                  const future = isFuture(day) && !isToday(day)
                  const intensity = !future ? getIntensityForDay(episodes, dateStr) : null
                  return (
                    <DayCell
                      key={ci}
                      day={day.getDate()}
                      intensity={intensity}
                      isFuture={future}
                      isToday={isToday(day)}
                      isSelected={selectedDate === dateStr}
                      onClick={() => {
                        if (!future) setSelectedDate(selectedDate === dateStr ? null : dateStr)
                      }}
                    />
                  )
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 mt-4 justify-center flex-wrap">
            {[
              { label: 'No headache', color: '#16A34A' },
              { label: 'Mild', color: '#CA8A04' },
              { label: 'Moderate', color: '#EA580C' },
              { label: 'Severe', color: '#DC2626' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: l.color }} />
                <span className="text-[11px] text-[#6B7280]">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Day detail */}
        <AnimatePresence>
          {selectedDate && (
            <motion.div
              className="bg-white rounded-3xl p-4 overflow-hidden"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-[#18103A] text-sm">
                  {format(parseISO(selectedDate), 'EEEE, MMM d')}
                </span>
                <span className="text-xs text-[#9CA3AF]">
                  {selectedEpisodes.length === 0
                    ? 'No episodes'
                    : `${selectedEpisodes.length} ${selectedEpisodes.length === 1 ? 'episode' : 'episodes'}`}
                </span>
              </div>

              {selectedEpisodes.length === 0 ? (
                <div className="flex items-center gap-2 py-2">
                  <span className="text-xl">🌿</span>
                  <span className="text-sm text-[#9CA3AF]">No headaches logged — headache-free day!</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {selectedEpisodes.map(ep => (
                    <div key={ep.id} className="bg-[#F9FAFB] rounded-2xl px-4 py-3 flex items-start gap-3">
                      <span className="text-2xl mt-0.5 flex-shrink-0">{INTENSITY_EMOJI[ep.intensity]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[#18103A]">
                          {formatTime(ep.time)} · {ep.intensity.charAt(0).toUpperCase() + ep.intensity.slice(1)}
                        </div>
                        <div className="text-xs text-[#6B7280] mt-0.5">
                          {ep.medication_taken ? `💊 ${medication || 'Medication'} taken` : 'No medication'}
                        </div>
                        <div className="text-xs text-[#6B7280]">
                          {OUTCOME_LABEL[ep.outcome]}
                        </div>
                        {ep.triggers && ep.triggers.length > 0 && (
                          <div className="text-xs text-[#9CA3AF] mt-1">
                            {ep.triggers.map(v => {
                              const t = TRIGGERS.find(tr => tr.value === v)
                              return t ? `${t.emoji} ${t.label}` : v
                            }).join(' · ')}
                          </div>
                        )}
                        {ep.notes && (
                          <div className="text-xs text-[#9CA3AF] italic mt-0.5">"{ep.notes}"</div>
                        )}
                      </div>
                      {deletingId === ep.id ? (
                        <div className="flex items-center gap-1.5 flex-shrink-0 pt-0.5">
                          <button
                            onClick={() => setDeletingId(null)}
                            className="text-xs text-[#9CA3AF] px-2 py-1"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => { onDelete(ep.id); setDeletingId(null) }}
                            className="text-xs text-white bg-red-500 rounded-full px-2.5 py-1 font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-0.5 flex-shrink-0 pt-0.5">
                          <button
                            onClick={() => onEdit(ep)}
                            className="text-[#D1D5DB] hover:text-[#16A34A] p-1 transition-colors"
                          >
                            {PENCIL}
                          </button>
                          <button
                            onClick={() => setDeletingId(ep.id)}
                            className="text-[#D1D5DB] hover:text-red-400 p-1 transition-colors"
                          >
                            {TRASH}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Log button */}
      <div className="px-4 mt-4">
        <button
          onClick={() => onLogPress(selectedDate ?? undefined)}
          className="w-full bg-[#16A34A] text-white font-semibold text-base rounded-full py-4 flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-md"
        >
          <span className="text-xl">+</span>
          {selectedDate ? `Log for ${format(parseISO(selectedDate), 'MMM d')}` : 'Log Headache'}
        </button>
      </div>
    </div>
  )
}
