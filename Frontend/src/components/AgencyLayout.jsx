import { useState, useEffect, useRef } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAgency } from './AgencyContext'
import api from '../api'

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
const AnalyticsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
    <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" />
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
  { to: '/agency/dashboard/analytics', label: 'Analytics', icon: AnalyticsIcon },
  { to: '/agency/dashboard/profile', label: 'Profile', icon: ProfileIcon },
]

const PAGE_TITLES = [
  { match: (p) => p === '/agency/dashboard' || p === '/agency/dashboard/', title: 'Overview', subtitle: 'Your funding at a glance' },
  { match: (p) => p.startsWith('/agency/dashboard/grants'), title: 'Grant Calls', subtitle: 'Create, publish and manage your grant calls' },
  { match: (p) => p.startsWith('/agency/dashboard/proposals'), title: 'Proposals', subtitle: 'Review and decide on submitted proposals' },
  { match: (p) => p.startsWith('/agency/dashboard/analytics'), title: 'Analytics', subtitle: 'How your grants are performing' },
  { match: (p) => p.startsWith('/agency/dashboard/profile'), title: 'Agency Profile', subtitle: 'What applicants see about your agency' },
]

const BellIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
)

const ChevronIcon = ({ open }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 text-warm-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

// Clears the session and does a full-page redirect, so nothing from this
// agency's session (context state, open socket, cached lists) survives into
// the next login. `replace` stops the Back button returning to the dashboard.
const signOut = () => {
  try {
    localStorage.removeItem('grantiq_token')
    localStorage.removeItem('grantiq_user')
    localStorage.removeItem('grantos_token')
    localStorage.removeItem('grantos_user')
    sessionStorage.clear()
  } catch {
    // storage unavailable — redirecting still ends the session in the UI
  }
  window.location.replace('/login')
}

function Avatar({ logoUrl, name, size = 'w-9 h-9', text = 'text-sm' }) {
  return (
    <div className={`${size} rounded-full bg-amber text-white font-heading font-semibold ${text} flex items-center justify-center shadow-soft overflow-hidden shrink-0`}>
      {logoUrl ? (
        <img src={logoUrl} alt="" className="w-full h-full object-cover bg-white" />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </div>
  )
}

export default function AgencyLayout() {
  const location = useLocation()
  const { agency, profile, contactEmail, checklist, stats, loading } = useAgency()

  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const menuRef = useRef(null)

  const displayName = agency?.agencyName || 'Funding Agency Partner'
  const email = profile?.contactPerson?.email || contactEmail || ''
  const logoUrl = profile?.logoUrl
    ? `${api.defaults.baseURL?.replace(/\/api\/?$/, '') || ''}${profile.logoUrl}`
    : ''
  const isVerified = Boolean(agency?.isLegallyVerified)
  const isActive = agency?.status === 'approved'
  const checklistDone = Object.values(checklist).filter(Boolean).length
  const checklistTotal = Object.keys(checklist).length
  const awaiting = Number(stats?.awaitingReview) || 0

  const page = PAGE_TITLES.find((p) => p.match(location.pathname)) || PAGE_TITLES[0]

  // Close the user menu on outside click / Escape; Escape also closes the dialog.
  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        setConfirmOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  const askSignOut = () => {
    setMenuOpen(false)
    setConfirmOpen(true)
  }

  return (
    <div className="min-h-screen bg-cream flex font-body">
      {/* ─── Sidebar ─── */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-warm-gray-200/70 bg-surface-elevated sticky top-0 h-screen">
        <div className="px-5 py-5 border-b border-warm-gray-200/70">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 bg-amber rounded-[12px] flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-105 shadow-soft">
              <LeafIcon />
            </div>
            <div className="flex flex-col">
              <span className="font-heading text-lg font-bold text-warm-gray-900 tracking-tight leading-none">
                Grant<span className="text-amber">IQ</span>
              </span>
              <span className="text-xs font-semibold tracking-wider text-amber uppercase mt-0.5">
                Agency Portal
              </span>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive: active }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-[10px] text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-amber text-white shadow-soft'
                    : 'text-warm-gray-600 hover:text-warm-gray-900 hover:bg-warm-gray-100'
                }`
              }
            >
              <Icon />
              <span className="flex-1">{label}</span>
              {to.endsWith('/proposals') && awaiting > 0 && (
                <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-amber-light/90 text-white text-xs font-bold flex items-center justify-center">
                  {awaiting}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Setup progress */}
        <div className="px-4 py-4 border-t border-warm-gray-200/70">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-warm-gray-400">Setup Progress</span>
            <span className="text-xs font-bold text-amber">{checklistDone}/{checklistTotal}</span>
          </div>
          <div className="h-1.5 rounded-full bg-warm-gray-100 overflow-hidden">
            <div
              className="h-full bg-amber transition-all duration-500"
              style={{ width: `${checklistTotal ? (checklistDone / checklistTotal) * 100 : 0}%` }}
            />
          </div>
          {checklistDone < checklistTotal && (
            <NavLink to="/agency/dashboard/profile" className="text-xs font-semibold text-amber hover:underline mt-2 inline-block">
              Complete setup →
            </NavLink>
          )}
        </div>

        {/* Account + sign out — always visible on desktop */}
        <div className="px-3 py-3 border-t border-warm-gray-200/70">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <Avatar logoUrl={logoUrl} name={displayName} />
            <div className="min-w-0">
              <p className="text-xs font-bold text-warm-gray-900 truncate">{displayName}</p>
              {email && <p className="text-xs text-warm-gray-500 truncate">{email}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={askSignOut}
            className="mt-1 w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-[10px] text-xs font-semibold text-warm-gray-600 border border-warm-gray-200 hover:text-red-700 hover:bg-red-50 hover:border-red-200 transition-colors cursor-pointer"
          >
            <LogoutIcon />
            Sign out
          </button>
        </div>
      </aside>

      {/* ─── Main column ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md border-b border-warm-gray-200/70 px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Mobile logo (sidebar hidden below lg) */}
            <Link to="/" className="flex items-center gap-2 lg:hidden shrink-0">
              <div className="w-9 h-9 bg-amber rounded-[10px] flex items-center justify-center text-white shadow-soft">
                <LeafIcon />
              </div>
              <span className="font-heading text-lg font-bold text-warm-gray-900">
                Grant<span className="text-amber">IQ</span>
              </span>
            </Link>

            {/* Current page */}
            <div className="hidden lg:block min-w-0">
              <h1 className="font-heading text-lg font-bold text-warm-gray-900 leading-tight truncate">{page.title}</h1>
              <p className="text-xs text-warm-gray-500 truncate">{page.subtitle}</p>
            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              {/* Status */}
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber/15">
                <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-amber'} ${loading ? '' : 'animate-pulse-soft'}`} />
                <span className="text-xs font-semibold text-amber">
                  {isActive ? 'Agency Partner Active' : 'Setting Up Agency'}
                </span>
              </div>

              {/* Review queue shortcut */}
              <Link
                to="/agency/dashboard/proposals"
                title={awaiting > 0 ? `${awaiting} proposal${awaiting === 1 ? '' : 's'} awaiting review` : 'No proposals awaiting review'}
                aria-label={awaiting > 0 ? `${awaiting} proposals awaiting review` : 'Proposals'}
                className="relative w-10 h-10 rounded-[10px] flex items-center justify-center text-warm-gray-600 bg-surface-elevated border border-warm-gray-200/70 hover:text-amber hover:border-amber/30 transition-colors"
              >
                <BellIcon />
                {awaiting > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber text-white text-[10px] font-bold flex items-center justify-center border-2 border-cream">
                    {awaiting > 99 ? '99+' : awaiting}
                  </span>
                )}
              </Link>

              {/* User menu */}
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1.5 rounded-full bg-surface-elevated border border-warm-gray-200/70 hover:border-amber/30 transition-colors cursor-pointer"
                >
                  <Avatar logoUrl={logoUrl} name={displayName} size="w-8 h-8" text="text-xs" />
                  <div className="hidden md:block text-left">
                    <p className="text-xs font-bold text-warm-gray-900 leading-tight truncate max-w-[140px]">{displayName}</p>
                    {email && <p className="text-xs text-warm-gray-500 leading-tight truncate max-w-[140px]">{email}</p>}
                  </div>
                  <ChevronIcon open={menuOpen} />
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-72 bg-surface-elevated rounded-[14px] border border-warm-gray-200/70 shadow-medium overflow-hidden animate-fade-in"
                  >
                    <div className="px-4 py-4 bg-cream/60 border-b border-warm-gray-200/70">
                      <div className="flex items-center gap-3">
                        <Avatar logoUrl={logoUrl} name={displayName} size="w-11 h-11" text="text-base" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-warm-gray-900 truncate">{displayName}</p>
                          {email && <p className="text-xs text-warm-gray-500 truncate">{email}</p>}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                          isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber border-amber/20'
                        }`}>
                          {isActive ? '✓ Active' : 'Pending'}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                          isVerified ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-warm-gray-100 text-warm-gray-500 border-warm-gray-200'
                        }`}>
                          {isVerified ? '🛡 Verified' : 'Not verified'}
                        </span>
                      </div>
                    </div>

                    <div className="p-1.5">
                      <MenuLink to="/agency/dashboard/profile" icon={<ProfileIcon />} label="View profile" onNavigate={() => setMenuOpen(false)} />
                      <MenuLink to="/agency/dashboard/profile?tab=profile" icon={<ProfileIcon />} label="Edit profile" onNavigate={() => setMenuOpen(false)} />
                      <MenuLink
                        to="/agency/dashboard/proposals"
                        icon={<ProposalsIcon />}
                        label="Review queue"
                        badge={awaiting > 0 ? awaiting : null}
                        onNavigate={() => setMenuOpen(false)}
                      />
                    </div>

                    <div className="p-1.5 border-t border-warm-gray-200/70">
                      <button
                        type="button"
                        role="menuitem"
                        onClick={askSignOut}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <LogoutIcon />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile nav — horizontal scroll, since sidebar is hidden below lg */}
          <nav className="flex lg:hidden items-center gap-2 mt-3 overflow-x-auto pb-0.5">
            {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive: active }) =>
                  `flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-semibold whitespace-nowrap transition-colors ${
                    active ? 'bg-amber text-white shadow-soft' : 'text-warm-gray-600 bg-warm-gray-100'
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
          <p>GrantIQ Funding Agency Network • Secure Institutional Grants Infrastructure</p>
        </footer>
      </div>

      {/* ─── Sign-out confirmation ─── */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-warm-gray-900/50 backdrop-blur-sm"
          onMouseDown={(e) => e.target === e.currentTarget && setConfirmOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="signout-title"
        >
          <div className="w-full max-w-sm bg-surface-elevated rounded-[18px] shadow-medium border border-warm-gray-200/70 p-6 animate-fade-in">
            <div className="w-11 h-11 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4">
              <LogoutIcon />
            </div>
            <h2 id="signout-title" className="font-heading text-lg font-bold text-warm-gray-900">Sign out of GrantIQ?</h2>
            <p className="text-sm text-warm-gray-500 mt-1.5 leading-relaxed">
              You'll need to sign in again to review proposals and manage your grant calls.
            </p>
            <div className="flex gap-2.5 mt-6">
              <button
                type="button"
                autoFocus
                onClick={() => setConfirmOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-[10px] text-sm font-semibold text-warm-gray-700 bg-warm-gray-100 hover:bg-warm-gray-200 transition-colors cursor-pointer"
              >
                Stay signed in
              </button>
              <button
                type="button"
                onClick={signOut}
                className="flex-1 px-4 py-2.5 rounded-[10px] text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors cursor-pointer"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MenuLink({ to, icon, label, badge, onNavigate }) {
  return (
    <Link
      to={to}
      role="menuitem"
      onClick={onNavigate}
      className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-semibold text-warm-gray-700 hover:bg-warm-gray-100 transition-colors"
    >
      <span className="text-warm-gray-400">{icon}</span>
      <span className="flex-1">{label}</span>
      {badge ? (
        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-amber text-white text-xs font-bold flex items-center justify-center">{badge}</span>
      ) : null}
    </Link>
  )
}