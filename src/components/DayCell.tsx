import type { Intensity } from '../lib/supabase'

const COLOR: Record<string, { bg: string; text: string }> = {
  none: { bg: '#F0FDF4', text: '#16A34A' },
  mild: { bg: '#FEF9C3', text: '#CA8A04' },
  moderate: { bg: '#FFEDD5', text: '#EA580C' },
  severe: { bg: '#FEE2E2', text: '#DC2626' },
  future: { bg: '#F9FAFB', text: '#D1D5DB' },
  empty: { bg: 'transparent', text: 'transparent' },
}

function intensityToKey(intensity: Intensity | null, isFuture: boolean, isEmpty: boolean): string {
  if (isEmpty) return 'empty'
  if (isFuture) return 'future'
  if (!intensity) return 'none'
  return intensity
}

interface DayCellProps {
  day: number | null  // null = empty leading cell
  intensity: Intensity | null
  isFuture: boolean
  isToday: boolean
  isSelected: boolean
  onClick?: () => void
}

export default function DayCell({ day, intensity, isFuture, isToday, isSelected, onClick }: DayCellProps) {
  if (day === null) {
    return <div className="w-10 h-10" />
  }

  const key = intensityToKey(intensity, isFuture, false)
  const { bg, text } = COLOR[key]

  return (
    <button
      onClick={onClick}
      className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-medium transition-all relative"
      style={{
        background: bg,
        color: text,
        border: isToday ? `2px solid ${text}` : isSelected ? `2px solid #16A34A` : '2px solid transparent',
        outline: 'none',
      }}
    >
      {day}
    </button>
  )
}
