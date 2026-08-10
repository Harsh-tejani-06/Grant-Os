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

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

export default function SignupPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'org_admin',
    organizationName: '',
  })
  const [isFundingAgency, setIsFundingAgency] = useState(false)
  const [error, setError] = useState('')
  const [errorType, setErrorType] = useState('') // 'org_not_found' | 'org_not_approved' | ''
  const [isLoading, setIsLoading] = useState(false)

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setErrorType('')

    // Client-side password validation
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please ensure both passwords match.')
      return
    }

    setIsLoading(true)
    try {
      // Team member → call member register endpoint
      if (formData.role === 'team_member') {
        const res = await api.post('/member/register', {
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          organizationName: formData.organizationName,
        })
        if (res.data.success) {
          // Store minimal info for the pending page
          localStorage.setItem('grantos_member_pending', JSON.stringify({
            fullName: res.data.member.fullName,
            organizationName: res.data.member.organizationName,
          }))
          navigate('/member/pending-verification')
        }
      } else {
        // Org admin or funding agency → signup
        const signupRole = isFundingAgency ? 'funding_agency' : formData.role
        const res = await api.post('/auth/signup', {
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          role: signupRole,
        })
        if (res.data.success) {
          localStorage.setItem('grantos_token', res.data.token)
          localStorage.setItem('grantos_user', JSON.stringify(res.data.user))
          if (res.data.user.role === 'org_admin') {
            navigate('/org/register')
          } else if (res.data.user.role === 'funding_agency') {
            navigate('/agency/register')
          } else {
            navigate('/')
          }
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Signup failed. Please try again.'
      const eType = err.response?.data?.errorType || ''
      setError(msg)
      setErrorType(eType)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Decorative background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-amber/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <Link to="/" className="flex items-center justify-center gap-2 mb-10 group" id="signup-logo-link">
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
              <h1 className="font-heading text-3xl font-bold text-warm-gray-900 mb-2">
                {isFundingAgency ? 'Register as Funding Agency' : 'Create your account'}
              </h1>
              <p className="text-warm-gray-500">
                {isFundingAgency
                  ? 'Post grants and review proposals on GrantOS'
                  : 'Start discovering and winning grants today'}
              </p>
            </div>

            {/* Toggle: Applicant vs Agency */}
            <div className="flex rounded-[12px] bg-cream border border-warm-gray-200 p-1 mb-8">
              <button
                type="button"
                onClick={() => setIsFundingAgency(false)}
                className={`flex-1 py-2.5 rounded-[10px] text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  !isFundingAgency
                    ? 'bg-primary text-white shadow-soft'
                    : 'text-warm-gray-500 hover:text-warm-gray-700'
                }`}
              >
                Applicant
              </button>
              <button
                type="button"
                onClick={() => setIsFundingAgency(true)}
                className={`flex-1 py-2.5 rounded-[10px] text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  isFundingAgency
                    ? 'bg-amber text-white shadow-soft'
                    : 'text-warm-gray-500 hover:text-warm-gray-700'
                }`}
              >
                Funding Agency
              </button>
            </div>

            {error && (
              <div className={`p-4 rounded-[12px] mb-4 ${
                errorType === 'org_not_approved'
                  ? 'bg-amber-50 border border-amber/20'
                  : errorType === 'org_not_found'
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-start gap-2">
                  <span className="text-base mt-0.5">
                    {errorType === 'org_not_approved' ? '⏳' : errorType === 'org_not_found' ? '🚫' : '⚠️'}
                  </span>
                  <p className={`text-sm ${
                    errorType === 'org_not_approved' ? 'text-amber' : 'text-red-700'
                  }`}>{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" id="signup-form">
              {/* Full Name / Agency Name */}
              <div>
                <label htmlFor="signup-name" className="block text-sm font-semibold text-warm-gray-700 mb-2">
                  {isFundingAgency ? 'Agency Name' : 'Full Name'}
                </label>
                <input
                  type="text"
                  id="signup-name"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder={isFundingAgency ? 'National Science Foundation' : 'Jane Doe'}
                  required
                  className="w-full px-4 py-3 rounded-[12px] bg-cream border border-warm-gray-200 text-warm-gray-900 placeholder:text-warm-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200"
                />
              </div>

              {/* Email */}
              <div>
                <label htmlFor="signup-email" className="block text-sm font-semibold text-warm-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="signup-email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@organization.com"
                  required
                  className="w-full px-4 py-3 rounded-[12px] bg-cream border border-warm-gray-200 text-warm-gray-900 placeholder:text-warm-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200"
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="signup-password" className="block text-sm font-semibold text-warm-gray-700">
                    Password
                  </label>
                  {passwordTouched && formData.password && (
                    <span className={`text-xs font-medium ${
                      formData.password.length >= 8 ? 'text-emerald-600' : 'text-warm-gray-500'
                    }`}>
                      {formData.password.length >= 8 ? '✓ Min 8 characters' : `${formData.password.length}/8 min characters`}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="signup-password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={() => setPasswordTouched(true)}
                    placeholder="Create a strong password (min 8 chars)"
                    required
                    minLength={8}
                    className={`w-full px-4 py-3 pr-12 rounded-[12px] bg-cream border text-warm-gray-900 placeholder:text-warm-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 ${
                      passwordTouched && formData.password
                        ? formData.password.length >= 8
                          ? 'border-emerald-400 focus:ring-emerald-200/50 focus:border-emerald-500'
                          : 'border-amber-300 focus:ring-amber-200/50 focus:border-amber-500'
                        : 'border-warm-gray-200 focus:ring-primary/30 focus:border-primary'
                    }`}
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

              {/* Confirm Password */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="signup-confirm-password" className="block text-sm font-semibold text-warm-gray-700">
                    Confirm Password
                  </label>
                  {confirmPasswordTouched && formData.confirmPassword && (
                    <span className={`text-xs font-medium flex items-center gap-1 ${
                      formData.password === formData.confirmPassword
                        ? 'text-emerald-600'
                        : 'text-red-500'
                    }`}>
                      {formData.password === formData.confirmPassword ? (
                        <>
                          <CheckIcon /> Passwords match
                        </>
                      ) : (
                        '✕ Passwords do not match'
                      )}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="signup-confirm-password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    onBlur={() => setConfirmPasswordTouched(true)}
                    placeholder="Re-enter your password"
                    required
                    minLength={8}
                    className={`w-full px-4 py-3 pr-12 rounded-[12px] bg-cream border text-warm-gray-900 placeholder:text-warm-gray-400 focus:outline-none focus:ring-2 transition-all duration-200 ${
                      confirmPasswordTouched && formData.confirmPassword
                        ? formData.password === formData.confirmPassword
                          ? 'border-emerald-400 focus:ring-emerald-200/50 focus:border-emerald-500'
                          : 'border-red-300 focus:ring-red-200/50 focus:border-red-500'
                        : 'border-warm-gray-200 focus:ring-primary/30 focus:border-primary'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-warm-gray-400 hover:text-warm-gray-600 transition-colors"
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {/* Role Selector (applicant only) */}
              {!isFundingAgency && (
                <div>
                  <label className="block text-sm font-semibold text-warm-gray-700 mb-3">
                    I want to
                  </label>
                  <div className="space-y-3">
                    <label
                      htmlFor="role-org-admin"
                      className={`flex items-start gap-3 p-4 rounded-[12px] border-2 cursor-pointer transition-all duration-200 ${
                        formData.role === 'org_admin'
                          ? 'border-primary bg-primary-50'
                          : 'border-warm-gray-200 bg-cream hover:border-warm-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        id="role-org-admin"
                        name="role"
                        value="org_admin"
                        checked={formData.role === 'org_admin'}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <span className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        formData.role === 'org_admin'
                          ? 'border-primary bg-primary text-white'
                          : 'border-warm-gray-300'
                      }`}>
                        {formData.role === 'org_admin' && <CheckIcon />}
                      </span>
                      <div>
                        <span className="block font-semibold text-warm-gray-900 text-sm">Create a new organization</span>
                        <span className="block text-warm-gray-500 text-xs mt-0.5">You'll be the Organization Admin with full control</span>
                      </div>
                    </label>

                    <label
                      htmlFor="role-team-member"
                      className={`flex items-start gap-3 p-4 rounded-[12px] border-2 cursor-pointer transition-all duration-200 ${
                        formData.role === 'team_member'
                          ? 'border-primary bg-primary-50'
                          : 'border-warm-gray-200 bg-cream hover:border-warm-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        id="role-team-member"
                        name="role"
                        value="team_member"
                        checked={formData.role === 'team_member'}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <span className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        formData.role === 'team_member'
                          ? 'border-primary bg-primary text-white'
                          : 'border-warm-gray-300'
                      }`}>
                        {formData.role === 'team_member' && <CheckIcon />}
                      </span>
                      <div>
                        <span className="block font-semibold text-warm-gray-900 text-sm">Join an existing organization</span>
                        <span className="block text-warm-gray-500 text-xs mt-0.5">Enter your organization name and get verified by the admin</span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Organization Name (team_member only) */}
              {!isFundingAgency && formData.role === 'team_member' && (
                <div className="animate-fade-up">
                  <label htmlFor="signup-org-name" className="block text-sm font-semibold text-warm-gray-700 mb-2">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    id="signup-org-name"
                    name="organizationName"
                    value={formData.organizationName}
                    onChange={handleChange}
                    placeholder="Enter your organization's registered name"
                    required
                    className="w-full px-4 py-3 rounded-[12px] bg-cream border border-warm-gray-200 text-warm-gray-900 placeholder:text-warm-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200"
                  />
                  <p className="text-xs text-warm-gray-400 mt-1.5">
                    Must match the exact name registered by your Organization Admin
                  </p>
                </div>
              )}

              {/* Funding Agency notice */}
              {isFundingAgency && (
                <div className="p-4 rounded-[12px] bg-amber-50 border border-amber/15">
                  <p className="text-sm text-amber leading-relaxed">
                    <strong>Note:</strong> Funding Agency accounts require verification by a System Admin before activation. You'll be notified once approved.
                  </p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                id="signup-submit-btn"
                disabled={isLoading}
                className={`w-full py-3.5 rounded-[12px] font-semibold text-white shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-0.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                  isFundingAgency
                    ? 'bg-amber hover:bg-amber-light'
                    : 'bg-primary hover:bg-primary-dark'
                }`}
              >
                {isLoading ? 'Creating Account...' : (isFundingAgency ? 'Submit for Verification' : 'Create Account')}
              </button>
            </form>

            {/* Terms */}
            <p className="text-xs text-warm-gray-400 text-center mt-5 leading-relaxed">
              By creating an account, you agree to our{' '}
              <button className="text-primary hover:underline cursor-pointer">Terms of Service</button>{' '}
              and{' '}
              <button className="text-primary hover:underline cursor-pointer">Privacy Policy</button>.
            </p>
          </div>

          {/* Login link */}
          <p className="text-center mt-8 text-warm-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-semibold hover:text-primary-dark transition-colors" id="signup-login-link">
              Sign in
            </Link>
          </p>

          {/* Back to home */}
          <p className="text-center mt-4">
            <Link to="/" className="text-sm text-warm-gray-400 hover:text-warm-gray-600 transition-colors" id="signup-home-link">
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
