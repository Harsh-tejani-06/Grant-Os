import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'

const LeafIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 1 8-1 3.5-3 5-5 7" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
)

// ─── Task type config ───
const TASK_TYPES = [
  { key: 'grant_discovery', label: 'Grant Discovery', icon: '🔍', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'proposal_writing', label: 'Proposal Writing', icon: '📝', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { key: 'budget_planning', label: 'Budget Planning', icon: '💰', color: 'bg-green-50 text-green-700 border-green-200' },
  { key: 'research', label: 'Research', icon: '🔬', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { key: 'compliance', label: 'Compliance', icon: '✅', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { key: 'reporting', label: 'Reporting', icon: '📊', color: 'bg-teal-50 text-teal-700 border-teal-200' },
]

// ─── Sidebar nav items ───
const NAV_ITEMS = [
  { key: 'home', label: 'Dashboard', icon: '🏠' },
  { key: 'grants', label: 'Grant Discovery', icon: '🔍' },
  { key: 'applications', label: 'Applications', icon: '📋' },
  { key: 'team', label: 'Team Management', icon: '👥' },
  { key: 'deadlines', label: 'Deadline Alerts', icon: '🔔' },
  { key: 'analytics', label: 'Analytics', icon: '📈' },
]

// ─── Static grant data ───
const MOCK_GRANTS = [
  { id: 1, title: 'UGC Major Research Project', agency: 'University Grants Commission', amount: '₹25,00,000', deadline: '2026-09-15', category: 'Research', status: 'Open', match: 95 },
  { id: 2, title: 'DST SERB Core Research Grant', agency: 'Dept. of Science & Technology', amount: '₹50,00,000', deadline: '2026-10-01', category: 'Science', status: 'Open', match: 88 },
  { id: 3, title: 'ICSSR Research Fellowship', agency: 'Indian Council of Social Science Research', amount: '₹8,00,000', deadline: '2026-08-30', category: 'Fellowship', status: 'Closing Soon', match: 82 },
  { id: 4, title: 'DBT Institutional Development', agency: 'Dept. of Biotechnology', amount: '₹1,20,00,000', deadline: '2026-11-15', category: 'Infrastructure', status: 'Open', match: 76 },
  { id: 5, title: 'AICTE Research Promotion Scheme', agency: 'AICTE', amount: '₹15,00,000', deadline: '2026-09-30', category: 'Research', status: 'Open', match: 71 },
  { id: 6, title: 'CSIR Senior Research Fellowship', agency: 'Council of Scientific & Industrial Research', amount: '₹4,20,000/yr', deadline: '2026-08-20', category: 'Fellowship', status: 'Closing Soon', match: 68 },
]

const MOCK_APPLICATIONS = [
  { id: 1, title: 'UGC Major Research Project', status: 'Submitted', date: '2026-07-20', amount: '₹25,00,000' },
  { id: 2, title: 'DST INSPIRE Fellowship', status: 'Under Review', date: '2026-07-10', amount: '₹35,000/mo' },
  { id: 3, title: 'ICSSR Doctoral Fellowship', status: 'Approved', date: '2026-06-15', amount: '₹8,00,000' },
]

const MOCK_DEADLINES = [
  { id: 1, title: 'UGC Major Research Project', date: '2026-09-15', daysLeft: 44, priority: 'medium' },
  { id: 2, title: 'CSIR Senior Research Fellowship', date: '2026-08-20', daysLeft: 18, priority: 'high' },
  { id: 3, title: 'ICSSR Research Fellowship', date: '2026-08-30', daysLeft: 28, priority: 'high' },
  { id: 4, title: 'DST SERB Core Research Grant', date: '2026-10-01', daysLeft: 60, priority: 'low' },
  { id: 5, title: 'AICTE Research Promotion', date: '2026-09-30', daysLeft: 59, priority: 'low' },
]

export default function OrgAdminDashboard() {
  const navigate = useNavigate()
  const [activeSection, setActiveSection] = useState('home')
  const [orgName, setOrgName] = useState('')
  const [userName, setUserName] = useState('')
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Team management state
  const [members, setMembers] = useState([])
  const [memberCounts, setMemberCounts] = useState({ total: 0, verified: 0, pending: 0 })
  const [membersLoading, setMembersLoading] = useState(false)
  const [taskModalMember, setTaskModalMember] = useState(null)
  const [selectedTasks, setSelectedTasks] = useState([])
  const [actionLoading, setActionLoading] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/auth/me')
        if (res.data.success) {
          setUserName(res.data.user.fullName)
          if (res.data.orgStatus) {
            setOrgName(res.data.orgStatus.organizationName)
          }
        }
      } catch (err) {
        console.error('Failed to fetch user data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Fetch members when team section is active
  useEffect(() => {
    if (activeSection === 'team' || activeSection === 'home') {
      fetchMembers()
    }
  }, [activeSection])

  const fetchMembers = async () => {
    setMembersLoading(true)
    try {
      const res = await api.get('/member/list')
      if (res.data.success) {
        setMembers(res.data.members)
        setMemberCounts(res.data.counts)
      }
    } catch (err) {
      console.error('Failed to fetch members:', err)
    } finally {
      setMembersLoading(false)
    }
  }

  const handleVerifyMember = async (memberId) => {
    setActionLoading(memberId)
    try {
      const res = await api.put(`/member/${memberId}/verify`)
      if (res.data.success) {
        fetchMembers()
      }
    } catch (err) {
      console.error('Verify error:', err)
    } finally {
      setActionLoading('')
    }
  }

  const handleRejectMember = async (memberId) => {
    setActionLoading(memberId)
    try {
      const res = await api.delete(`/member/${memberId}/reject`)
      if (res.data.success) {
        fetchMembers()
      }
    } catch (err) {
      console.error('Reject error:', err)
    } finally {
      setActionLoading('')
    }
  }

  const openTaskModal = (member) => {
    setTaskModalMember(member)
    setSelectedTasks(member.assignedTasks || [])
  }

  const toggleTask = (taskKey) => {
    setSelectedTasks((prev) =>
      prev.includes(taskKey)
        ? prev.filter((t) => t !== taskKey)
        : [...prev, taskKey]
    )
  }

  const handleAssignTasks = async () => {
    if (!taskModalMember) return
    setActionLoading(taskModalMember._id)
    try {
      const res = await api.put(`/member/${taskModalMember._id}/assign-task`, {
        tasks: selectedTasks,
      })
      if (res.data.success) {
        setTaskModalMember(null)
        fetchMembers()
      }
    } catch (err) {
      console.error('Assign task error:', err)
    } finally {
      setActionLoading('')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('grantos_token')
    localStorage.removeItem('grantos_user')
    navigate('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const pendingMembers = members.filter((m) => !m.isVerified)
  const verifiedMembers = members.filter((m) => m.isVerified)

  return (
    <div className="min-h-screen bg-cream flex">
      {/* ─── Sidebar ─── */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-surface-elevated border-r border-warm-gray-200/60 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-warm-gray-200/60">
            <Link to="/" className="flex items-center gap-2 group" id="admin-dash-logo">
              <div className="w-9 h-9 bg-primary rounded-[10px] flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-105">
                <LeafIcon />
              </div>
              <span className="font-heading text-xl font-semibold text-warm-gray-900 tracking-tight">
                Grant<span className="text-primary">OS</span>
              </span>
            </Link>
            {orgName && (
              <p className="text-xs text-warm-gray-500 mt-2 truncate">{orgName}</p>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                onClick={() => { setActiveSection(item.key); setSidebarOpen(false) }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-[12px] text-sm font-medium transition-all duration-200 cursor-pointer ${
                  activeSection === item.key
                    ? 'bg-primary text-white shadow-soft'
                    : 'text-warm-gray-600 hover:bg-warm-gray-50 hover:text-warm-gray-900'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
                {item.key === 'team' && memberCounts.pending > 0 && (
                  <span className="ml-auto px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                    {memberCounts.pending}
                  </span>
                )}
              </button>
            ))}
          </nav>

          {/* User */}
          <div className="p-4 border-t border-warm-gray-200/60">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center text-primary font-bold text-sm">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-warm-gray-900 truncate">{userName}</p>
                <p className="text-xs text-warm-gray-500">Org Admin</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 rounded-[10px] text-sm text-warm-gray-500 hover:text-warm-gray-700 hover:bg-warm-gray-50 transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ─── Main Content ─── */}
      <main className="flex-1 lg:ml-64">
        {/* Top bar (mobile) */}
        <header className="lg:hidden sticky top-0 z-30 bg-surface-elevated border-b border-warm-gray-200/60 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-warm-gray-600 cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="font-heading font-semibold text-warm-gray-900">Grant<span className="text-primary">OS</span></span>
          <div className="w-8" />
        </header>

        <div className="p-6 lg:p-10 max-w-7xl mx-auto">
          {/* ═══════════════════════════════════ HOME ═══════════════════════════════════ */}
          {activeSection === 'home' && (
            <div className="animate-fade-up">
              <div className="mb-8">
                <h1 className="font-heading text-3xl sm:text-4xl font-bold text-warm-gray-900 mb-2">
                  Welcome back, {userName.split(' ')[0]} 👋
                </h1>
                <p className="text-warm-gray-500">Here's your organization overview for today</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
                {[
                  { label: 'Team Members', value: memberCounts.total, icon: '👥', accent: 'bg-blue-50 text-blue-600' },
                  { label: 'Pending Requests', value: memberCounts.pending, icon: '⏳', accent: 'bg-amber-50 text-amber' },
                  { label: 'Active Grants', value: 3, icon: '📋', accent: 'bg-green-50 text-green-600' },
                  { label: 'Total Funding', value: '₹33L', icon: '💰', accent: 'bg-purple-50 text-purple-600' },
                ].map((stat, i) => (
                  <div
                    key={stat.label}
                    className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-6 hover:shadow-medium hover:-translate-y-0.5 transition-all duration-300 animate-fade-up"
                    style={{ animationDelay: `${0.1 * (i + 1)}s` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={`w-10 h-10 rounded-[10px] flex items-center justify-center text-lg ${stat.accent}`}>
                        {stat.icon}
                      </span>
                    </div>
                    <p className="font-heading text-2xl font-bold text-warm-gray-900">{stat.value}</p>
                    <p className="text-sm text-warm-gray-500 mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pending Requests Preview */}
                <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-heading font-bold text-warm-gray-900">Pending Member Requests</h3>
                    {memberCounts.pending > 0 && (
                      <button onClick={() => setActiveSection('team')} className="text-sm text-primary font-semibold hover:text-primary-dark transition-colors cursor-pointer">
                        View All →
                      </button>
                    )}
                  </div>
                  {pendingMembers.length === 0 ? (
                    <p className="text-sm text-warm-gray-400 py-4 text-center">No pending requests 🎉</p>
                  ) : (
                    <div className="space-y-3">
                      {pendingMembers.slice(0, 3).map((m) => (
                        <div key={m._id} className="flex items-center justify-between p-3 rounded-[10px] bg-cream border border-warm-gray-200/60">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber font-bold text-xs">
                              {m.fullName.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-warm-gray-800">{m.fullName}</p>
                              <p className="text-xs text-warm-gray-500">{m.email}</p>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber text-[10px] font-bold border border-amber/15">Pending</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Upcoming Deadlines Preview */}
                <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-heading font-bold text-warm-gray-900">Upcoming Deadlines</h3>
                    <button onClick={() => setActiveSection('deadlines')} className="text-sm text-primary font-semibold hover:text-primary-dark transition-colors cursor-pointer">
                      View All →
                    </button>
                  </div>
                  <div className="space-y-3">
                    {MOCK_DEADLINES.slice(0, 3).map((d) => (
                      <div key={d.id} className="flex items-center justify-between p-3 rounded-[10px] bg-cream border border-warm-gray-200/60">
                        <div>
                          <p className="text-sm font-semibold text-warm-gray-800">{d.title}</p>
                          <p className="text-xs text-warm-gray-500">{d.date}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          d.priority === 'high'
                            ? 'bg-red-50 text-red-600 border-red-200'
                            : d.priority === 'medium'
                              ? 'bg-amber-50 text-amber border-amber/15'
                              : 'bg-green-50 text-green-600 border-green-200'
                        }`}>
                          {d.daysLeft}d left
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════ GRANTS ═══════════════════════════════════ */}
          {activeSection === 'grants' && (
            <div className="animate-fade-up">
              <div className="mb-8">
                <h1 className="font-heading text-3xl font-bold text-warm-gray-900 mb-2">Grant Discovery</h1>
                <p className="text-warm-gray-500">Find and apply for grants matching your organization profile</p>
              </div>

              {/* Search Bar */}
              <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-6 mb-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-warm-gray-400">🔍</span>
                    <input
                      type="text"
                      placeholder="Search grants by name, agency, or keyword..."
                      className="w-full pl-11 pr-4 py-3 rounded-[12px] bg-cream border border-warm-gray-200 text-warm-gray-900 placeholder:text-warm-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      id="grant-search-input"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select className="px-4 py-3 rounded-[12px] bg-cream border border-warm-gray-200 text-warm-gray-600 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer" id="grant-category-filter">
                      <option>All Categories</option>
                      <option>Research</option>
                      <option>Fellowship</option>
                      <option>Infrastructure</option>
                      <option>Science</option>
                    </select>
                    <select className="px-4 py-3 rounded-[12px] bg-cream border border-warm-gray-200 text-warm-gray-600 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer" id="grant-status-filter">
                      <option>All Status</option>
                      <option>Open</option>
                      <option>Closing Soon</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Grants Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {MOCK_GRANTS.map((grant, i) => (
                  <div
                    key={grant.id}
                    className="group bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-6 hover:shadow-medium hover:-translate-y-0.5 transition-all duration-300 animate-fade-up"
                    style={{ animationDelay: `${0.1 * (i + 1)}s` }}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-heading text-base font-bold text-warm-gray-900 group-hover:text-primary transition-colors mb-1">{grant.title}</h3>
                        <p className="text-xs text-warm-gray-500">{grant.agency}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        grant.status === 'Closing Soon'
                          ? 'bg-red-50 text-red-600 border-red-200'
                          : 'bg-green-50 text-green-600 border-green-200'
                      }`}>
                        {grant.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mb-4">
                      <span className="text-sm font-bold text-warm-gray-900">{grant.amount}</span>
                      <span className="text-xs text-warm-gray-400">•</span>
                      <span className="text-xs text-warm-gray-500">Deadline: {grant.deadline}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-full bg-cream text-warm-gray-600 text-xs font-medium border border-warm-gray-200/60">
                        {grant.category}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-warm-gray-100 overflow-hidden">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${grant.match}%` }} />
                        </div>
                        <span className="text-xs font-bold text-primary">{grant.match}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════ APPLICATIONS ═══════════════════════════════════ */}
          {activeSection === 'applications' && (
            <div className="animate-fade-up">
              <div className="mb-8">
                <h1 className="font-heading text-3xl font-bold text-warm-gray-900 mb-2">Applications</h1>
                <p className="text-warm-gray-500">Track all your grant applications in one place</p>
              </div>

              {/* Status summary */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { label: 'Submitted', count: 1, color: 'bg-blue-50 text-blue-600 border-blue-200' },
                  { label: 'Under Review', count: 1, color: 'bg-amber-50 text-amber border-amber/15' },
                  { label: 'Approved', count: 1, color: 'bg-green-50 text-green-600 border-green-200' },
                ].map((s) => (
                  <div key={s.label} className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-5 text-center">
                    <p className="font-heading text-2xl font-bold text-warm-gray-900">{s.count}</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border mt-2 ${s.color}`}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Applications list */}
              <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft overflow-hidden">
                <div className="divide-y divide-warm-gray-200/60">
                  {MOCK_APPLICATIONS.map((app, i) => (
                    <div key={app.id} className="p-5 hover:bg-cream/50 transition-colors animate-fade-up" style={{ animationDelay: `${0.1 * (i + 1)}s` }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-heading font-bold text-warm-gray-900 mb-1">{app.title}</h3>
                          <div className="flex items-center gap-3 text-xs text-warm-gray-500">
                            <span>Submitted: {app.date}</span>
                            <span>•</span>
                            <span>Amount: {app.amount}</span>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                          app.status === 'Approved'
                            ? 'bg-green-50 text-green-600 border-green-200'
                            : app.status === 'Under Review'
                              ? 'bg-amber-50 text-amber border-amber/15'
                              : 'bg-blue-50 text-blue-600 border-blue-200'
                        }`}>
                          {app.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════ TEAM MANAGEMENT ═══════════════════════════════════ */}
          {activeSection === 'team' && (
            <div className="animate-fade-up">
              <div className="mb-8">
                <h1 className="font-heading text-3xl font-bold text-warm-gray-900 mb-2">Team Management</h1>
                <p className="text-warm-gray-500">Manage team members and assign tasks</p>
              </div>

              {/* Member stats */}
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  { label: 'Total Members', value: memberCounts.total, icon: '👥', color: 'bg-blue-50' },
                  { label: 'Verified', value: memberCounts.verified, icon: '✅', color: 'bg-green-50' },
                  { label: 'Pending', value: memberCounts.pending, icon: '⏳', color: 'bg-amber-50' },
                ].map((s) => (
                  <div key={s.label} className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-5 text-center">
                    <span className={`w-10 h-10 rounded-[10px] flex items-center justify-center text-lg mx-auto mb-2 ${s.color}`}>{s.icon}</span>
                    <p className="font-heading text-2xl font-bold text-warm-gray-900">{s.value}</p>
                    <p className="text-xs text-warm-gray-500">{s.label}</p>
                  </div>
                ))}
              </div>

              {membersLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {/* Pending Requests */}
                  {pendingMembers.length > 0 && (
                    <div className="mb-8">
                      <h2 className="font-heading text-xl font-bold text-warm-gray-900 mb-4 flex items-center gap-2">
                        <span className="text-amber">⏳</span> Pending Verification
                        <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber text-xs font-bold border border-amber/15">{pendingMembers.length}</span>
                      </h2>
                      <div className="space-y-3">
                        {pendingMembers.map((m, i) => (
                          <div key={m._id} className="bg-surface-elevated rounded-[16px] border border-amber/20 shadow-soft p-5 flex items-center justify-between animate-fade-up" style={{ animationDelay: `${0.1 * (i + 1)}s` }}>
                            <div className="flex items-center gap-4">
                              <div className="w-11 h-11 rounded-full bg-amber-50 flex items-center justify-center text-amber font-bold">
                                {m.fullName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-warm-gray-900">{m.fullName}</p>
                                <p className="text-sm text-warm-gray-500">{m.email}</p>
                                <p className="text-xs text-warm-gray-400 mt-0.5">Joined: {new Date(m.createdAt).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleVerifyMember(m._id)}
                                disabled={actionLoading === m._id}
                                className="px-4 py-2 rounded-[10px] text-sm font-semibold text-white bg-primary hover:bg-primary-dark shadow-soft transition-all duration-200 cursor-pointer disabled:opacity-50"
                              >
                                {actionLoading === m._id ? '...' : 'Approve'}
                              </button>
                              <button
                                onClick={() => handleRejectMember(m._id)}
                                disabled={actionLoading === m._id}
                                className="px-4 py-2 rounded-[10px] text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-all duration-200 cursor-pointer disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Verified Members */}
                  <div>
                    <h2 className="font-heading text-xl font-bold text-warm-gray-900 mb-4 flex items-center gap-2">
                      <span className="text-primary">✅</span> Verified Members
                      <span className="px-2 py-0.5 rounded-full bg-primary-50 text-primary text-xs font-bold border border-primary/15">{verifiedMembers.length}</span>
                    </h2>
                    {verifiedMembers.length === 0 ? (
                      <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-10 text-center">
                        <span className="text-4xl mb-3 block">👥</span>
                        <p className="text-warm-gray-500">No verified team members yet</p>
                        <p className="text-sm text-warm-gray-400 mt-1">Approve pending requests to add members</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {verifiedMembers.map((m, i) => (
                          <div key={m._id} className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-5 animate-fade-up" style={{ animationDelay: `${0.1 * (i + 1)}s` }}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-11 h-11 rounded-full bg-primary-50 flex items-center justify-center text-primary font-bold">
                                  {m.fullName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-semibold text-warm-gray-900">{m.fullName}</p>
                                  <p className="text-sm text-warm-gray-500">{m.email}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => openTaskModal(m)}
                                className="px-4 py-2 rounded-[10px] text-sm font-semibold text-primary bg-primary-50 hover:bg-primary-100 border border-primary/15 transition-all duration-200 cursor-pointer"
                              >
                                {m.assignedTasks?.length > 0 ? 'Edit Tasks' : 'Assign Tasks'}
                              </button>
                            </div>
                            {/* Assigned tasks display */}
                            {m.assignedTasks?.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-3 pl-15">
                                {m.assignedTasks.map((t) => {
                                  const taskInfo = TASK_TYPES.find((tt) => tt.key === t)
                                  return taskInfo ? (
                                    <span key={t} className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${taskInfo.color}`}>
                                      {taskInfo.icon} {taskInfo.label}
                                    </span>
                                  ) : null
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════ DEADLINES ═══════════════════════════════════ */}
          {activeSection === 'deadlines' && (
            <div className="animate-fade-up">
              <div className="mb-8">
                <h1 className="font-heading text-3xl font-bold text-warm-gray-900 mb-2">Deadline Alerts</h1>
                <p className="text-warm-gray-500">Never miss a grant deadline</p>
              </div>

              <div className="space-y-4">
                {MOCK_DEADLINES.map((d, i) => (
                  <div
                    key={d.id}
                    className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-6 flex items-center justify-between hover:shadow-medium hover:-translate-y-0.5 transition-all duration-300 animate-fade-up"
                    style={{ animationDelay: `${0.1 * (i + 1)}s` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-[12px] flex items-center justify-center text-lg ${
                        d.priority === 'high' ? 'bg-red-50' : d.priority === 'medium' ? 'bg-amber-50' : 'bg-green-50'
                      }`}>
                        {d.priority === 'high' ? '🔴' : d.priority === 'medium' ? '🟡' : '🟢'}
                      </div>
                      <div>
                        <h3 className="font-heading font-bold text-warm-gray-900">{d.title}</h3>
                        <p className="text-sm text-warm-gray-500">Deadline: {d.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-heading text-xl font-bold ${
                        d.daysLeft <= 20 ? 'text-red-600' : d.daysLeft <= 45 ? 'text-amber' : 'text-green-600'
                      }`}>{d.daysLeft}</p>
                      <p className="text-xs text-warm-gray-500">days left</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════ ANALYTICS ═══════════════════════════════════ */}
          {activeSection === 'analytics' && (
            <div className="animate-fade-up">
              <div className="mb-8">
                <h1 className="font-heading text-3xl font-bold text-warm-gray-900 mb-2">Analytics & Reports</h1>
                <p className="text-warm-gray-500">Track your organization's grant performance</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Funding Chart placeholder */}
                <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-6">
                  <h3 className="font-heading font-bold text-warm-gray-900 mb-4">Funding Received</h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Q1 2026', value: 45 },
                      { label: 'Q2 2026', value: 72 },
                      { label: 'Q3 2026', value: 38 },
                    ].map((q) => (
                      <div key={q.label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-warm-gray-600">{q.label}</span>
                          <span className="font-bold text-warm-gray-900">₹{q.value}L</span>
                        </div>
                        <div className="w-full h-3 rounded-full bg-warm-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-primary to-primary-light transition-all duration-700"
                            style={{ width: `${q.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Success Rate */}
                <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-6">
                  <h3 className="font-heading font-bold text-warm-gray-900 mb-4">Application Success Rate</h3>
                  <div className="flex items-center justify-center py-6">
                    <div className="relative w-32 h-32">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e2ddd4" strokeWidth="3" />
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#4a7c59" strokeWidth="3" strokeDasharray="67, 100" strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center flex-col">
                        <span className="font-heading text-2xl font-bold text-primary">67%</span>
                        <span className="text-[10px] text-warm-gray-500">Success Rate</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center mt-4">
                    <div><p className="font-bold text-warm-gray-900">6</p><p className="text-[10px] text-warm-gray-500">Applied</p></div>
                    <div><p className="font-bold text-green-600">4</p><p className="text-[10px] text-warm-gray-500">Won</p></div>
                    <div><p className="font-bold text-red-500">2</p><p className="text-[10px] text-warm-gray-500">Rejected</p></div>
                  </div>
                </div>
              </div>

              <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-6">
                <h3 className="font-heading font-bold text-warm-gray-900 mb-4">Grant Distribution by Category</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Research', pct: 45, color: 'bg-blue-500' },
                    { label: 'Fellowship', pct: 25, color: 'bg-purple-500' },
                    { label: 'Infrastructure', pct: 20, color: 'bg-green-500' },
                    { label: 'Other', pct: 10, color: 'bg-amber' },
                  ].map((cat) => (
                    <div key={cat.label} className="text-center">
                      <div className="w-full h-24 bg-warm-gray-100 rounded-[10px] relative overflow-hidden mb-2">
                        <div className={`absolute bottom-0 left-0 right-0 ${cat.color} rounded-b-[10px] transition-all duration-700`} style={{ height: `${cat.pct}%` }} />
                      </div>
                      <p className="text-sm font-semibold text-warm-gray-900">{cat.pct}%</p>
                      <p className="text-xs text-warm-gray-500">{cat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ─── Task Assignment Modal ─── */}
      {taskModalMember && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setTaskModalMember(null)} />
          <div className="relative bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-medium w-full max-w-md p-8 animate-fade-up">
            <h2 className="font-heading text-xl font-bold text-warm-gray-900 mb-1">Assign Tasks</h2>
            <p className="text-sm text-warm-gray-500 mb-6">Select tasks for <strong>{taskModalMember.fullName}</strong></p>

            <div className="space-y-3 mb-8">
              {TASK_TYPES.map((task) => (
                <label
                  key={task.key}
                  className={`flex items-center gap-3 p-3 rounded-[12px] border-2 cursor-pointer transition-all duration-200 ${
                    selectedTasks.includes(task.key)
                      ? 'border-primary bg-primary-50'
                      : 'border-warm-gray-200 bg-cream hover:border-warm-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedTasks.includes(task.key)}
                    onChange={() => toggleTask(task.key)}
                    className="sr-only"
                  />
                  <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    selectedTasks.includes(task.key)
                      ? 'border-primary bg-primary text-white'
                      : 'border-warm-gray-300'
                  }`}>
                    {selectedTasks.includes(task.key) && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                  <span className="text-lg">{task.icon}</span>
                  <span className="text-sm font-semibold text-warm-gray-900">{task.label}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAssignTasks}
                disabled={actionLoading === taskModalMember._id}
                className="flex-1 py-3 rounded-[12px] font-semibold text-white bg-primary hover:bg-primary-dark shadow-soft transition-all duration-300 cursor-pointer disabled:opacity-50"
              >
                {actionLoading === taskModalMember._id ? 'Saving...' : 'Save Tasks'}
              </button>
              <button
                onClick={() => setTaskModalMember(null)}
                className="px-6 py-3 rounded-[12px] font-semibold text-warm-gray-600 border-2 border-warm-gray-200 hover:border-warm-gray-300 transition-all duration-200 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
