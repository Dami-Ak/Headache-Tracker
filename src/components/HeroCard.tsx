import { useEffect } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'

interface HeroCardProps {
  daysSince: number | null
  personalBest: number
}

export default function HeroCard({ daysSince, personalBest }: HeroCardProps) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, v => Math.round(v))

  useEffect(() => {
    if (daysSince === null) return
    const controls = animate(count, daysSince, {
      duration: daysSince > 0 ? Math.min(1.2, 0.4 + daysSince * 0.05) : 0.3,
      ease: 'easeOut',
    })
    return controls.stop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [daysSince])

  return (
    <motion.div
      className="rounded-3xl p-6 text-white overflow-hidden relative"
      style={{ background: 'linear-gradient(135deg, #22C55E 0%, #14532D 100%)' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
    >
      {/* Decorative background circle */}
      <motion.div
        className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/5"
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -right-2 bottom-0 w-24 h-24 rounded-full bg-white/5"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut', delay: 0.5 }}
      />

      <div className="relative">
        <motion.div
          className="text-[72px] font-bold leading-none tabular-nums"
          animate={daysSince !== null && daysSince >= 7 ? { scale: [1, 1.03, 1] } : {}}
          transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut', repeatDelay: 2 }}
        >
          {daysSince === null ? '—' : <motion.span>{rounded}</motion.span>}
        </motion.div>
        <div className="text-[#86EFAC] text-base mt-1">days since last headache</div>
        <div className="mt-4 inline-flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
          <span className="text-sm">🏆</span>
          <span className="text-sm font-medium text-white">
            Best: {personalBest} {personalBest === 1 ? 'day' : 'days'}
          </span>
        </div>
      </div>
    </motion.div>
  )
}
