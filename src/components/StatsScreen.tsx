import { parseISO, startOfWeek, endOfWeek, isWithinInterval, subWeeks, format } from 'date-fns'
import type { Episode, Intensity, Outcome } from '../lib/supabase'
import { TRIGGERS } from '../lib/supabase'

// ── helpers ──────────────────────────────────────────────────────────────────

const OUTCOME_LABEL: Record<Outcome, string> = {
  resolved: 'Resolved completely',
  reduced:  'Reduced / improved',
  no_change: 'No change',
  got_worse: 'Got worse',
}

const ACHIEVEMENTS = [
  { days: 3,  emoji: '🌱', label: '3 days'   },
  { days: 7,  emoji: '🌿', label: '1 week'   },
  { days: 14, emoji: '🌳', label: '2 weeks'  },
  { days: 30, emoji: '🏆', label: '30 days'  },
  { days: 60, emoji: '💎', label: '2 months' },
  { days: 90, emoji: '👑', label: '3 months' },
]

function getWeeklyTrend(episodes: Episode[]) {
  const today = new Date()
  return Array.from({ length: 8 }, (_, i) => {
    const weeksAgo = 7 - i
    const weekStart = startOfWeek(subWeeks(today, weeksAgo), { weekStartsOn: 1 })
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
    const count = episodes.filter(e =>
      isWithinInterval(parseISO(e.date), { start: weekStart, end: weekEnd })
    ).length
    return {
      label: weeksAgo === 0 ? 'Now' : `${weeksAgo}w`,
      sublabel: format(weekStart, 'M/d'),
      count,
      isCurrent: weeksAgo === 0,
    }
  })
}

function getTimeOfDay(episodes: Episode[]) {
  const buckets = [
    { label: 'Night',     emoji: '🌙', range: [0, 5],  count: 0 },
    { label: 'Morning',   emoji: '🌅', range: [6, 11], count: 0 },
    { label: 'Afternoon', emoji: '☀️', range: [12, 17], count: 0 },
    { label: 'Evening',   emoji: '🌆', range: [18, 23], count: 0 },
  ]
  for (const ep of episodes) {
    const h = parseInt(ep.time.split(':')[0])
    for (const b of buckets) {
      if (h >= b.range[0] && h <= b.range[1]) { b.count++; break }
    }
  }
  return buckets
}

function getDayOfWeek(episodes: Episode[]) {
  const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
  const counts = Array(7).fill(0)
  for (const ep of episodes) {
    const dow = (parseISO(ep.date).getDay() + 6) % 7
    counts[dow]++
  }
  return days.map((d, i) => ({ label: d, count: counts[i] }))
}

function getIntensityDist(episodes: Episode[]) {
  const counts: Record<Intensity, number> = { mild: 0, moderate: 0, severe: 0 }
  for (const ep of episodes) counts[ep.intensity]++
  const total = episodes.length || 1
  return [
    { label: 'Mild',     count: counts.mild,     pct: Math.round(counts.mild     / total * 100), color: '#CA8A04' },
    { label: 'Moderate', count: counts.moderate, pct: Math.round(counts.moderate / total * 100), color: '#EA580C' },
    { label: 'Severe',   count: counts.severe,   pct: Math.round(counts.severe   / total * 100), color: '#DC2626' },
  ]
}

function getOutcomeDist(episodes: Episode[]) {
  const keys: Outcome[] = ['resolved', 'reduced', 'no_change', 'got_worse']
  const counts: Record<Outcome, number> = { resolved: 0, reduced: 0, no_change: 0, got_worse: 0 }
  for (const ep of episodes) counts[ep.outcome]++
  const total = episodes.length || 1
  return keys.map(k => ({
    label: OUTCOME_LABEL[k],
    count: counts[k],
    pct: Math.round(counts[k] / total * 100),
  }))
}

function getTopTriggers(episodes: Episode[]) {
  const counts: Record<string, number> = {}
  for (const ep of episodes) {
    for (const t of (ep.triggers ?? [])) {
      counts[t] = (counts[t] ?? 0) + 1
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([value, count]) => {
      const trigger = TRIGGERS.find(t => t.value === value)
      return { value, label: trigger?.label ?? value, emoji: trigger?.emoji ?? '•', count }
    })
}

function downloadCSV(episodes: Episode[], medication: string) {
  const header = 'Date,Time,Intensity,Medication Taken,Medication Name,Outcome,Triggers,Notes'
  const rows = episodes.map(ep => {
    const fields = [
      ep.date,
      ep.time,
      ep.intensity,
      ep.medication_taken ? 'Yes' : 'No',
      ep.medication_taken ? medication : '',
      OUTCOME_LABEL[ep.outcome] ?? ep.outcome,
      (ep.triggers ?? []).join('; '),
      ep.notes ?? '',
    ]
    return fields.map(f => `"${String(f).replace(/"/g, '""')}"`).join(',')
  })
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `headache-tracker-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-widest text-[#9CA3AF] mb-3">
      {children}
    </div>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl p-4 ${className}`}>{children}</div>
  )
}

function HBar({ pct, color = '#16A34A' }: { pct: number; color?: string }) {
  return (
    <div className="flex-1 bg-[#F3F4F6] rounded-full h-2 overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.max(pct, pct > 0 ? 3 : 0)}%`, background: color }}
      />
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

interface StatsScreenProps {
  episodes: Episode[]
  medication: string
  userName: string
  daysSince: number | null
  personalBest: number
  onLogPress: () => void
  onSwitchUser: () => void
}

export default function StatsScreen({ episodes, medication, userName, daysSince, personalBest, onLogPress, onSwitchUser }: StatsScreenProps) {
  const sorted = [...episodes].sort((a, b) => {
    const da = a.date + 'T' + a.time
    const db = b.date + 'T' + b.time
    return db.localeCompare(da)
  })

  const hasData = sorted.length > 0

  const weeklyTrend   = getWeeklyTrend(sorted)
  const trendMax      = Math.max(...weeklyTrend.map(w => w.count), 1)
  const timeOfDay     = getTimeOfDay(sorted)
  const todMax        = Math.max(...timeOfDay.map(t => t.count), 1)
  const dayOfWeek     = getDayOfWeek(sorted)
  const dowMax        = Math.max(...dayOfWeek.map(d => d.count), 1)
  const intensityDist = getIntensityDist(sorted)
  const outcomeDist   = getOutcomeDist(sorted)
  const topTriggers   = getTopTriggers(sorted)
  const trigMax       = topTriggers.length > 0 ? topTriggers[0].count : 1

  const medEpisodes  = sorted.filter(e => e.medication_taken)
  const medEffective = medEpisodes.length > 0
    ? Math.round(medEpisodes.filter(e => e.outcome === 'resolved' || e.outcome === 'reduced').length / medEpisodes.length * 100)
    : null

  return (
    <div className="flex flex-col flex-1 overflow-y-auto pb-4">
      <div className="flex items-center justify-between px-4 pt-12 pb-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-[#18103A]">Stats</h1>
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
      </div>

      <div className="px-4 flex flex-col gap-4">

        {/* ── Achievements ──────────────────────────────── */}
        <Card>
          <SectionLabel>Headache-free milestones</SectionLabel>
          <div className="grid grid-cols-3 gap-2">
            {ACHIEVEMENTS.map(a => {
              const unlocked = personalBest >= a.days
              const active   = daysSince !== null && daysSince >= a.days
              return (
                <div
                  key={a.days}
                  className="flex flex-col items-center gap-1 py-3 rounded-xl"
                  style={{
                    background: active ? '#DCFCE7' : unlocked ? '#F0FDF4' : '#F9FAFB',
                    border: `1.5px solid ${active ? '#16A34A' : unlocked ? '#BBF7D0' : '#F3F4F6'}`,
                  }}
                >
                  <span className="text-2xl" style={{ filter: unlocked ? 'none' : 'grayscale(1) opacity(0.35)' }}>
                    {a.emoji}
                  </span>
                  <span className="text-[10px] font-semibold text-center leading-tight"
                    style={{ color: active ? '#16A34A' : unlocked ? '#15803D' : '#9CA3AF' }}>
                    {a.label}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="text-[10px] text-[#9CA3AF] mt-3 text-center">
            Best streak: <strong>{personalBest}</strong> day{personalBest !== 1 ? 's' : ''} · Current: <strong>{daysSince ?? 0}</strong> day{(daysSince ?? 0) !== 1 ? 's' : ''}
          </p>
        </Card>

        {!hasData ? (
          <div className="flex flex-col items-center justify-center px-8 text-center gap-3 py-10">
            <div className="text-5xl">📊</div>
            <p className="text-sm text-[#6B7280]">Log a few episodes to start seeing patterns here.</p>
          </div>
        ) : (
          <>
            {/* ── Weekly Trend ──────────────────────────── */}
            <Card>
              <SectionLabel>Weekly trend</SectionLabel>
              <div className="flex items-end gap-1" style={{ height: '72px' }}>
                {weeklyTrend.map((w, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5">
                    {w.count > 0 && (
                      <span className="text-[9px] text-[#6B7280] font-medium">{w.count}</span>
                    )}
                    <div
                      className="w-full rounded-t"
                      style={{
                        height: `${Math.max((w.count / trendMax) * 48, w.count > 0 ? 4 : 2)}px`,
                        background: w.isCurrent ? '#16A34A' : '#DCFCE7',
                        minHeight: '2px',
                      }}
                    />
                    <span className="text-[8px] text-[#9CA3AF] mt-0.5">{w.label}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* ── Time of Day ───────────────────────────── */}
            <Card>
              <SectionLabel>Time of day</SectionLabel>
              <div className="flex flex-col gap-2.5">
                {timeOfDay.map(t => (
                  <div key={t.label} className="flex items-center gap-2">
                    <div className="w-24 flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-sm">{t.emoji}</span>
                      <span className="text-xs text-[#6B7280]">{t.label}</span>
                    </div>
                    <HBar pct={todMax > 0 ? (t.count / todMax) * 100 : 0} />
                    <span className="w-5 text-xs text-right text-[#6B7280]">{t.count}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* ── Day of Week ───────────────────────────── */}
            <Card>
              <SectionLabel>Day of week</SectionLabel>
              <div className="flex items-end gap-1" style={{ height: '64px' }}>
                {dayOfWeek.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5">
                    {d.count > 0 && (
                      <span className="text-[9px] text-[#6B7280]">{d.count}</span>
                    )}
                    <div
                      className="w-full rounded-t"
                      style={{
                        height: `${Math.max((d.count / dowMax) * 40, d.count > 0 ? 4 : 2)}px`,
                        background: d.count > 0 ? '#16A34A' : '#F3F4F6',
                        minHeight: '2px',
                      }}
                    />
                    <span className="text-[9px] text-[#9CA3AF] mt-0.5">{d.label}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* ── Intensity Breakdown ───────────────────── */}
            <Card>
              <SectionLabel>Intensity breakdown</SectionLabel>
              <div className="flex flex-col gap-2.5">
                {intensityDist.map(row => (
                  <div key={row.label} className="flex items-center gap-2">
                    <span className="w-16 text-xs text-[#6B7280] flex-shrink-0">{row.label}</span>
                    <HBar pct={row.pct} color={row.color} />
                    <span className="w-8 text-xs text-right text-[#6B7280]">{row.pct}%</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* ── Outcome Breakdown ─────────────────────── */}
            <Card>
              <SectionLabel>Outcomes</SectionLabel>
              <div className="flex flex-col gap-2.5">
                {outcomeDist.map(row => (
                  <div key={row.label} className="flex items-center gap-2">
                    <span className="w-28 text-xs text-[#6B7280] flex-shrink-0 leading-tight">{row.label}</span>
                    <HBar pct={row.pct} />
                    <span className="w-8 text-xs text-right text-[#6B7280]">{row.pct}%</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* ── Triggers ──────────────────────────────── */}
            {topTriggers.length > 0 && (
              <Card>
                <SectionLabel>Top triggers</SectionLabel>
                <div className="flex flex-col gap-2.5">
                  {topTriggers.map(t => (
                    <div key={t.value} className="flex items-center gap-2">
                      <div className="w-28 flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-sm">{t.emoji}</span>
                        <span className="text-xs text-[#6B7280] truncate">{t.label}</span>
                      </div>
                      <HBar pct={(t.count / trigMax) * 100} />
                      <span className="w-5 text-xs text-right text-[#6B7280]">{t.count}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* ── Medication ────────────────────────────── */}
            {medEffective !== null && (
              <Card>
                <SectionLabel>Medication effectiveness</SectionLabel>
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-3xl font-bold text-[#18103A]">{medEffective}%</div>
                    <div className="text-xs text-[#6B7280] mt-0.5">of episodes resolved or improved</div>
                    <div className="text-xs text-[#9CA3AF] mt-0.5">when taking {medication || 'medication'}</div>
                  </div>
                  <div className="flex-1">
                    <div className="bg-[#F3F4F6] rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${medEffective}%`, background: medEffective >= 70 ? '#16A34A' : medEffective >= 40 ? '#EA580C' : '#DC2626' }}
                      />
                    </div>
                    <div className="text-[9px] text-[#9CA3AF] mt-1">{medEpisodes.length} medicated episode{medEpisodes.length !== 1 ? 's' : ''}</div>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}

        {/* ── Export ────────────────────────────────────── */}
        <Card className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-[#18103A]">Export data</div>
            <div className="text-xs text-[#6B7280] mt-0.5">
              {sorted.length === 0 ? 'No episodes yet' : `${sorted.length} episode${sorted.length === 1 ? '' : 's'}`}
            </div>
          </div>
          <button
            disabled={sorted.length === 0}
            onClick={() => downloadCSV(sorted, medication)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white disabled:opacity-40 active:scale-95 transition-transform"
            style={{ background: '#16A34A' }}
          >
            ↓ CSV
          </button>
        </Card>

      </div>

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
