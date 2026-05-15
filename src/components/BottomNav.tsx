import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Home', icon: HomeIcon },
  { to: '/calendar', label: 'Calendar', icon: CalendarIcon },
  { to: '/stats', label: 'Stats', icon: StatsIcon },
]

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 9.5L12 3L21 9.5V20C21 20.55 20.55 21 20 21H15V15H9V21H4C3.45 21 3 20.55 3 20V9.5Z"
        fill={active ? 'white' : '#6B7280'}
        stroke={active ? 'white' : '#6B7280'}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CalendarIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="17" rx="2" stroke={active ? 'white' : '#6B7280'} strokeWidth="1.5" />
      <path d="M3 9H21" stroke={active ? 'white' : '#6B7280'} strokeWidth="1.5" />
      <path d="M8 2V5M16 2V5" stroke={active ? 'white' : '#6B7280'} strokeWidth="1.5" strokeLinecap="round" />
      <rect x="7" y="13" width="3" height="3" rx="0.5" fill={active ? 'white' : '#6B7280'} />
      <rect x="14" y="13" width="3" height="3" rx="0.5" fill={active ? 'white' : '#6B7280'} />
    </svg>
  )
}

function StatsIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M3 20H21" stroke={active ? 'white' : '#6B7280'} strokeWidth="1.5" strokeLinecap="round" />
      <rect x="4" y="12" width="4" height="8" rx="1" fill={active ? 'white' : '#6B7280'} />
      <rect x="10" y="7" width="4" height="13" rx="1" fill={active ? 'white' : '#6B7280'} />
      <rect x="16" y="4" width="4" height="16" rx="1" fill={active ? 'white' : '#6B7280'} />
    </svg>
  )
}

export default function BottomNav() {
  return (
    <div className="sticky bottom-0 w-full bg-[#F0FAF3] px-4 pb-6 pt-2 z-40">
      <nav className="bg-white rounded-full flex items-center shadow-sm overflow-hidden">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-0.5 py-3 transition-colors ${
                isActive ? 'bg-[#16A34A]' : ''
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon active={isActive} />
                <span
                  className={`text-[10px] font-medium ${isActive ? 'text-white' : 'text-[#6B7280]'}`}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
