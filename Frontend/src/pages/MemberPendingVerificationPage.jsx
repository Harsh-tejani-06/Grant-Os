import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'

const LeafIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 1 8-1 3.5-3 5-5 7" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
)

export default function MemberPendingVerificationPage() {
  const [memberInfo, setMemberInfo] = useState({ fullName: '', organizationName: '' })

  useEffect(() => {
    try {
      const stored = localStorage.getItem('grantos_member_pending')
      if (stored) setMemberInfo(JSON.parse(stored))
    } catch {}
  }, [])

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Decorative background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">
          {/* Logo */}
          <Link to="/" className="flex items-center justify-center gap-2 mb-10 group" id="pending-logo">
            <div className="w-11 h-11 bg-primary rounded-[12px] flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-105">
              <LeafIcon />
            </div>
            <span className="font-heading text-2xl font-semibold text-warm-gray-900 tracking-tight">
              Grant<span className="text-primary">OS</span>
            </span>
          </Link>

          {/* Card */}
          <div className="bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-soft p-10 sm:p-14 text-center relative overflow-hidden">
            {/* Decorative corner blobs */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber/5 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/5 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10">
              {/* Animated hourglass */}
              <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse-soft">
                <span className="text-4xl">⏳</span>
              </div>

              <h1 className="font-heading text-3xl sm:text-4xl font-bold text-warm-gray-900 mb-4 animate-fade-up" style={{ animationDelay: '0.1s' }}>
                Awaiting Verification
              </h1>

              {memberInfo.fullName && (
                <p className="text-lg text-warm-gray-600 mb-2 animate-fade-up" style={{ animationDelay: '0.2s' }}>
                  Hi <strong className="text-warm-gray-800">{memberInfo.fullName}</strong> 👋
                </p>
              )}

              <p className="text-warm-gray-500 mb-6 leading-relaxed animate-fade-up" style={{ animationDelay: '0.3s' }}>
                Your account has been created successfully. Your Organization Admin needs to verify your membership before you can access the platform.
              </p>

              {memberInfo.organizationName && (
                <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary-50 border border-primary/15 mb-8 animate-fade-up" style={{ animationDelay: '0.4s' }}>
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse-soft" />
                  <span className="text-sm font-semibold text-primary">{memberInfo.organizationName}</span>
                </div>
              )}

              {/* Steps */}
              <div className="space-y-4 text-left max-w-sm mx-auto mb-8 animate-fade-up" style={{ animationDelay: '0.5s' }}>
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-white">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-warm-gray-800">Account Created</p>
                    <p className="text-xs text-warm-gray-500">Your account is ready and waiting</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-amber/20 border-2 border-amber flex items-center justify-center flex-shrink-0 mt-0.5 animate-pulse-soft">
                    <div className="w-2 h-2 rounded-full bg-amber" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-warm-gray-800">Admin Verification</p>
                    <p className="text-xs text-warm-gray-500">Your Org Admin will review and approve</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-warm-gray-100 border-2 border-warm-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-warm-gray-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-warm-gray-400">Access Granted</p>
                    <p className="text-xs text-warm-gray-400">Full platform access after approval</p>
                  </div>
                </div>
              </div>

              {/* Info box */}
              <div className="p-4 rounded-[12px] bg-cream border border-warm-gray-200/60 text-left mb-6 animate-fade-up" style={{ animationDelay: '0.6s' }}>
                <p className="text-sm text-warm-gray-600 leading-relaxed">
                  <strong className="text-warm-gray-700">💡 What happens next?</strong>
                  <br />
                  Once your admin verifies you, you'll be able to log in and access features based on the tasks assigned to you. Contact your organization admin if you need faster access.
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center animate-fade-up" style={{ animationDelay: '0.7s' }}>
                <Link
                  to="/login"
                  id="pending-try-login"
                  className="px-6 py-3 rounded-[12px] font-semibold text-white bg-primary hover:bg-primary-dark shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-0.5"
                >
                  Try Logging In
                </Link>
                <Link
                  to="/"
                  id="pending-back-home"
                  className="px-6 py-3 rounded-[12px] font-semibold text-warm-gray-600 border-2 border-warm-gray-200 hover:border-warm-gray-300 transition-all duration-200"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
