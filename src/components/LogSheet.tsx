import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { insertEpisode } from '../lib/queries'
import type { Intensity, Outcome } from '../lib/supabase'
import { TRIGGERS } from '../lib/supabase'

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function now24hr() {
  const d = new Date()
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function todayISO() {
  return format(new Date(), 'yyyy-MM-dd')
}

function formatDateLabel(iso: string) {
  const today = todayISO()
  const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd')
  if (iso === today) return 'Today'
  if (iso === yesterday) return 'Yesterday'
  return format(new Date(iso + 'T00:00:00'), 'MMM d')
}

function format12hr(time24: string) {
  const [h, m] = time24.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${pad(m)} ${suffix}`
}

function openPicker(el: HTMLInputElement | null) {
  if (!el) return
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(el as any).showPicker()
  } catch {
    el.click()
  }
}

// ── celebration messages ──────────────────────────────────────────────────────

interface CelebrationMsg {
  emoji: string
  title: string
  tip: string
}

const GENERIC: CelebrationMsg[] = [
  { emoji: '💧', title: 'Logged!',           tip: 'Drink a full glass of water — dehydration is a sneaky trigger.' },
  { emoji: '🌬️', title: 'You got this.',     tip: 'Take 3 slow, deep breaths. In through the nose, out through the mouth.' },
  { emoji: '🧘', title: 'Episode recorded.', tip: 'Close your eyes for 2 minutes. Just rest — nothing else.' },
  { emoji: '🌿', title: 'Keep going!',       tip: 'Every log helps you find your patterns. You\'re building something useful.' },
  { emoji: '🌟', title: 'You\'re on it!',    tip: 'Tracking takes discipline. You should feel proud of this habit.' },
  { emoji: '📵', title: 'Logged!',           tip: 'Try stepping away from screens for 10 minutes if you can.' },
  { emoji: '🫶', title: 'All saved.',        tip: 'Be gentle with yourself today. Headaches are genuinely hard.' },
]

function getMsg(intensity: Intensity, outcome: Outcome, medTaken: boolean): CelebrationMsg {
  if (outcome === 'resolved')
    return { emoji: '🎉', title: 'So glad it passed!', tip: 'Your body bounced back. Keep going — you\'re doing great.' }
  if (outcome === 'reduced')
    return { emoji: '📉', title: 'Getting better!', tip: 'Good progress. Keep resting and drink some water.' }
  if (outcome === 'got_worse')
    return { emoji: '💙', title: 'Hang in there.', tip: 'Try a cold or warm compress and rest in a dark room.' }
  if (intensity === 'severe')
    return { emoji: '🌙', title: 'You\'re brave for logging this.', tip: 'Dim the lights and rest if you can. You\'ve got this.' }
  if (medTaken)
    return { emoji: '💊', title: 'Medication logged!', tip: 'Drink a full glass of water to help it work faster.' }
  return GENERIC[Math.floor(Math.random() * GENERIC.length)]
}

// ── confetti dots ─────────────────────────────────────────────────────────────

const CONFETTI = [
  { color: '#16A34A', x: 70,   y: -85,  s: 12 },
  { color: '#FCD34D', x: -70,  y: -85,  s: 10 },
  { color: '#60A5FA', x: 95,   y: 10,   s: 9  },
  { color: '#F9A8D4', x: -95,  y: 10,   s: 9  },
  { color: '#86EFAC', x: 45,   y: 90,   s: 11 },
  { color: '#C084FC', x: -45,  y: 90,   s: 8  },
  { color: '#F97316', x: 0,    y: -100, s: 10 },
  { color: '#22C55E', x: 105,  y: -40,  s: 8  },
  { color: '#60A5FA', x: -105, y: -40,  s: 10 },
  { color: '#FCD34D', x: 60,   y: 70,   s: 8  },
  { color: '#F9A8D4', x: -60,  y: 70,   s: 9  },
  { color: '#16A34A', x: 0,    y: 110,  s: 8  },
]

// ── form constants ────────────────────────────────────────────────────────────

const INTENSITIES: { value: Intensity; emoji: string; label: string; bg: string; text: string }[] = [
  { value: 'mild',     emoji: '😐', label: 'Mild',     bg: '#FEF9C3', text: '#CA8A04' },
  { value: 'moderate', emoji: '😣', label: 'Moderate', bg: '#FFEDD5', text: '#EA580C' },
  { value: 'severe',   emoji: '🤯', label: 'Severe',   bg: '#FEE2E2', text: '#DC2626' },
]

const OUTCOMES: { value: Outcome; emoji: string; label: string }[] = [
  { value: 'resolved',  emoji: '✅', label: 'Resolved completely' },
  { value: 'reduced',   emoji: '📉', label: 'Reduced / improved'  },
  { value: 'no_change', emoji: '➡️', label: 'No change'           },
  { value: 'got_worse', emoji: '📈', label: 'Got worse'           },
]

// ── component ─────────────────────────────────────────────────────────────────

interface LogSheetProps {
  medication: string
  initialDate?: string
  onClose: () => void
  onSaved: () => void
}

type SaveState = 'idle' | 'saving' | 'success'

export default function LogSheet({ medication, initialDate, onClose, onSaved }: LogSheetProps) {
  const [date, setDate] = useState(initialDate ?? todayISO())
  const [time, setTime] = useState(now24hr())
  const [intensity, setIntensity] = useState<Intensity | null>(null)
  const [medTaken, setMedTaken] = useState<boolean | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [triggers, setTriggers] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [celebration, setCelebration] = useState<CelebrationMsg | null>(null)

  const dateRef = useRef<HTMLInputElement | null>(null)
  const timeRef = useRef<HTMLInputElement | null>(null)

  const canSave = intensity !== null && medTaken !== null && outcome !== null

  function toggleTrigger(value: string) {
    setTriggers(prev =>
      prev.includes(value) ? prev.filter(t => t !== value) : [...prev, value]
    )
  }

  async function handleSave() {
    if (!canSave) return
    setError(null)
    setSaveState('saving')
    try {
      await insertEpisode({
        date,
        time: time + ':00',
        intensity: intensity!,
        medication_taken: medTaken!,
        outcome: outcome!,
        triggers,
        notes: notes.trim() || null,
      })
      setCelebration(getMsg(intensity!, outcome!, medTaken!))
      setSaveState('success')
      setTimeout(() => onSaved(), 2800)
    } catch (e) {
      setSaveState('idle')
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('does not exist') || msg.includes('relation')) {
        setError('Database table not found. Run the SQL in supabase-schema.sql in your Supabase SQL Editor first.')
      } else if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed')) {
        setError('Network error. Check your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env, then restart the dev server.')
      } else {
        setError(msg || 'Failed to save. Check your Supabase connection.')
      }
    }
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-40 bg-black/30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[95svh] overflow-y-auto"
        style={{ maxWidth: '384px', margin: '0 auto' }}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F3F4F6] text-[#6B7280] text-lg"
          >
            ×
          </button>
          <span className="font-semibold text-[#18103A]">Log Headache</span>
          <div className="w-8" />
        </div>

        <div className="px-5 pb-8 flex flex-col gap-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-4 py-3 leading-snug">
              ⚠️ {error}
            </div>
          )}

          {/* WHEN */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[#9CA3AF] mb-3">When</div>
            <div className="flex gap-2">
              <div className="flex-1">
                <button
                  type="button"
                  onClick={() => openPicker(dateRef.current)}
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-2xl border-2 border-[#D1FAE5] bg-[#F0FDF4]"
                >
                  <span>📅</span>
                  <span className="text-sm font-medium text-[#16A34A]">{formatDateLabel(date)}</span>
                </button>
                <input
                  ref={dateRef}
                  type="date"
                  value={date}
                  max={todayISO()}
                  onChange={e => e.target.value && setDate(e.target.value)}
                  className="sr-only"
                />
              </div>

              <div className="flex-1">
                <button
                  type="button"
                  onClick={() => openPicker(timeRef.current)}
                  className="w-full flex items-center gap-2 px-4 py-3 rounded-2xl border-2 border-[#D1FAE5] bg-[#F0FDF4]"
                >
                  <span>🕐</span>
                  <span className="text-sm font-medium text-[#16A34A]">{format12hr(time)}</span>
                </button>
                <input
                  ref={timeRef}
                  type="time"
                  value={time}
                  onChange={e => e.target.value && setTime(e.target.value)}
                  className="sr-only"
                />
              </div>
            </div>
          </div>

          {/* HOW BAD */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[#9CA3AF] mb-3">How bad is it?</div>
            <div className="flex gap-2">
              {INTENSITIES.map(i => {
                const active = intensity === i.value
                return (
                  <motion.button
                    key={i.value}
                    type="button"
                    onClick={() => setIntensity(i.value)}
                    whileTap={{ scale: 0.94 }}
                    className="flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl transition-all text-sm font-medium"
                    style={{
                      background: active ? '#16A34A' : i.bg,
                      color: active ? 'white' : i.text,
                      border: `2px solid ${active ? '#16A34A' : 'transparent'}`,
                    }}
                  >
                    <span className="text-xl">{i.emoji}</span>
                    <span>{i.label}</span>
                  </motion.button>
                )
              })}
            </div>
          </div>

          {/* MEDICATION */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[#9CA3AF] mb-3">Medication taken?</div>
            <div className="flex gap-2">
              <motion.button
                type="button"
                onClick={() => setMedTaken(true)}
                whileTap={{ scale: 0.96 }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium transition-all"
                style={{
                  background: medTaken === true ? '#DCFCE7' : '#F9FAFB',
                  border: `2px solid ${medTaken === true ? '#16A34A' : '#E5E7EB'}`,
                  color: medTaken === true ? '#16A34A' : '#6B7280',
                }}
              >
                ✓ Yes — {medication || 'Medication'}
              </motion.button>
              <motion.button
                type="button"
                onClick={() => setMedTaken(false)}
                whileTap={{ scale: 0.96 }}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium transition-all"
                style={{
                  background: medTaken === false ? '#F3F4F6' : '#F9FAFB',
                  border: `2px solid ${medTaken === false ? '#6B7280' : '#E5E7EB'}`,
                  color: '#6B7280',
                }}
              >
                ✕ No
              </motion.button>
            </div>
          </div>

          {/* OUTCOME */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[#9CA3AF] mb-3">What happened?</div>
            <div className="flex flex-col gap-2">
              {OUTCOMES.map(o => {
                const active = outcome === o.value
                return (
                  <motion.button
                    key={o.value}
                    type="button"
                    onClick={() => setOutcome(o.value)}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-medium text-left transition-all"
                    style={{
                      background: active ? '#DCFCE7' : '#F9FAFB',
                      border: `2px solid ${active ? '#16A34A' : '#E5E7EB'}`,
                      color: active ? '#16A34A' : '#18103A',
                    }}
                  >
                    <span className="text-lg">{o.emoji}</span>
                    <span>{o.label}</span>
                  </motion.button>
                )
              })}
            </div>
          </div>

          {/* TRIGGERS */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[#9CA3AF] mb-3">
              Possible triggers <span className="normal-case font-normal">(optional)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {TRIGGERS.map((t, idx) => {
                const active = triggers.includes(t.value)
                return (
                  <motion.button
                    key={t.value}
                    type="button"
                    onClick={() => toggleTrigger(t.value)}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    whileTap={{ scale: 0.92 }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all"
                    style={{
                      background: active ? '#DCFCE7' : '#F3F4F6',
                      border: `1.5px solid ${active ? '#16A34A' : 'transparent'}`,
                      color: active ? '#16A34A' : '#6B7280',
                    }}
                  >
                    <span>{t.emoji}</span>
                    <span>{t.label}</span>
                  </motion.button>
                )
              })}
            </div>
          </div>

          {/* NOTES */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-[#9CA3AF] mb-3">
              Notes <span className="normal-case font-normal">(optional)</span>
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Anything else worth noting…"
              rows={2}
              className="w-full border-2 border-[#E5E7EB] rounded-2xl px-4 py-3 text-sm text-[#18103A] placeholder-[#9CA3AF] resize-none outline-none transition-colors"
              style={{ fontFamily: 'inherit' }}
              onFocus={e => (e.target.style.borderColor = '#16A34A')}
              onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
            />
          </div>

          {/* Save */}
          <motion.button
            type="button"
            onClick={handleSave}
            disabled={!canSave || saveState !== 'idle'}
            whileTap={canSave ? { scale: 0.97 } : {}}
            className="w-full text-white font-semibold text-base rounded-full py-4 flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
            style={{ background: '#16A34A' }}
            animate={saveState === 'saving' ? { scale: [1, 1.04, 1] } : {}}
            transition={{ repeat: saveState === 'saving' ? Infinity : 0, duration: 0.6 }}
          >
            <AnimatePresence mode="wait">
              {saveState === 'success' ? (
                <motion.span key="check" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  ✓ Saved!
                </motion.span>
              ) : (
                <motion.span key="label" exit={{ opacity: 0 }}>
                  {saveState === 'saving' ? 'Saving…' : '✓ Save Episode'}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>

          {!canSave && (
            <p className="text-center text-xs text-[#9CA3AF] -mt-4">
              Select intensity, medication, and outcome to save
            </p>
          )}
        </div>
      </motion.div>

      {/* Celebration overlay */}
      <AnimatePresence>
        {saveState === 'success' && celebration && (
          <motion.div
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center"
            style={{ background: '#F0FDF4' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {/* Confetti */}
            <div className="relative flex items-center justify-center">
              {CONFETTI.map((c, i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full"
                  style={{ width: c.s, height: c.s, background: c.color }}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                  animate={{ x: c.x, y: c.y, scale: [0, 1.2, 0.8], opacity: [1, 1, 0] }}
                  transition={{ duration: 0.7, delay: 0.1 + i * 0.02, ease: 'easeOut' }}
                />
              ))}

              {/* Big emoji */}
              <motion.div
                className="text-8xl select-none"
                initial={{ scale: 0, rotate: -15 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.05 }}
              >
                {celebration.emoji}
              </motion.div>
            </div>

            {/* Text */}
            <motion.div
              className="mt-8 px-10 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
            >
              <div className="text-2xl font-bold text-[#18103A] mb-3">{celebration.title}</div>
              <div className="text-base text-[#6B7280] leading-relaxed">{celebration.tip}</div>
            </motion.div>

            {/* Auto-close hint */}
            <motion.div
              className="absolute bottom-16 text-xs text-[#9CA3AF]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              Closing in a moment…
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
