import { useState, useEffect, useCallback } from 'react'
import type { Episode } from '../lib/supabase'
import { fetchAllEpisodes } from '../lib/queries'
import {
  differenceInCalendarDays,
  parseISO,
  startOfWeek,
  endOfWeek,
  isWithinInterval,
  subWeeks,
} from 'date-fns'

export interface Stats {
  daysSince: number | null
  personalBest: number
  medicationPct: number | null
  thisWeekCount: number
  prevWeekCount: number
  weeklyEpisodes: Episode[]
  recentEpisodes: Episode[]
  allEpisodes: Episode[]
}

function computeStats(episodes: Episode[]): Stats {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const sorted = [...episodes].sort((a, b) => {
    const da = a.date + 'T' + a.time
    const db = b.date + 'T' + b.time
    return db.localeCompare(da)
  })

  const daysSince =
    sorted.length > 0
      ? differenceInCalendarDays(today, parseISO(sorted[0].date))
      : null

  const uniqueDates = [...new Set(episodes.map(e => e.date))].sort()
  let personalBest = 0
  for (let i = 1; i < uniqueDates.length; i++) {
    const gap = differenceInCalendarDays(parseISO(uniqueDates[i]), parseISO(uniqueDates[i - 1])) - 1
    if (gap > personalBest) personalBest = gap
  }
  if (uniqueDates.length > 0) {
    const gapToToday = differenceInCalendarDays(today, parseISO(uniqueDates[uniqueDates.length - 1]))
    if (gapToToday > personalBest) personalBest = gapToToday
  }

  const medicated = episodes.filter(e => e.medication_taken)
  const medicationPct =
    medicated.length > 0
      ? Math.round(
          (medicated.filter(e => e.outcome === 'resolved' || e.outcome === 'reduced').length /
            medicated.length) *
            100
        )
      : null

  const weekStart = startOfWeek(today, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 })
  const weeklyEpisodes = episodes.filter(e =>
    isWithinInterval(parseISO(e.date), { start: weekStart, end: weekEnd })
  )

  const prevWeekStart = startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 })
  const prevWeekEnd = endOfWeek(subWeeks(today, 1), { weekStartsOn: 1 })
  const prevWeekCount = episodes.filter(e =>
    isWithinInterval(parseISO(e.date), { start: prevWeekStart, end: prevWeekEnd })
  ).length

  return {
    daysSince,
    personalBest,
    medicationPct,
    thisWeekCount: weeklyEpisodes.length,
    prevWeekCount,
    weeklyEpisodes,
    recentEpisodes: sorted.slice(0, 5),
    allEpisodes: sorted,
  }
}

export function useEpisodes() {
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchAllEpisodes()
      setEpisodes(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load episodes')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  const stats = computeStats(episodes)

  return { episodes, stats, loading, error, refetch }
}
