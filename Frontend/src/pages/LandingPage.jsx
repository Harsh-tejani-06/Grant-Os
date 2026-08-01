import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'

/* ── Inline SVG Icons ── */
const LeafIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 1 8-1 3.5-3 5-5 7" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
)

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
)

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.874a2 2 0 0 1 .506-.852z" />
  </svg>
)

const ChartIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <path d="M3 3v16a2 2 0 0 0 2 2h16" />
    <path d="m19 9-5 5-4-4-3 3" />
  </svg>
)

const RocketIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
  </svg>
)

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const BuildingIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
    <path d="M9 22v-4h6v4" />
    <path d="M8 6h.01" /><path d="M16 6h.01" />
    <path d="M8 10h.01" /><path d="M16 10h.01" />
    <path d="M8 14h.01" /><path d="M16 14h.01" />
  </svg>
)

const BankIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <line x1="3" x2="21" y1="22" y2="22" />
    <line x1="6" x2="6" y1="18" y2="11" />
    <line x1="10" x2="10" y1="18" y2="11" />
    <line x1="14" x2="14" y1="18" y2="11" />
    <line x1="18" x2="18" y1="18" y2="11" />
    <polygon points="12 2 20 7 4 7" />
  </svg>
)

const ArrowRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
  </svg>
)

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const MenuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" />
  </svg>
)

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
  </svg>
)


/* ─── Navbar ─── */
function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav
      id="navbar"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-cream/90 backdrop-blur-md shadow-soft'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 lg:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group" id="logo-link">
            <div className="w-10 h-10 bg-primary rounded-[12px] flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-105">
              <LeafIcon />
            </div>
            <span className="font-heading text-2xl font-semibold text-warm-gray-900 tracking-tight">
              Grant<span className="text-primary">OS</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-warm-gray-600 hover:text-primary font-medium transition-colors duration-200">Features</a>
            <a href="#how-it-works" className="text-warm-gray-600 hover:text-primary font-medium transition-colors duration-200">How It Works</a>
            <a href="#roles" className="text-warm-gray-600 hover:text-primary font-medium transition-colors duration-200">Who It's For</a>
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              id="nav-login-btn"
              className="px-5 py-2.5 rounded-[12px] font-semibold text-primary border-2 border-primary/20 bg-cream hover:border-primary/40 hover:bg-primary-50 transition-all duration-200"
            >
              Login
            </Link>
            <Link
              to="/signup"
              id="nav-signup-btn"
              className="px-5 py-2.5 rounded-[12px] font-semibold text-white bg-primary hover:bg-primary-dark shadow-soft hover:shadow-medium transition-all duration-200"
            >
              Get Started
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            id="mobile-menu-btn"
            className="md:hidden p-2 text-warm-gray-700 hover:text-primary transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`md:hidden overflow-hidden transition-all duration-300 ${mobileOpen ? 'max-h-80' : 'max-h-0'}`}>
        <div className="px-6 pb-6 pt-2 bg-cream/95 backdrop-blur-md border-t border-warm-gray-200 space-y-3">
          <a href="#features" onClick={() => setMobileOpen(false)} className="block py-2 text-warm-gray-600 hover:text-primary font-medium transition-colors">Features</a>
          <a href="#how-it-works" onClick={() => setMobileOpen(false)} className="block py-2 text-warm-gray-600 hover:text-primary font-medium transition-colors">How It Works</a>
          <a href="#roles" onClick={() => setMobileOpen(false)} className="block py-2 text-warm-gray-600 hover:text-primary font-medium transition-colors">Who It's For</a>
          <div className="flex gap-3 pt-3">
            <Link to="/login" className="flex-1 text-center px-4 py-2.5 rounded-[12px] font-semibold text-primary border-2 border-primary/20 bg-cream hover:bg-primary-50 transition-all">Login</Link>
            <Link to="/signup" className="flex-1 text-center px-4 py-2.5 rounded-[12px] font-semibold text-white bg-primary hover:bg-primary-dark transition-all">Sign Up</Link>
          </div>
        </div>
      </div>
    </nav>
  )
}


/* ─── Hero Section ─── */
function HeroSection() {
  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Decorative background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 border border-primary/15 text-primary font-medium text-sm mb-8 animate-fade-in">
          <LeafIcon />
          <span> Grant Management System</span>
        </div>

        {/* Headline */}
        <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-bold text-warm-gray-900 leading-[1.1] tracking-tight mb-6 animate-fade-up">
          Discover Grants.{' '}
          <span className="relative">
            <span className="text-primary">Draft Proposals.</span>
            <span className="absolute -bottom-2 left-0 right-0 h-3 bg-primary/10 rounded-full -skew-x-3" />
          </span>
          <br />
          Track Results.
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-warm-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-up" style={{ animationDelay: '0.15s' }}>
          GrantOS uses semantic matching to connect your organization with the right funding opportunities — then helps your team collaborate on winning proposals, all in one place.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up" style={{ animationDelay: '0.3s' }}>
          <Link
            to="/signup"
            id="hero-get-started-btn"
            className="group inline-flex items-center gap-2 px-8 py-4 rounded-[12px] font-semibold text-lg text-white bg-primary hover:bg-primary-dark shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-0.5"
          >
            Get Started Free
            <span className="transition-transform duration-300 group-hover:translate-x-1"><ArrowRightIcon /></span>
          </Link>
          <a
            href="#features"
            id="hero-learn-more-btn"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-[12px] font-semibold text-lg text-primary bg-cream-dark hover:bg-cream-deeper border-2 border-primary/10 hover:border-primary/25 transition-all duration-300"
          >
            Learn More
          </a>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 mt-16 animate-fade-up" style={{ animationDelay: '0.45s' }}>
          {[
            { value: 'AI-Powered', label: 'Semantic Matching' },
            { value: 'Real-Time', label: 'Collaboration' },
            { value: '360°', label: 'Proposal Tracking' },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-2xl font-heading font-bold text-primary">{stat.value}</div>
              <div className="text-sm text-warm-gray-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

    </section>
  )
}


/* ─── Features Section ─── */
function FeaturesSection() {
  const features = [
    {
      icon: <SearchIcon />,
      title: 'Smart Grant Discovery',
      description: 'AI-driven semantic search matches your organization\'s profile with the most relevant funding opportunities — including scraped and manually added listings.',
      highlights: ['Semantic vector matching', 'Auto-scraped listings', 'Custom filters & alerts'],
    },
    {
      icon: <EditIcon />,
      title: 'Collaborative Drafting',
      description: 'Divide proposals into sections, assign team members, and draft together. Each section has its own comment thread and readiness status.',
      highlights: ['Section-based editing', 'Team assignment controls', 'Comment threads per section'],
    },
    {
      icon: <RocketIcon />,
      title: 'One-Click Submission',
      description: 'Once every section is marked as ready, the Organization Admin compiles and submits directly to the funding agency through GrantOS.',
      highlights: ['Compliance checklist', 'PDF export', 'Submission tracking'],
    },
    {
      icon: <ChartIcon />,
      title: 'Analytics & Tracking',
      description: 'Monitor all proposals in a Kanban or table view. Track win rates, funding secured, and time-to-decision with rich analytics.',
      highlights: ['Kanban & table views', 'Win rate analytics', 'Deadline reminders'],
    },
  ]

  return (
    <section id="features" className="py-24 lg:py-32 relative">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 lg:mb-20">
          <span className="inline-block px-3 py-1 rounded-full bg-primary-50 text-primary text-sm font-medium mb-4">
            Features
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-warm-gray-900 leading-tight mb-4">
            Everything you need to <span className="text-primary">win grants</span>
          </h2>
          <p className="text-warm-gray-500 text-lg leading-relaxed">
            From discovery to submission to tracking — GrantOS streamlines the entire grant lifecycle for your team.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              id={`feature-card-${index}`}
              className="group p-8 lg:p-10 rounded-[16px] bg-surface-elevated border border-warm-gray-200/60 hover:border-primary/20 shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1"
            >
              <div className="w-14 h-14 rounded-[12px] bg-primary-50 text-primary flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                {feature.icon}
              </div>
              <h3 className="font-heading text-xl lg:text-2xl font-semibold text-warm-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-warm-gray-500 leading-relaxed mb-5">
                {feature.description}
              </p>
              <ul className="space-y-2">
                {feature.highlights.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-warm-gray-600">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      <CheckIcon />
                    </span>
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}


/* ─── How It Works ─── */
function HowItWorksSection() {
  const steps = [
    {
      number: '01',
      title: 'Create Your Organization',
      description: 'Sign up as an Organization Admin and set up your profile with mission, focus areas, and grant preferences. Invite team members to collaborate.',
    },
    {
      number: '02',
      title: 'Discover Matching Grants',
      description: 'Our AI engine semantically matches your profile against thousands of grant listings — both scraped from the web and posted by verified funding agencies.',
    },
    {
      number: '03',
      title: 'Draft & Collaborate',
      description: 'Break proposals into sections, assign them to team members, add comments, and track readiness. Everyone works together in a structured workflow.',
    },
    {
      number: '04',
      title: 'Submit & Track',
      description: 'Compile the proposal, run the compliance checklist, and submit. Then track status from Submitted through Under Review to Awarded — all on one dashboard.',
    },
  ]

  return (
    <section id="how-it-works" className="py-24 lg:py-32 bg-cream-dark relative">
      {/* Subtle texture overlay */}
      <div className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(74,124,89,0.05) 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 lg:mb-20">
          <span className="inline-block px-3 py-1 rounded-full bg-primary-50 text-primary text-sm font-medium mb-4">
            How It Works
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-warm-gray-900 leading-tight mb-4">
            From discovery to <span className="text-primary">award</span> in four steps
          </h2>
          <p className="text-warm-gray-500 text-lg leading-relaxed">
            A streamlined workflow designed to remove friction from every stage of the grant process.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting line */}
          <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-primary/20 via-primary/10 to-transparent" />

          <div className="space-y-12 lg:space-y-0">
            {steps.map((step, index) => (
              <div
                key={index}
                id={`step-${index}`}
                className={`relative lg:grid lg:grid-cols-2 lg:gap-16 lg:items-center lg:py-12 ${
                  index % 2 === 1 ? 'lg:direction-rtl' : ''
                }`}
              >
                {/* Number bubble on the line */}
                <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-primary text-white font-heading font-bold items-center justify-center z-10 shadow-soft text-sm">
                  {step.number}
                </div>

                {/* Content */}
                <div className={`${index % 2 === 1 ? 'lg:col-start-2 lg:text-left' : 'lg:text-right'}`} style={{ direction: 'ltr' }}>
                  <div className={`p-8 rounded-[16px] bg-surface-elevated border border-warm-gray-200/60 shadow-soft hover:shadow-medium transition-all duration-300 ${
                    index % 2 === 1 ? 'lg:ml-8' : 'lg:mr-8'
                  }`}>
                    <span className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary text-white font-heading font-bold text-sm mb-4">
                      {step.number}
                    </span>
                    <h3 className="font-heading text-xl lg:text-2xl font-semibold text-warm-gray-900 mb-2">
                      {step.title}
                    </h3>
                    <p className="text-warm-gray-500 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>

                {/* Spacer for alternating layout */}
                <div className={`hidden lg:block ${index % 2 === 1 ? 'lg:col-start-1 lg:row-start-1' : ''}`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}


/* ─── Roles Section ─── */
function RolesSection() {
  const roles = [
    {
      icon: <BuildingIcon />,
      title: 'Organization Admins',
      description: 'Create your org, manage grant-matching preferences, discover opportunities, assign proposal sections, and track everything from submission to award.',
      cta: 'Start Your Org',
    },
    {
      icon: <UsersIcon />,
      title: 'Team Members',
      description: 'Join via invite link, get assigned proposal sections, draft with inline comments, and mark sections as ready for review — all within a focused workspace.',
      cta: 'Join a Team',
    },
    {
      icon: <BankIcon />,
      title: 'Funding Agencies',
      description: 'Register as a funder, post grant listings, review submitted proposals in a structured read-only view, and accept or reject with documented reasoning.',
      cta: 'Register as Agency',
    },
  ]

  return (
    <section id="roles" className="py-24 lg:py-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16 lg:mb-20">
          <span className="inline-block px-3 py-1 rounded-full bg-amber-50 text-amber font-medium text-sm mb-4">
            Who It's For
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-warm-gray-900 leading-tight mb-4">
            Built for <span className="text-primary">every role</span> in the grant ecosystem
          </h2>
          <p className="text-warm-gray-500 text-lg leading-relaxed">
            Whether you're writing proposals, reviewing applications, or managing an organization — GrantOS gives you exactly what you need.
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {roles.map((role, index) => (
            <div
              key={index}
              id={`role-card-${index}`}
              className="group p-8 lg:p-10 rounded-[16px] bg-surface-elevated border border-warm-gray-200/60 hover:border-primary/25 shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-1 text-center"
            >
              <div className="w-16 h-16 rounded-[14px] bg-primary-50 text-primary flex items-center justify-center mx-auto mb-6 group-hover:bg-primary group-hover:text-white transition-all duration-300 group-hover:scale-105">
                {role.icon}
              </div>
              <h3 className="font-heading text-xl font-semibold text-warm-gray-900 mb-3">
                {role.title}
              </h3>
              <p className="text-warm-gray-500 leading-relaxed mb-6">
                {role.description}
              </p>
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 text-primary font-semibold hover:gap-3 transition-all duration-200"
              >
                {role.cta} <ArrowRightIcon />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}


/* ─── CTA Section ─── */
function CTASection() {
  return (
    <section id="cta" className="py-24 lg:py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-dark to-primary-900" />
      <div className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-3xl mx-auto px-6 lg:px-8 text-center">
        <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-6">
          Ready to streamline your grant workflow?
        </h2>
        <p className="text-white/80 text-lg leading-relaxed mb-10 max-w-xl mx-auto">
          Join organizations already using GrantOS to discover funding, collaborate on proposals, and track submissions — all powered by AI.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/signup"
            id="cta-signup-btn"
            className="group inline-flex items-center gap-2 px-8 py-4 rounded-[12px] font-semibold text-lg text-primary bg-white hover:bg-cream shadow-medium transition-all duration-300 hover:-translate-y-0.5"
          >
            Create Free Account
            <span className="transition-transform duration-300 group-hover:translate-x-1"><ArrowRightIcon /></span>
          </Link>
          <Link
            to="/login"
            id="cta-login-btn"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-[12px] font-semibold text-lg text-white border-2 border-white/30 hover:border-white/60 hover:bg-white/10 transition-all duration-300"
          >
            Sign In
          </Link>
        </div>
      </div>
    </section>
  )
}


/* ─── Footer ─── */
function Footer() {
  return (
    <footer id="footer" className="py-12 bg-warm-gray-900">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-[10px] flex items-center justify-center text-white">
              <LeafIcon />
            </div>
            <span className="font-heading text-xl font-semibold text-white tracking-tight">
              Grant<span className="text-primary-light">OS</span>
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6 text-warm-gray-400 text-sm">
            <a href="#features" className="hover:text-white transition-colors duration-200">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors duration-200">How It Works</a>
            <a href="#roles" className="hover:text-white transition-colors duration-200">Who It's For</a>
            <Link to="/login" className="hover:text-white transition-colors duration-200">Login</Link>
          </div>

          {/* Copyright */}
          <p className="text-warm-gray-500 text-sm">
            &copy; {new Date().getFullYear()} GrantOS. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}


/* ─── Landing Page ─── */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-cream">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <RolesSection />
      <CTASection />
      <Footer />
    </div>
  )
}
