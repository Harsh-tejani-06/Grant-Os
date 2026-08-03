import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

const LeafIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 1 8-1 3.5-3 5-5 7" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
)

const ClockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-16 h-16">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
)

export default function FundingAgencyPendingPage() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [agencyName, setAgencyName] = useState('')
  const [submittedAt, setSubmittedAt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.get('/agency/status')
        if (res.data.success && res.data.agency) {
          setAgencyName(res.data.agency.agencyName)
          setSubmittedAt(new Date(res.data.agency.submittedAt))
        }
      } catch (err) {
        console.error('Failed to fetch agency status:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchStatus()
  }, [])

  useEffect(() => {
    if (!submittedAt) return

    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000
    const deadline = new Date(submittedAt.getTime() + THREE_DAYS_MS)

    const updateTimer = () => {
      const now = new Date()
      const diff = deadline - now

      if (diff <= 0) {
        setExpired(true)
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTimeLeft({ days, hours, minutes, seconds })
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [submittedAt])

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-amber border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const TimeBlock = ({ value, label }) => (
    <div className="flex flex-col items-center">
      <div className="w-20 h-20 sm:w-24 sm:h-24 bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft flex items-center justify-center">
        <span className="font-heading text-3xl sm:text-4xl font-bold text-amber">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-xs font-semibold text-warm-gray-500 mt-2 uppercase tracking-wider">
        {label}
      </span>
    </div>
  )

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-amber/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg text-center">
          {/* Logo */}
          <Link to="/" className="inline-flex items-center gap-2 mb-10 group" id="agency-pending-logo">
            <div className="w-11 h-11 bg-amber rounded-[12px] flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-105">
              <LeafIcon />
            </div>
            <span className="font-heading text-2xl font-semibold text-warm-gray-900 tracking-tight">
              Grant<span className="text-amber">OS</span>
            </span>
          </Link>

          {/* Card */}
          <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-8 sm:p-10">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 rounded-full bg-amber-50 flex items-center justify-center text-amber animate-pulse-soft">
                <ClockIcon />
              </div>
            </div>

            <h1 className="font-heading text-3xl font-bold text-warm-gray-900 mb-2">
              Agency Application Under Review
            </h1>

            {agencyName && (
              <p className="text-warm-gray-500 mb-2">
                Funding Agency: <strong className="text-warm-gray-700">{agencyName}</strong>
              </p>
            )}

            <p className="text-warm-gray-500 mb-8 leading-relaxed text-sm">
              Our system compliance team is verifying your registration identifiers (CIN/Darpan) and official contact credentials. You will receive an email update once verified.
            </p>

            {/* Countdown Timer */}
            <div className="mb-8">
              <p className="text-xs font-semibold text-warm-gray-400 uppercase tracking-wider mb-4">
                {expired ? 'Review period has ended' : 'Expected verification within'}
              </p>
              <div className="flex items-center justify-center gap-3 sm:gap-4">
                <TimeBlock value={timeLeft.days} label="Days" />
                <span className="text-2xl font-bold text-warm-gray-300 mt-[-24px]">:</span>
                <TimeBlock value={timeLeft.hours} label="Hours" />
                <span className="text-2xl font-bold text-warm-gray-300 mt-[-24px]">:</span>
                <TimeBlock value={timeLeft.minutes} label="Min" />
                <span className="text-2xl font-bold text-warm-gray-300 mt-[-24px]">:</span>
                <TimeBlock value={timeLeft.seconds} label="Sec" />
              </div>
            </div>

            {expired && (
              <div className="p-4 rounded-[12px] bg-amber-50 border border-amber/15 mb-6">
                <p className="text-sm text-amber leading-relaxed">
                  The standard review period has passed. Our compliance team is finalizing your agency review. We will notify you via email as soon as approval is completed.
                </p>
              </div>
            )}

            {/* Status badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber/15">
              <div className="w-2 h-2 rounded-full bg-amber animate-pulse-soft" />
              <span className="text-sm font-semibold text-amber">Verification Pending</span>
            </div>
          </div>

          {/* Logout */}
          <p className="mt-8">
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
