import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'
import GrantDiscoveryModule from '../components/GrantDiscoveryModule'

// ─── Sidebar nav items (same as OrgDashboard) ───
const NAV_ITEMS = [
  { key: 'home', label: 'Dashboard', icon: '🏠' },
  { key: 'grants', label: 'Grant Discovery', icon: '🔍' },
  { key: 'proposals', label: 'Proposal Management', icon: '📝' },
  { key: 'tracking', label: 'Proposal Tracking', icon: '📊' },
  { key: 'team', label: 'Team Management', icon: '👥' },
  { key: 'deadlines', label: 'Deadline Alerts', icon: '🔔' },
  { key: 'analytics', label: 'Analytics', icon: '📈' },
]

const LeafIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-6 h-6"
  >
    <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 1 8-1 3.5-3 5-5 7" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
)

// ─── Main Standalone Page Component ───
export default function GrantDiscoveryPage() {
  const navigate = useNavigate()
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState('')
  const [orgName, setOrgName] = useState('')
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Fetch user & org profile
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get('/auth/me')
        if (res.data.success) {
          setUserName(res.data.user.fullName)
          setUserRole(res.data.user.role)
          if (res.data.orgStatus) {
            setOrgName(res.data.orgStatus.organizationName)
          }
        }
      } catch (err) {
        console.error('Failed to fetch user:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchUser()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('grantiq_token')
    localStorage.removeItem('grantiq_user')
    localStorage.removeItem('grantos_token')
    localStorage.removeItem('grantos_user')
    navigate('/login')
  }

  const handleNavClick = (key) => {
    setSidebarOpen(false)
    if (key === 'grants') return
    if (key === 'home') {
      if (userRole === 'team_member') navigate('/member/dashboard')
      else navigate('/org/dashboard')
    } else {
      if (userRole === 'team_member') {
        navigate('/member/dashboard', { state: { section: key } })
      } else {
        navigate(`/org/dashboard/${key}`)
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex">
      {/* ─── Sidebar ─── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-surface-elevated border-r border-warm-gray-200/60 transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        id="grant-discovery-sidebar"
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-warm-gray-200/60">
            <Link to="/" className="flex items-center gap-2 group" id="discovery-logo">
              <div className="w-9 h-9 bg-primary rounded-[10px] flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-105 shadow-soft">
                <LeafIcon />
              </div>
              <span className="font-heading text-xl font-semibold text-warm-gray-900 tracking-tight">
                Grant<span className="text-primary">IQ</span>
              </span>
            </Link>
            {orgName && (
              <p className="text-xs font-medium text-warm-gray-500 mt-2 truncate">{orgName}</p>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                onClick={() => handleNavClick(item.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-[12px] text-sm font-medium transition-all duration-200 cursor-pointer ${
                  item.key === 'grants'
                    ? 'bg-primary text-white shadow-soft font-semibold'
                    : 'text-warm-gray-600 hover:bg-warm-gray-50 hover:text-warm-gray-900'
                }`}
                id={`nav-${item.key}`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          {/* User Footer */}
          <div className="p-4 border-t border-warm-gray-200/60">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center text-primary font-bold text-sm border border-primary/20">
                {userName ? userName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-warm-gray-900 truncate">{userName}</p>
                <p className="text-xs text-warm-gray-500 capitalize">
                  {userRole?.replace('_', ' ') || 'User'}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 rounded-[10px] text-sm text-warm-gray-500 hover:text-warm-gray-700 hover:bg-warm-gray-50 transition-colors cursor-pointer text-left"
              id="sidebar-sign-out"
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ─── Main Content ─── */}
      <main className="flex-1 lg:ml-64 min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 bg-surface-elevated border-b border-warm-gray-200/60 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-warm-gray-600 cursor-pointer"
            id="mobile-menu-toggle"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="font-heading font-semibold text-warm-gray-900">
            Grant<span className="text-primary">IQ</span>
          </span>
          <div className="w-8" />
        </header>

        {/* Unified Grant Discovery Module */}
        <GrantDiscoveryModule userRole={userRole} />
      </main>
    </div>
  )
}
