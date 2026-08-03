import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'

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
    description: 'Draft, review, and submit compelling grant proposals',
    features: [
      { title: 'Proposal Templates', desc: 'Pre-built templates for UGC, DST, ICSSR, and more', icon: '📄' },
      { title: 'Collaborative Editor', desc: 'Real-time editing with version control and commenting', icon: '✍️' },
      { title: 'AI Writing Assistant', desc: 'Get suggestions to strengthen your proposal narrative', icon: '🤖' },
      { title: 'Submission Tracker', desc: 'Track proposal status from draft to final submission', icon: '📤' },
    ],
    staticContent: [
      { title: 'Draft: UGC Research Proposal', status: 'In Progress', progress: 65, lastEdited: '2 hours ago' },
      { title: 'DST SERB Application', status: 'Review', progress: 90, lastEdited: '1 day ago' },
      { title: 'ICSSR Fellowship Application', status: 'Submitted', progress: 100, lastEdited: '3 days ago' },
    ],
  },
  budget_planning: {
    key: 'budget_planning',
    label: 'Budget Planning',
    icon: '💰',
    color: 'from-green-500 to-green-600',
    bgLight: 'bg-green-50',
    description: 'Create and manage grant budgets with compliance tracking',
    features: [
      { title: 'Budget Builder', desc: 'Drag-and-drop budget creation with category templates', icon: '📋' },
      { title: 'Expense Tracker', desc: 'Track spending against approved budget line items', icon: '💳' },
      { title: 'Compliance Alerts', desc: 'Automatic alerts when spending approaches limits', icon: '🔔' },
      { title: 'Financial Reports', desc: 'Generate utilization certificates and financial statements', icon: '📊' },
    ],
    staticContent: [
      { category: 'Equipment', allocated: '₹8,00,000', spent: '₹3,50,000', pct: 44 },
      { category: 'Personnel', allocated: '₹10,00,000', spent: '₹6,20,000', pct: 62 },
      { category: 'Travel', allocated: '₹3,00,000', spent: '₹80,000', pct: 27 },
      { category: 'Consumables', allocated: '₹4,00,000', spent: '₹2,10,000', pct: 53 },
    ],
  },
  research: {
    key: 'research',
    label: 'Research',
    icon: '🔬',
    color: 'from-indigo-500 to-indigo-600',
    bgLight: 'bg-indigo-50',
    description: 'Access research resources, publications, and collaboration tools',
    features: [
      { title: 'Literature Database', desc: 'Access millions of research papers and citation indexes', icon: '📚' },
      { title: 'Research Dashboard', desc: 'Track research progress, milestones, and deliverables', icon: '📈' },
      { title: 'Collaboration Hub', desc: 'Connect with researchers and co-PIs across institutions', icon: '🤝' },
      { title: 'Data Repository', desc: 'Securely store and share research data and findings', icon: '🗄️' },
    ],
    staticContent: [
      { title: 'Literature Review — AI in Education', status: 'In Progress', papers: 45, lastUpdated: 'Today' },
      { title: 'Experimental Data — Phase 2', status: 'Complete', papers: 12, lastUpdated: '1 week ago' },
      { title: 'Meta-Analysis — Climate Studies', status: 'Planned', papers: 0, lastUpdated: 'Not started' },
    ],
  },
  compliance: {
    key: 'compliance',
    label: 'Compliance',
    icon: '✅',
    color: 'from-orange-500 to-orange-600',
    bgLight: 'bg-orange-50',
    description: 'Ensure grant compliance with funding agency guidelines',
    features: [
      { title: 'Compliance Checklist', desc: 'Step-by-step checklists for each funding agency', icon: '☑️' },
      { title: 'Document Vault', desc: 'Store and manage required compliance documents', icon: '🔒' },
      { title: 'Audit Trail', desc: 'Complete audit history for all grant activities', icon: '📋' },
      { title: 'Policy Updates', desc: 'Real-time updates on funding agency policy changes', icon: '📢' },
    ],
    staticContent: [
      { item: 'Ethics Committee Approval', status: 'Complete', dueDate: '2026-07-01' },
      { item: 'Annual Progress Report', status: 'Due Soon', dueDate: '2026-08-15' },
      { item: 'Utilization Certificate', status: 'Pending', dueDate: '2026-09-30' },
      { item: 'Institutional Agreement', status: 'Complete', dueDate: '2026-06-15' },
    ],
  },
  reporting: {
    key: 'reporting',
    label: 'Reporting',
    icon: '📊',
    color: 'from-teal-500 to-teal-600',
    bgLight: 'bg-teal-50',
    description: 'Generate comprehensive reports for funding agencies and stakeholders',
    features: [
      { title: 'Report Generator', desc: 'Auto-generate reports from your project data', icon: '📝' },
      { title: 'Visual Analytics', desc: 'Interactive charts and dashboards for impact metrics', icon: '📈' },
      { title: 'Progress Tracking', desc: 'Track project milestones and deliverable completion', icon: '🎯' },
      { title: 'Export & Share', desc: 'Export reports in PDF, Excel, or share via secure links', icon: '📤' },
    ],
    staticContent: [
      { title: 'Q2 2026 Progress Report', status: 'Submitted', format: 'PDF', date: '2026-07-15' },
      { title: 'Annual Financial Statement', status: 'Draft', format: 'Excel', date: '2026-07-28' },
      { title: 'Impact Assessment Report', status: 'Planned', format: 'PDF', date: '2026-09-01' },
    ],
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
          setAssignedTasks(res.data.user.assignedTasks || [])
          if (res.data.orgStatus) {
            setOrgName(res.data.orgStatus.organizationName)
          }
          // Set first task as active
          if (res.data.user.assignedTasks?.length > 0) {
            setActiveTask(res.data.user.assignedTasks[0])
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
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-[12px] text-sm font-medium transition-all duration-200 cursor-pointer ${
                      activeTask === taskKey
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
          <div className="p-6 lg:p-10 max-w-6xl mx-auto">
            {/* Hero Banner */}
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

            {/* Feature Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
              {activeFeature.features.map((f, i) => (
                <div
                  key={f.title}
                  className="group bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-6 hover:shadow-medium hover:-translate-y-0.5 transition-all duration-300 animate-fade-up"
                  style={{ animationDelay: `${0.1 * (i + 1)}s` }}
                >
                  <span className="text-2xl mb-3 block">{f.icon}</span>
                  <h3 className="font-heading text-base font-bold text-warm-gray-900 mb-2 group-hover:text-primary transition-colors">{f.title}</h3>
                  <p className="text-sm text-warm-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
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

              {/* Proposal Writing content */}
              {activeTask === 'proposal_writing' && (
                <div className="divide-y divide-warm-gray-200/60">
                  {activeFeature.staticContent.map((p, i) => (
                    <div key={i} className="p-5 hover:bg-cream/50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-warm-gray-900">{p.title}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          p.status === 'Submitted' ? 'bg-green-50 text-green-600 border-green-200'
                            : p.status === 'Review' ? 'bg-amber-50 text-amber border-amber/15'
                              : 'bg-blue-50 text-blue-600 border-blue-200'
                        }`}>{p.status}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 rounded-full bg-warm-gray-100 overflow-hidden">
                          <div className="h-full rounded-full bg-purple-500 transition-all" style={{ width: `${p.progress}%` }} />
                        </div>
                        <span className="text-xs font-bold text-warm-gray-600">{p.progress}%</span>
                      </div>
                      <p className="text-xs text-warm-gray-400 mt-1">Last edited: {p.lastEdited}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Budget Planning content */}
              {activeTask === 'budget_planning' && (
                <div className="p-6">
                  <div className="space-y-4">
                    {activeFeature.staticContent.map((b, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-semibold text-warm-gray-800">{b.category}</span>
                          <span className="text-warm-gray-500">{b.spent} / {b.allocated}</span>
                        </div>
                        <div className="w-full h-3 rounded-full bg-warm-gray-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              b.pct > 70 ? 'bg-red-500' : b.pct > 50 ? 'bg-amber' : 'bg-green-500'
                            }`}
                            style={{ width: `${b.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Research content */}
              {activeTask === 'research' && (
                <div className="divide-y divide-warm-gray-200/60">
                  {activeFeature.staticContent.map((r, i) => (
                    <div key={i} className="p-5 hover:bg-cream/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-warm-gray-900 mb-1">{r.title}</h3>
                          <p className="text-xs text-warm-gray-500">{r.papers} papers • Updated: {r.lastUpdated}</p>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          r.status === 'Complete' ? 'bg-green-50 text-green-600 border-green-200'
                            : r.status === 'In Progress' ? 'bg-blue-50 text-blue-600 border-blue-200'
                              : 'bg-warm-gray-50 text-warm-gray-600 border-warm-gray-200'
                        }`}>{r.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Compliance content */}
              {activeTask === 'compliance' && (
                <div className="divide-y divide-warm-gray-200/60">
                  {activeFeature.staticContent.map((c, i) => (
                    <div key={i} className="p-5 hover:bg-cream/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                            c.status === 'Complete' ? 'bg-green-50 text-green-600'
                              : c.status === 'Due Soon' ? 'bg-amber-50 text-amber'
                                : 'bg-warm-gray-50 text-warm-gray-400'
                          }`}>
                            {c.status === 'Complete' ? '✓' : c.status === 'Due Soon' ? '!' : '○'}
                          </span>
                          <div>
                            <h3 className="font-semibold text-warm-gray-900">{c.item}</h3>
                            <p className="text-xs text-warm-gray-500">Due: {c.dueDate}</p>
                          </div>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          c.status === 'Complete' ? 'bg-green-50 text-green-600 border-green-200'
                            : c.status === 'Due Soon' ? 'bg-amber-50 text-amber border-amber/15'
                              : 'bg-warm-gray-50 text-warm-gray-500 border-warm-gray-200'
                        }`}>{c.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reporting content */}
              {activeTask === 'reporting' && (
                <div className="divide-y divide-warm-gray-200/60">
                  {activeFeature.staticContent.map((r, i) => (
                    <div key={i} className="p-5 hover:bg-cream/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-warm-gray-900 mb-1">{r.title}</h3>
                          <p className="text-xs text-warm-gray-500">{r.format} • {r.date}</p>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          r.status === 'Submitted' ? 'bg-green-50 text-green-600 border-green-200'
                            : r.status === 'Draft' ? 'bg-blue-50 text-blue-600 border-blue-200'
                              : 'bg-warm-gray-50 text-warm-gray-500 border-warm-gray-200'
                        }`}>{r.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Coming Soon Banner */}
            <div className="mt-8 bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-8 text-center animate-fade-up" style={{ animationDelay: '0.6s' }}>
              <div className="w-14 h-14 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🚀</span>
              </div>
              <h3 className="font-heading text-lg font-bold text-warm-gray-900 mb-2">More Features Coming Soon</h3>
              <p className="text-sm text-warm-gray-500 max-w-md mx-auto">
                We're building powerful tools to make your grant workflow seamless. Full functionality will be available soon!
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
