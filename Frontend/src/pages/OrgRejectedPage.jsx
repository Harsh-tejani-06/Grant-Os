import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

const LeafIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 1 8-1 3.5-3 5-5 7" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
)

const IMPROVEMENT_TIPS = [
  {
    icon: '🏢',
    title: 'Verify Organization Details',
    desc: 'Double-check your official registration number, organization name, and type. These must match your government-issued documents exactly.',
  },
  {
    icon: '📋',
    title: 'Provide Complete Documentation',
    desc: 'Ensure your NAAC accreditation grade, UGC recognition status, and established year are accurate and up to date.',
  },
  {
    icon: '👤',
    title: 'Use Official Contact Information',
    desc: 'Provide an institutional email address (e.g. dean@university.edu) rather than personal email. Include the designation of the contact person.',
  },
  {
    icon: '📍',
    title: 'Accurate Address & Pincode',
    desc: 'Your registered address should match official records. Verify the pincode corresponds to the correct city and state.',
  },
  {
    icon: '🎓',
    title: 'Highlight Research Capacity',
    desc: 'Include accurate faculty count, PhD scholars, and focus areas. Organizations with demonstrated research capacity are prioritized.',
  },
  {
    icon: '🎯',
    title: 'Select Relevant Grant Categories',
    desc: 'Choose grant categories (Research Grant, Fellowship, Institutional Infra) that align with your organization\'s actual capabilities.',
  },
]

export default function OrgRejectedPage() {
  const [orgData, setOrgData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.get('/org/status')
        if (res.data.success && res.data.organization) {
          setOrgData(res.data.organization)
        }
      } catch (err) {
        console.error('Failed to fetch org status:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchStatus()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-red-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-amber/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex-1 flex items-start justify-center px-6 py-10">
        <div className="w-full max-w-2xl">
          {/* Logo */}
          <Link to="/" className="inline-flex items-center gap-2 mb-8 group" id="rejected-logo">
            <div className="w-11 h-11 bg-primary rounded-[12px] flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-105">
              <LeafIcon />
            </div>
            <span className="font-heading text-2xl font-semibold text-warm-gray-900 tracking-tight">
              Grant<span className="text-primary">OS</span>
            </span>
          </Link>

          {/* Main Card */}
          <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-8 sm:p-10 mb-6">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 text-red-500">
                  <circle cx="12" cy="12" r="10" />
                  <path d="m15 9-6 6" />
                  <path d="m9 9 6 6" />
                </svg>
              </div>
            </div>

            <h1 className="font-heading text-3xl font-bold text-warm-gray-900 mb-2 text-center">
              Application Not Approved
            </h1>

            {orgData?.organizationName && (
              <p className="text-warm-gray-500 text-center mb-6">
                Organization: <strong className="text-warm-gray-700">{orgData.organizationName}</strong>
              </p>
            )}

            {/* Rejection Reason — highlighted */}
            {orgData?.rejectionReason && (
              <div className="p-5 rounded-[14px] bg-red-50 border border-red-200 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-red-600">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-red-700 mb-1">Admin's Feedback</p>
                    <p className="text-sm text-red-600 leading-relaxed">{orgData.rejectionReason}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Encouraging message */}
            <div className="p-5 rounded-[14px] bg-amber-50 border border-amber/15 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0 mt-0.5">💡</span>
                <div>
                  <p className="text-sm font-bold text-amber mb-1">Don't worry — you can try again!</p>
                  <p className="text-sm text-amber/80 leading-relaxed">
                    Rejections usually happen due to incomplete or inaccurate information. Review the admin's feedback above, correct any issues, and re-submit your application with more precise and accurate data. Our team will review it again.
                  </p>
                </div>
              </div>
            </div>

            {/* Status badge */}
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-50 border border-red-200">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-sm font-semibold text-red-600">Not Approved</span>
              </div>
            </div>
          </div>

          {/* Improvement Tips */}
          <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-8 sm:p-10 mb-6">
            <h2 className="font-heading text-xl font-bold text-warm-gray-900 mb-2">
              📌 How to Get Approved Next Time
            </h2>
            <p className="text-sm text-warm-gray-500 mb-6">
              Follow these tips to strengthen your application and increase your chances of approval.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {IMPROVEMENT_TIPS.map((tip) => (
                <div key={tip.title} className="p-4 rounded-[12px] bg-cream border border-warm-gray-200 hover:border-primary/30 transition-all duration-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{tip.icon}</span>
                    <h3 className="text-sm font-bold text-warm-gray-900">{tip.title}</h3>
                  </div>
                  <p className="text-xs text-warm-gray-500 leading-relaxed">{tip.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Support */}
          <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-6 text-center">
            <p className="text-sm text-warm-gray-600 leading-relaxed mb-1">
              Still have questions? Our support team is here to help.
            </p>
            <a href="mailto:support@grantos.com" className="text-primary font-semibold text-sm hover:underline">
              support@grantos.com
            </a>
          </div>

          {/* Logout */}
          <p className="text-center mt-8">
            <button
              onClick={() => {
                localStorage.removeItem('grantos_token')
                localStorage.removeItem('grantos_user')
                window.location.href = '/login'
              }}
              className="text-sm text-warm-gray-400 hover:text-warm-gray-600 transition-colors cursor-pointer"
            >
              Sign out
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
