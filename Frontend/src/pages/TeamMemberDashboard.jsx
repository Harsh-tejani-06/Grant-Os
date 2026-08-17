import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'
import ProposalWritingWorkspace from '../components/ProposalWritingWorkspace'

const LeafIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 1 8-1 3.5-3 5-5 7" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
)

// ─── Task-to-feature mapping ───
const TASK_FEATURES = {
  grant_discovery: {
    key: 'grant_discovery',
    label: 'Grant Discovery',
    icon: '🔍',
    color: 'from-blue-500 to-blue-600',
    bgLight: 'bg-blue-50',
    description: 'Browse and discover grants matching your organization\'s profile',
    features: [
      { title: 'Search Grants', desc: 'Search from 500+ active grants across 50+ funding agencies', icon: '🔎' },
      { title: 'Smart Matching', desc: 'AI-powered grant recommendations based on your research profile', icon: '🎯' },
      { title: 'Filter & Sort', desc: 'Filter by category, amount, deadline, and eligibility criteria', icon: '📊' },
      { title: 'Save Grants', desc: 'Bookmark interesting grants for later review and team discussion', icon: '⭐' },
    ],
    staticContent: [
      { title: 'UGC Major Research Project', agency: 'University Grants Commission', amount: '₹25,00,000', deadline: '2026-09-15', match: 95 },
      { title: 'DST SERB Core Research Grant', agency: 'Dept. of Science & Technology', amount: '₹50,00,000', deadline: '2026-10-01', match: 88 },
      { title: 'ICSSR Research Fellowship', agency: 'ICSSR', amount: '₹8,00,000', deadline: '2026-08-30', match: 82 },
    ],
  },
  proposal_writing: {
    key: 'proposal_writing',
    label: 'Proposal Writing',
    icon: '📝',
    color: 'from-purple-500 to-purple-600',
    bgLight: 'bg-purple-50',
    description: 'Draft, review, and submit compelling grant proposals with the 17-section template',
    features: [
      { title: '17-Section Master Template', desc: 'Pre-built standard sections covering Budget, Research, Timeline, and Ethics', icon: '📄' },
      { title: 'Collaborative Editor', desc: 'Section-based editing with role assignments and comment threads', icon: '✍️' },
      { title: 'Gemini AI Assistant', desc: 'Generate section drafts, polish academic tone, and verify compliance', icon: '🤖' },
      { title: 'Status Tracking', desc: 'Track section progress from draft to Ready for Review', icon: '📤' },
    ],
    staticContent: [],
  },
}

export default function TeamMemberDashboard() {
  const navigate = useNavigate()
  const [userName, setUserName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [assignedTasks, setAssignedTasks] = useState([])
  const [activeTask, setActiveTask] = useState('')
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/auth/me')
        if (res.data.success) {
          setUserName(res.data.user.fullName)
          const userTasks = (res.data.user.assignedTasks && res.data.user.assignedTasks.length > 0)
            ? res.data.user.assignedTasks
            : ['proposal_writing', 'grant_discovery']
          setAssignedTasks(userTasks)
          if (res.data.orgStatus) {
            setOrgName(res.data.orgStatus.organizationName)
          }
          // Default to proposal_writing
          setActiveTask(userTasks.includes('proposal_writing') ? 'proposal_writing' : userTasks[0])
        }
      } catch (err) {
        console.error('Failed to fetch user data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

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

  // No tasks assigned
  if (assignedTasks.length === 0) {
    return (
      <div className="min-h-screen bg-cream flex flex-col">
        <header className="bg-surface-elevated border-b border-warm-gray-200/60 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 bg-primary rounded-[10px] flex items-center justify-center text-white"><LeafIcon /></div>
              <span className="font-heading text-xl font-semibold text-warm-gray-900 tracking-tight">Grant<span className="text-primary">OS</span></span>
            </Link>
            <button onClick={handleLogout} className="text-sm text-warm-gray-500 hover:text-warm-gray-700 font-medium transition-colors cursor-pointer">Sign Out</button>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">📋</span>
            </div>
            <h1 className="font-heading text-3xl font-bold text-warm-gray-900 mb-4">No Tasks Assigned Yet</h1>
            <p className="text-warm-gray-500 mb-2">Your Organization Admin hasn't assigned any tasks to you yet.</p>
            <p className="text-sm text-warm-gray-400">Once tasks are assigned, you'll see the relevant features and tools here.</p>
            {orgName && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 border border-primary/15 mt-6">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-sm font-semibold text-primary">{orgName}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const activeFeature = TASK_FEATURES[activeTask]

  return (
    <div className="min-h-screen bg-cream flex">
      {/* ─── Sidebar ─── */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-surface-elevated border-r border-warm-gray-200/60 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-warm-gray-200/60">
            <Link to="/" className="flex items-center gap-2 group" id="member-dash-logo">
              <div className="w-9 h-9 bg-primary rounded-[10px] flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-105"><LeafIcon /></div>
              <span className="font-heading text-xl font-semibold text-warm-gray-900 tracking-tight">Grant<span className="text-primary">OS</span></span>
            </Link>
            {orgName && <p className="text-xs text-warm-gray-500 mt-2 truncate">{orgName}</p>}
          </div>

          {/* Task Nav */}
          <div className="p-4">
            <p className="text-[10px] font-bold text-warm-gray-400 uppercase tracking-wider mb-3 px-2">My Tasks</p>
            <nav className="space-y-1">
              {assignedTasks.map((taskKey) => {
                const task = TASK_FEATURES[taskKey]
                if (!task) return null
                return (
                  <button
                    key={taskKey}
                    onClick={() => { setActiveTask(taskKey); setSidebarOpen(false) }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-[12px] text-sm font-medium transition-all duration-200 cursor-pointer ${activeTask === taskKey
                        ? 'bg-primary text-white shadow-soft'
                        : 'text-warm-gray-600 hover:bg-warm-gray-50 hover:text-warm-gray-900'
                      }`}
                  >
                    <span className="text-lg">{task.icon}</span>
                    {task.label}
                  </button>
                )
              })}
            </nav>
          </div>

          <div className="flex-1" />

          {/* User */}
          <div className="p-4 border-t border-warm-gray-200/60">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center text-primary font-bold text-sm">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-warm-gray-900 truncate">{userName}</p>
                <p className="text-xs text-warm-gray-500">Team Member</p>
              </div>
            </div>
            <button onClick={handleLogout} className="w-full px-4 py-2 rounded-[10px] text-sm text-warm-gray-500 hover:text-warm-gray-700 hover:bg-warm-gray-50 transition-colors cursor-pointer">
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/20 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ─── Main Content ─── */}
      <main className="flex-1 lg:ml-64">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-surface-elevated border-b border-warm-gray-200/60 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-warm-gray-600 cursor-pointer">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="font-heading font-semibold text-warm-gray-900">Grant<span className="text-primary">OS</span></span>
          <div className="w-8" />
        </header>

        {activeFeature && (
          <div className="p-6 lg:p-10 max-w-7xl mx-auto">
            {/* Direct Proposal Writing Workspace */}
            {activeTask === 'proposal_writing' ? (
              <ProposalWritingWorkspace userName={userName} />
            ) : (
              <>
                {/* Hero Banner for other tasks */}
                <div className={`relative bg-gradient-to-r ${activeFeature.color} rounded-[20px] overflow-hidden mb-8 animate-fade-up`}>
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute -top-20 -right-20 w-60 h-60 bg-white rounded-full blur-3xl" />
                    <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-white rounded-full blur-3xl" />
                  </div>
                  <div className="relative z-10 p-8 sm:p-10">
                    <span className="text-4xl mb-3 block">{activeFeature.icon}</span>
                    <h1 className="font-heading text-3xl sm:text-4xl font-bold text-white mb-2">{activeFeature.label}</h1>
                    <p className="text-white/80 max-w-lg">{activeFeature.description}</p>
                  </div>
                </div>

                {/* Static Content Section */}
                <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft overflow-hidden">
                  <div className="px-6 py-4 border-b border-warm-gray-200/60">
                    <h2 className="font-heading font-bold text-warm-gray-900">{activeFeature.label} — Overview</h2>
                  </div>

                  {/* Grant Discovery content */}
                  {activeTask === 'grant_discovery' && (
                    <div className="divide-y divide-warm-gray-200/60">
                      {activeFeature.staticContent.map((g, i) => (
                        <div key={i} className="p-5 hover:bg-cream/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold text-warm-gray-900 mb-1">{g.title}</h3>
                              <p className="text-xs text-warm-gray-500">{g.agency} • Deadline: {g.deadline}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-warm-gray-900 text-sm">{g.amount}</p>
                              <div className="flex items-center gap-1 mt-1">
                                <div className="w-12 h-1.5 rounded-full bg-warm-gray-100 overflow-hidden">
                                  <div className="h-full rounded-full bg-primary" style={{ width: `${g.match}%` }} />
                                </div>
                                <span className="text-[10px] font-bold text-primary">{g.match}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
