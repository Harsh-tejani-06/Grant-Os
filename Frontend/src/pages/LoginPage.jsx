import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import api from '../api'

const LeafIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 1 8-1 3.5-3 5-5 7" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
)

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
    <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
    <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
    <path d="m2 2 20 20" />
  </svg>
)

export default function LoginPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      const res = await api.post('/auth/login', { email, password })
      if (res.data.success) {
        localStorage.setItem('grantos_token', res.data.token)
        localStorage.setItem('grantos_user', JSON.stringify(res.data.user))

        const { user, orgStatus, agencyStatus, memberStatus } = res.data

        // system_admin → admin dashboard
        if (user.role === 'system_admin') {
          navigate('/admin/dashboard')
          return
        }

        // funding_agency with agency status
        if (user.role === 'funding_agency') {
          if (agencyStatus) {
            if (agencyStatus.status === 'pending') {
              navigate('/agency/pending')
            } else if (agencyStatus.status === 'rejected') {
              navigate('/agency/rejected')
            } else {
              navigate('/agency/welcome')
            }
          } else {
            navigate('/agency/register')
          }
          return
        }

        // team_member → check verification
        if (user.role === 'team_member') {
          if (memberStatus && !memberStatus.isVerified) {
            // Store info for pending page
            localStorage.setItem('grantos_member_pending', JSON.stringify({
              fullName: user.fullName,
              organizationName: orgStatus?.organizationName || '',
            }))
            navigate('/member/pending-verification')
          } else {
            navigate('/member/dashboard')
          }
          return
        }

        // org_admin with org status
        if (orgStatus) {
          if (orgStatus.status === 'pending') {
            navigate('/org/pending')
          } else if (orgStatus.status === 'rejected') {
            navigate('/org/rejected')
          } else if (orgStatus.status === 'approved') {
            navigate('/org/dashboard')
          }
        } else if (user.role === 'org_admin') {
          // No org registered yet
          navigate('/org/register')
        } else {
          navigate('/')
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Decorative background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <Link to="/" className="flex items-center justify-center gap-2 mb-10 group" id="login-logo-link">
            <div className="w-11 h-11 bg-primary rounded-[12px] flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-105">
              <LeafIcon />
            </div>
            <span className="font-heading text-2xl font-semibold text-warm-gray-900 tracking-tight">
              Grant<span className="text-primary">OS</span>
            </span>
          </Link>

          {/* Card */}
          <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-8 sm:p-10">
            <div className="text-center mb-8">
              <h1 className="font-heading text-3xl font-bold text-warm-gray-900 mb-2">Welcome back</h1>
              <p className="text-warm-gray-500">Sign in to your GrantOS account</p>
            </div>

            {error && (
              <div className="p-4 rounded-[12px] bg-red-50 border border-red-200 mb-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" id="login-form">
              {/* Email */}
              <div>
                <label htmlFor="login-email" className="block text-sm font-semibold text-warm-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="login-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@organization.com"
                  required
                  className="w-full px-4 py-3 rounded-[12px] bg-cream border border-warm-gray-200 text-warm-gray-900 placeholder:text-warm-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200"
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="login-password" className="block text-sm font-semibold text-warm-gray-700">
                    Password
                  </label>
                  <button type="button" className="text-sm text-primary hover:text-primary-dark font-medium transition-colors">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="login-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full px-4 py-3 pr-12 rounded-[12px] bg-cream border border-warm-gray-200 text-warm-gray-900 placeholder:text-warm-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-gray-400 hover:text-warm-gray-600 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                id="login-submit-btn"
                disabled={isLoading}
                className="w-full py-3.5 rounded-[12px] font-semibold text-white bg-primary hover:bg-primary-dark shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-0.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-warm-gray-200" />
              <span className="text-sm text-warm-gray-400">or</span>
              <div className="flex-1 h-px bg-warm-gray-200" />
            </div>

            {/* Funding Agency */}
            <Link
              to="/signup?role=funding_agency"
              id="login-register-agency-link"
              className="block w-full text-center py-3 rounded-[12px] font-semibold text-amber border-2 border-amber/20 bg-amber-50 hover:border-amber/40 transition-all duration-200"
            >
              Register as a Funding Agency
            </Link>
          </div>

          {/* Signup link */}
          <p className="text-center mt-8 text-warm-gray-500">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary font-semibold hover:text-primary-dark transition-colors" id="login-signup-link">
              Sign up free
            </Link>
          </p>

          {/* Back to home */}
          <p className="text-center mt-4">
            <Link to="/" className="text-sm text-warm-gray-400 hover:text-warm-gray-600 transition-colors" id="login-home-link">
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
