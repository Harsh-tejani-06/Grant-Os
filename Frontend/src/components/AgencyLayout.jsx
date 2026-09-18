import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAgency } from './AgencyContext'

const LeafIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 1 8-1 3.5-3 5-5 7" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
)

const OverviewIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
    <rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" />
  </svg>
)

const GrantsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
    <path d="M3 11l18-5v12L3 13v-2z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
  </svg>
)

const ProposalsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" /><path d="M9 13h6" /><path d="M9 17h6" />
  </svg>
)

const ProfileIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
    <rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2" />
    <path d="M15 9h4" /><path d="M15 13h4" /><path d="M6 17c.6-1.6 1.9-2.5 3-2.5s2.4.9 3 2.5" />
  </svg>
)

const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-[16px] h-[16px]">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

const NAV_ITEMS = [
  { to: '/agency/dashboard', label: 'Overview', icon: OverviewIcon, end: true },
  { to: '/agency/dashboard/grants', label: 'Grant Calls', icon: GrantsIcon },
  { to: '/agency/dashboard/proposals', label: 'Proposals', icon: ProposalsIcon },
  { to: '/agency/dashboard/profile', label: 'Profile', icon: ProfileIcon },
]

export default function AgencyLayout() {
  const navigate = useNavigate()
  const { agency, contactEmail, checklist, loading } = useAgency()

  const displayName = agency?.agencyName || 'Funding Agency Partner'
  const checklistDone = Object.values(checklist).filter(Boolean).length
  const checklistTotal = Object.keys(checklist).length

  const handleLogout = () => {
    localStorage.removeItem('grantos_token')
    localStorage.removeItem('grantos_user')
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-cream flex font-body">
      {/* ─── Sidebar ─── */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-warm-gray-200/70 bg-surface-elevated">
        <div className="px-5 py-5 border-b border-warm-gray-200/70">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 bg-amber rounded-[12px] flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-105 shadow-soft">
              <LeafIcon />
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-lg font-bold text-warm-gray-900 tracking-tight leading-none">
                Grant<span className="text-amber">OS</span>
              </span>
              <span className="text-[10px] font-semibold tracking-wider text-amber uppercase mt-0.5">
                Agency Portal
              </span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-amber text-white shadow-soft'
                    : 'text-warm-gray-600 hover:text-warm-gray-900 hover:bg-warm-gray-100'
                }`
              }
            >
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Setup progress footer */}
        <div className="px-4 py-4 border-t border-warm-gray-200/70">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-warm-gray-400">
              Setup Progress
            </span>
            <span className="text-[11px] font-bold text-amber">
              {checklistDone}/{checklistTotal}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-warm-gray-100 overflow-hidden">
            <div
              className="h-full bg-amber transition-all duration-500"
              style={{ width: `${(checklistDone / checklistTotal) * 100}%` }}
            />
          </div>
          <NavLink
            to="/agency/dashboard/profile"
            className="text-[11px] font-semibold text-amber hover:underline mt-2 inline-block"
          >
            Complete setup →
          </NavLink>
        </div>
      </aside>

      {/* ─── Main column ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md border-b border-warm-gray-200/70 px-4 sm:px-6 py-3.5">
          <div className="flex items-center justify-between gap-4">
            {/* Mobile logo (sidebar hidden below lg) */}
            <Link to="/" className="flex items-center gap-2 lg:hidden">
              <div className="w-9 h-9 bg-amber rounded-[10px] flex items-center justify-center text-white shadow-soft">
                <LeafIcon />
              </div>
              <span className="font-heading text-lg font-bold text-warm-gray-900">
                Grant<span className="text-amber">OS</span>
              </span>
            </Link>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber/15">
              <div className={`w-2 h-2 rounded-full bg-amber ${loading ? '' : 'animate-pulse-soft'}`} />
              <span className="text-xs font-semibold text-amber">
                {agency?.status === 'approved' ? 'Agency Partner Active' : 'Setting Up Agency'}
              </span>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-amber text-white font-heading font-semibold text-sm flex items-center justify-center shadow-soft">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-bold text-warm-gray-900 leading-tight truncate max-w-[160px]">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-warm-gray-500 truncate max-w-[160px]">
                    {contactEmail || 'agency@partner.gov.in'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-xs font-semibold text-warm-gray-500 hover:text-warm-gray-800 px-3 py-2 rounded-[8px] hover:bg-warm-gray-100 transition-colors cursor-pointer"
              >
                <LogoutIcon />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>

          {/* Mobile nav — horizontal scroll, since sidebar is hidden below lg */}
          <nav className="flex lg:hidden items-center gap-2 mt-3.5 overflow-x-auto pb-0.5">
            {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-semibold whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-amber text-white shadow-soft'
                      : 'text-warm-gray-600 bg-warm-gray-100'
                  }`
                }
              >
                <Icon />
                {label}
              </NavLink>
            ))}
          </nav>
        </header>

        {/* Routed page content */}
        <main className="relative z-10 flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
          <Outlet />
        </main>

        <footer className="mt-auto border-t border-warm-gray-200/60 py-6 px-6 text-center text-xs text-warm-gray-400">
          <p>GrantOS Funding Agency Network • Secure Institutional Grants Infrastructure</p>
        </footer>
      </div>
    </div>
  )
}