import { useState, useRef } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useMedication } from './hooks/useMedication'
import { useEpisodes } from './hooks/useEpisodes'
import { deleteEpisode } from './lib/queries'
import HomeScreen from './components/HomeScreen'
import CalendarView from './components/CalendarView'
import StatsScreen from './components/StatsScreen'
import LogSheet from './components/LogSheet'
import BottomNav from './components/BottomNav'

function Onboarding({ onComplete }: { onComplete: (name: string) => void }) {
  const [value, setValue] = useState('')

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white px-6"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="w-full max-w-sm flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <motion.div
            className="text-5xl"
            animate={{ rotate: [0, -10, 10, -10, 0] }}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            💊
          </motion.div>
          <h1 className="text-3xl font-bold text-[#18103A] leading-tight">
            What's your go-to medication?
          </h1>
          <p className="text-[#6B7280] text-base">
            We'll use this to track whether it's helping your headaches.
          </p>
        </div>
        <div className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="e.g. Ibuprofen, Excedrin..."
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && value.trim() && onComplete(value.trim())}
            className="w-full border-2 border-[#D1FAE5] rounded-2xl px-4 py-4 text-[#18103A] text-base outline-none focus:border-[#16A34A] transition-colors"
            autoFocus
          />
          <motion.button
            disabled={!value.trim()}
            onClick={() => onComplete(value.trim())}
            whileTap={{ scale: 0.97 }}
            className="w-full bg-[#16A34A] text-white font-semibold text-base rounded-full py-4 disabled:opacity-40 transition-opacity"
          >
            Get Started
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="flex flex-col flex-1 overflow-hidden"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

function AppShell() {
  const { medication, setMedication } = useMedication()
  const [showLog, setShowLog] = useState(false)
  const [logInitialDate, setLogInitialDate] = useState<string | undefined>(undefined)
  const { episodes, stats, loading, error, refetch } = useEpisodes()
  const refetchRef = useRef(refetch)
  refetchRef.current = refetch
  const location = useLocation()

  function handleSettings() {
    const name = prompt('Update medication name:', medication ?? '')
    if (name && name.trim()) setMedication(name.trim())
  }

  function openLog(date?: string) {
    setLogInitialDate(date)
    setShowLog(true)
  }

  function closeLog() {
    setShowLog(false)
    setLogInitialDate(undefined)
  }

  function handleSaved() {
    closeLog()
    refetchRef.current()
  }

  function handleDelete(id: string) {
    deleteEpisode(id).then(() => refetchRef.current()).catch(console.error)
  }

  return (
    <div className="relative w-full max-w-sm mx-auto min-h-screen bg-[#F0FAF3] flex flex-col">
      <AnimatePresence>
        {!medication && (
          <Onboarding onComplete={name => setMedication(name)} />
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route
              path="/"
              element={
                <PageWrapper>
                  <HomeScreen
                    stats={stats}
                    loading={loading}
                    error={error}
                    medication={medication ?? ''}
                    onLogPress={openLog}
                    onSettingsPress={handleSettings}
                    onDelete={handleDelete}
                  />
                </PageWrapper>
              }
            />
            <Route
              path="/calendar"
              element={
                <PageWrapper>
                  <CalendarView
                    episodes={episodes}
                    medication={medication ?? ''}
                    onLogPress={openLog}
                    onSettingsPress={handleSettings}
                    onDelete={handleDelete}
                  />
                </PageWrapper>
              }
            />
            <Route
              path="/stats"
              element={
                <PageWrapper>
                  <StatsScreen
                    episodes={episodes}
                    medication={medication ?? ''}
                    daysSince={stats.daysSince}
                    personalBest={stats.personalBest}
                    onLogPress={openLog}
                  />
                </PageWrapper>
              }
            />
          </Routes>
        </AnimatePresence>
      </div>

      <BottomNav />

      <AnimatePresence>
        {showLog && (
          <LogSheet
            medication={medication ?? ''}
            initialDate={logInitialDate}
            onClose={closeLog}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
