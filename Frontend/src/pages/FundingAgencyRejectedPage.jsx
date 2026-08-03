import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

const LeafIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 1 8-1 3.5-3 5-5 7" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
)

const AGENCY_TIPS = [
  {
    icon: '🏛️',
    title: 'Verify Legal Registration IDs',
    desc: 'Ensure your CIN (Corporate ID), Form CSR-1 number, or NGO Darpan ID match official MCA / NITI Aayog public registries.',
  },
  {
    icon: '📧',
    title: 'Use Official Agency Domain',
    desc: 'Register using an official domain email address (e.g. officer@agency.gov.in or contact@foundation.org) rather than generic commercial webmail.',
  },
  {
    icon: '📜',
    title: 'Attach Authorization Documents',
    desc: 'Provide an official authorization letter from the Trustee or Head of Department authorizing this user to represent the funding agency.',
  },
  {
    icon: '📍',
    title: 'Headquarters Address Accuracy',
    desc: 'Verify that the registered street address, pincode, and city match official corporate or ministry records.',
  },
]

export default function FundingAgencyRejectedPage() {
  const [agencyData, setAgencyData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.get('/agency/status')
        if (res.data.success && res.data.agency) {
          setAgencyData(res.data.agency)
        }
      } catch (err) {
        console.error('Failed to fetch agency status:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchStatus()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-amber border-t-transparent rounded-full animate-spin" />
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
          <Link to="/" className="inline-flex items-center gap-2 mb-8 group" id="agency-rejected-logo">
            <div className="w-11 h-11 bg-amber rounded-[12px] flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-105">
              <LeafIcon />
            </div>
            <span className="font-heading text-2xl font-semibold text-warm-gray-900 tracking-tight">
              Grant<span className="text-amber">OS</span>
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
              Agency Registration Not Approved
            </h1>

            {agencyData?.agencyName && (
              <p className="text-warm-gray-500 text-center mb-6">
                Funding Agency: <strong className="text-warm-gray-700">{agencyData.agencyName}</strong>
              </p>
            )}

            {/* Rejection Reason */}
            {agencyData?.rejectionReason && (
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
                    <p className="text-sm font-bold text-red-700 mb-1">Compliance Feedback</p>
                    <p className="text-sm text-red-600 leading-relaxed">{agencyData.rejectionReason}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Reassurance message */}
            <div className="p-5 rounded-[14px] bg-amber-50 border border-amber/15 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0 mt-0.5">💡</span>
                <div>
                  <p className="text-sm font-bold text-amber mb-1">Need to update registration details?</p>
                  <p className="text-sm text-amber/80 leading-relaxed">
                    Agency applications are rejected if corporate numbers or official authorization letters are missing or unclear. Please review the compliance feedback above and contact support to resubmit your credentials.
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

          {/* Tips */}
          <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-8 sm:p-10 mb-6">
            <h2 className="font-heading text-xl font-bold text-warm-gray-900 mb-2">
              📌 Funding Agency Verification Checklist
            </h2>
            <p className="text-sm text-warm-gray-500 mb-6">
              Requirements for approving a funding agency profile.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {AGENCY_TIPS.map((tip) => (
                <div key={tip.title} className="p-4 rounded-[12px] bg-cream border border-warm-gray-200 hover:border-amber/30 transition-all duration-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{tip.icon}</span>
                    <h3 className="text-sm font-bold text-warm-gray-900">{tip.title}</h3>
                  </div>
                  <p className="text-xs text-warm-gray-500 leading-relaxed">{tip.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Support */}
          <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-6 text-center">
            <p className="text-sm text-warm-gray-600 leading-relaxed mb-1">
              Have questions regarding agency verification?
            </p>
            <a href="mailto:agencies@grantos.com" className="text-amber font-semibold text-sm hover:underline">
              agencies@grantos.com
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
