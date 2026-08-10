import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api'

const LeafIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
    <path d="M11 20A7 7 0 0 1 9.8 6.9C15.5 4.9 17 3.5 19 2c1 2 2 4.5 1 8-1 3.5-3 5-5 7" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </svg>
)

const CheckCircleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
)

const STEPS = [
  { id: 1, title: 'Basic Info', icon: '🏢' },
  { id: 2, title: 'Address', icon: '📍' },
  { id: 3, title: 'Contact', icon: '👤' },
  { id: 4, title: 'Academic', icon: '🎓' },
  { id: 5, title: 'Review', icon: '✅' },
]

const ORG_TYPES = [
  { value: 'university', label: 'University' },
  { value: 'college', label: 'College' },
]

const NAAC_GRADES = ['A++', 'A+', 'A', 'B++', 'B+', 'B', 'N/A']

const FOCUS_AREAS = [
  'Science', 'Engineering & Technology', 'Humanities', 'Social Sciences',
  'Medical Sciences', 'Commerce', 'Management', 'Law', 'Education', 'Arts',
]

const GRANT_CATEGORIES = [
  { value: 'research_grant', label: 'Research Grant', desc: 'Funding for research projects with deliverables' },
  { value: 'fellowship', label: 'Fellowship', desc: 'Monthly stipend + contingency for individual researchers' },
  { value: 'institutional_infra', label: 'Institutional Infrastructure', desc: 'Capacity building grants for departments' },
]

const inputClass = "w-full px-4 py-3 rounded-[12px] bg-cream border border-warm-gray-200 text-warm-gray-900 placeholder:text-warm-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all duration-200"
const labelClass = "block text-sm font-semibold text-warm-gray-700 mb-2"

export default function OrgRegistrationPage() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    organizationName: '',
    registrationNumber: '',
    organizationType: '',
    establishedYear: '',
    website: '',
    address: { street: '', city: '', state: '', pincode: '', country: 'India' },
    contactPerson: { name: '', designation: '', email: '', phone: '' },
    naacAccreditation: 'N/A',
    ugcRecognition: false,
    focusAreas: [],
    grantCategories: [],
    totalFaculty: '',
    totalPhDScholars: '',
  })

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const updateNested = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value },
    }))
  }

  const toggleArrayItem = (field, item) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(item)
        ? prev[field].filter(i => i !== item)
        : [...prev[field], item],
    }))
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.organizationName && formData.registrationNumber && formData.organizationType && formData.establishedYear
      case 2:
        return formData.address.street && formData.address.city && formData.address.state && formData.address.pincode
      case 3:
        return formData.contactPerson.name && formData.contactPerson.email && formData.contactPerson.phone
      case 4:
        return true
      default:
        return true
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setError('')
    try {
      const payload = {
        ...formData,
        establishedYear: parseInt(formData.establishedYear, 10),
        totalFaculty: parseInt(formData.totalFaculty, 10) || 0,
        totalPhDScholars: parseInt(formData.totalPhDScholars, 10) || 0,
      }
      await api.post('/org/register', payload)
      setSubmitSuccess(true)

      // Update local user data with org status
      const meRes = await api.get('/auth/me')
      if (meRes.data.success) {
        localStorage.setItem('grantos_user', JSON.stringify(meRes.data.user))
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-6">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-amber/5 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 w-full max-w-lg text-center">
          <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-10">
            <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-primary">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h1 className="font-heading text-3xl font-bold text-warm-gray-900 mb-3">
              Application Submitted!
            </h1>
            <p className="text-warm-gray-500 leading-relaxed mb-6">
              Your organization details have been submitted for verification. Our admin team will review your application and you'll receive an email notification within <strong className="text-warm-gray-700">3 business days</strong>.
            </p>
            <div className="p-4 rounded-[12px] bg-amber-50 border border-amber/15 mb-8">
              <p className="text-sm text-amber leading-relaxed">
                <strong>What's next?</strong> You can log in anytime to check your application status. Your account features will be unlocked once approved.
              </p>
            </div>
            <button
              onClick={() => navigate('/org/pending')}
              className="w-full py-3.5 rounded-[12px] font-semibold text-white bg-primary hover:bg-primary-dark shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-0.5 cursor-pointer"
            >
              View Application Status
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-amber/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex-1 flex items-start justify-center px-6 py-8">
        <div className="w-full max-w-2xl">
          {/* Logo */}
          <Link to="/" className="flex items-center justify-center gap-2 mb-8 group" id="org-reg-logo">
            <div className="w-11 h-11 bg-primary rounded-[12px] flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-105">
              <LeafIcon />
            </div>
            <span className="font-heading text-2xl font-semibold text-warm-gray-900 tracking-tight">
              Grant<span className="text-primary">OS</span>
            </span>
          </Link>

          {/* Step Indicator */}
          <div className="flex items-center justify-between mb-8 px-4">
            {STEPS.map((step, idx) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                      currentStep > step.id
                        ? 'bg-primary text-white'
                        : currentStep === step.id
                        ? 'bg-primary text-white shadow-glow'
                        : 'bg-warm-gray-100 text-warm-gray-400'
                    }`}
                  >
                    {currentStep > step.id ? <CheckCircleIcon /> : step.icon}
                  </div>
                  <span className={`text-xs mt-1.5 font-medium ${
                    currentStep >= step.id ? 'text-primary' : 'text-warm-gray-400'
                  }`}>
                    {step.title}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`w-12 sm:w-20 h-0.5 mx-1 mt-[-18px] transition-colors duration-300 ${
                    currentStep > step.id ? 'bg-primary' : 'bg-warm-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>

          {/* Card */}
          <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-8 sm:p-10">
            <h1 className="font-heading text-2xl font-bold text-warm-gray-900 mb-1">
              {STEPS[currentStep - 1].title}
            </h1>
            <p className="text-warm-gray-500 mb-8 text-sm">
              {currentStep === 1 && 'Tell us about your organization'}
              {currentStep === 2 && 'Where is your organization located?'}
              {currentStep === 3 && 'Who should we contact?'}
              {currentStep === 4 && 'Academic and research profile'}
              {currentStep === 5 && 'Review all details before submitting'}
            </p>

            {error && (
              <div className="p-4 rounded-[12px] bg-red-50 border border-red-200 mb-6">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-5">
                <div>
                  <label className={labelClass} htmlFor="org-name">Organization Name *</label>
                  <input id="org-name" type="text" className={inputClass} placeholder="e.g. Indian Institute of Technology" value={formData.organizationName} onChange={e => updateField('organizationName', e.target.value)} required />
                </div>
                <div>
                  <label className={labelClass} htmlFor="reg-number">Registration Number *</label>
                  <input id="reg-number" type="text" className={inputClass} placeholder="Government registration ID" value={formData.registrationNumber} onChange={e => updateField('registrationNumber', e.target.value)} required />
                </div>
                <div>
                  <label className={labelClass} htmlFor="org-type">Organization Type *</label>
                  <select id="org-type" className={inputClass} value={formData.organizationType} onChange={e => updateField('organizationType', e.target.value)} required>
                    <option value="">Select type...</option>
                    {ORG_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass} htmlFor="est-year">Established Year *</label>
                    <input id="est-year" type="number" className={inputClass} placeholder="e.g. 1956" value={formData.establishedYear} onChange={e => updateField('establishedYear', e.target.value)} min="1800" max={new Date().getFullYear()} required />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="website">Website</label>
                    <input id="website" type="url" className={inputClass} placeholder="https://www.example.edu" value={formData.website} onChange={e => updateField('website', e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Address */}
            {currentStep === 2 && (
              <div className="space-y-5">
                <div>
                  <label className={labelClass} htmlFor="street">Street Address *</label>
                  <input id="street" type="text" className={inputClass} placeholder="Building, Street" value={formData.address.street} onChange={e => updateNested('address', 'street', e.target.value)} required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass} htmlFor="city">City *</label>
                    <input id="city" type="text" className={inputClass} placeholder="City" value={formData.address.city} onChange={e => updateNested('address', 'city', e.target.value)} required />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="state">State *</label>
                    <input id="state" type="text" className={inputClass} placeholder="State" value={formData.address.state} onChange={e => updateNested('address', 'state', e.target.value)} required />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass} htmlFor="pincode">Pincode *</label>
                    <input id="pincode" type="text" className={inputClass} placeholder="e.g. 110001" value={formData.address.pincode} onChange={e => updateNested('address', 'pincode', e.target.value)} required />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="country">Country</label>
                    <input id="country" type="text" className={inputClass} value={formData.address.country} onChange={e => updateNested('address', 'country', e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Contact Person */}
            {currentStep === 3 && (
              <div className="space-y-5">
                <div>
                  <label className={labelClass} htmlFor="contact-name">Contact Person Name *</label>
                  <input id="contact-name" type="text" className={inputClass} placeholder="Full name" value={formData.contactPerson.name} onChange={e => updateNested('contactPerson', 'name', e.target.value)} required />
                </div>
                <div>
                  <label className={labelClass} htmlFor="contact-designation">Designation</label>
                  <input id="contact-designation" type="text" className={inputClass} placeholder="e.g. Dean of Research" value={formData.contactPerson.designation} onChange={e => updateNested('contactPerson', 'designation', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="contact-email">Email *</label>
                  <input id="contact-email" type="email" className={inputClass} placeholder="contact@organization.edu" value={formData.contactPerson.email} onChange={e => updateNested('contactPerson', 'email', e.target.value)} required />
                </div>
                <div>
                  <label className={labelClass} htmlFor="contact-phone">Phone *</label>
                  <input id="contact-phone" type="tel" className={inputClass} placeholder="+91 98765 43210" value={formData.contactPerson.phone} onChange={e => updateNested('contactPerson', 'phone', e.target.value)} required />
                </div>
              </div>
            )}

            {/* Step 4: Academic Profile */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass} htmlFor="naac">NAAC Accreditation</label>
                    <select id="naac" className={inputClass} value={formData.naacAccreditation} onChange={e => updateField('naacAccreditation', e.target.value)}>
                      {NAAC_GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-3 cursor-pointer" htmlFor="ugc-recognition">
                      <input id="ugc-recognition" type="checkbox" checked={formData.ugcRecognition} onChange={e => updateField('ugcRecognition', e.target.checked)}
                        className="w-5 h-5 rounded border-warm-gray-300 text-primary focus:ring-primary/30" />
                      <span className="text-sm font-semibold text-warm-gray-700">UGC 2(f)/12(B) Recognition</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Focus Areas</label>
                  <div className="flex flex-wrap gap-2">
                    {FOCUS_AREAS.map(area => (
                      <button key={area} type="button"
                        onClick={() => toggleArrayItem('focusAreas', area)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                          formData.focusAreas.includes(area)
                            ? 'bg-primary text-white'
                            : 'bg-cream border border-warm-gray-200 text-warm-gray-600 hover:border-primary hover:text-primary'
                        }`}>
                        {area}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Grant Categories of Interest</label>
                  <div className="space-y-3">
                    {GRANT_CATEGORIES.map(cat => (
                      <label key={cat.value}
                        className={`flex items-start gap-3 p-4 rounded-[12px] border-2 cursor-pointer transition-all duration-200 ${
                          formData.grantCategories.includes(cat.value)
                            ? 'border-primary bg-primary-50'
                            : 'border-warm-gray-200 bg-cream hover:border-warm-gray-300'
                        }`}>
                        <input type="checkbox" checked={formData.grantCategories.includes(cat.value)}
                          onChange={() => toggleArrayItem('grantCategories', cat.value)}
                          className="sr-only" />
                        <span className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          formData.grantCategories.includes(cat.value)
                            ? 'border-primary bg-primary text-white'
                            : 'border-warm-gray-300'
                        }`}>
                          {formData.grantCategories.includes(cat.value) && (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><polyline points="20 6 9 17 4 12" /></svg>
                          )}
                        </span>
                        <div>
                          <span className="block font-semibold text-warm-gray-900 text-sm">{cat.label}</span>
                          <span className="block text-warm-gray-500 text-xs mt-0.5">{cat.desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass} htmlFor="faculty-count">Total Faculty Members</label>
                    <input id="faculty-count" type="number" className={inputClass} placeholder="0" value={formData.totalFaculty} onChange={e => updateField('totalFaculty', e.target.value)} min="0" />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="phd-count">Total PhD Scholars</label>
                    <input id="phd-count" type="number" className={inputClass} placeholder="0" value={formData.totalPhDScholars} onChange={e => updateField('totalPhDScholars', e.target.value)} min="0" />
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Review */}
            {currentStep === 5 && (
              <div className="space-y-6">
                {/* Basic Info Review */}
                <div className="p-5 rounded-[12px] bg-cream border border-warm-gray-200">
                  <h3 className="font-heading text-sm font-bold text-warm-gray-900 mb-3 flex items-center gap-2">🏢 Basic Information</h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div><span className="text-warm-gray-500">Name:</span></div><div className="font-medium text-warm-gray-900">{formData.organizationName}</div>
                    <div><span className="text-warm-gray-500">Reg. No:</span></div><div className="font-medium text-warm-gray-900">{formData.registrationNumber}</div>
                    <div><span className="text-warm-gray-500">Type:</span></div><div className="font-medium text-warm-gray-900 capitalize">{formData.organizationType.replace('_', ' ')}</div>
                    <div><span className="text-warm-gray-500">Established:</span></div><div className="font-medium text-warm-gray-900">{formData.establishedYear}</div>
                    {formData.website && <><div><span className="text-warm-gray-500">Website:</span></div><div className="font-medium text-primary truncate">{formData.website}</div></>}
                  </div>
                </div>

                {/* Address Review */}
                <div className="p-5 rounded-[12px] bg-cream border border-warm-gray-200">
                  <h3 className="font-heading text-sm font-bold text-warm-gray-900 mb-3 flex items-center gap-2">📍 Address</h3>
                  <p className="text-sm text-warm-gray-700 leading-relaxed">
                    {formData.address.street}, {formData.address.city}, {formData.address.state} — {formData.address.pincode}, {formData.address.country}
                  </p>
                </div>

                {/* Contact Review */}
                <div className="p-5 rounded-[12px] bg-cream border border-warm-gray-200">
                  <h3 className="font-heading text-sm font-bold text-warm-gray-900 mb-3 flex items-center gap-2">👤 Contact Person</h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div><span className="text-warm-gray-500">Name:</span></div><div className="font-medium text-warm-gray-900">{formData.contactPerson.name}</div>
                    {formData.contactPerson.designation && <><div><span className="text-warm-gray-500">Designation:</span></div><div className="font-medium text-warm-gray-900">{formData.contactPerson.designation}</div></>}
                    <div><span className="text-warm-gray-500">Email:</span></div><div className="font-medium text-warm-gray-900">{formData.contactPerson.email}</div>
                    <div><span className="text-warm-gray-500">Phone:</span></div><div className="font-medium text-warm-gray-900">{formData.contactPerson.phone}</div>
                  </div>
                </div>

                {/* Academic Review */}
                <div className="p-5 rounded-[12px] bg-cream border border-warm-gray-200">
                  <h3 className="font-heading text-sm font-bold text-warm-gray-900 mb-3 flex items-center gap-2">🎓 Academic Profile</h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div><span className="text-warm-gray-500">NAAC:</span></div><div className="font-medium text-warm-gray-900">{formData.naacAccreditation}</div>
                    <div><span className="text-warm-gray-500">UGC Recognition:</span></div><div className="font-medium text-warm-gray-900">{formData.ugcRecognition ? 'Yes' : 'No'}</div>
                    <div><span className="text-warm-gray-500">Faculty:</span></div><div className="font-medium text-warm-gray-900">{formData.totalFaculty || 0}</div>
                    <div><span className="text-warm-gray-500">PhD Scholars:</span></div><div className="font-medium text-warm-gray-900">{formData.totalPhDScholars || 0}</div>
                  </div>
                  {formData.focusAreas.length > 0 && (
                    <div className="mt-3">
                      <span className="text-sm text-warm-gray-500">Focus Areas: </span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {formData.focusAreas.map(a => <span key={a} className="px-2 py-0.5 rounded-full bg-primary-50 text-primary text-xs font-medium">{a}</span>)}
                      </div>
                    </div>
                  )}
                  {formData.grantCategories.length > 0 && (
                    <div className="mt-3">
                      <span className="text-sm text-warm-gray-500">Grant Categories: </span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {formData.grantCategories.map(c => <span key={c} className="px-2 py-0.5 rounded-full bg-amber-50 text-amber text-xs font-medium capitalize">{c.replace('_', ' ')}</span>)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-warm-gray-200">
              {currentStep > 1 ? (
                <button type="button" onClick={() => setCurrentStep(s => s - 1)}
                  className="px-6 py-3 rounded-[12px] font-semibold text-warm-gray-600 border border-warm-gray-200 hover:bg-cream transition-all duration-200 cursor-pointer">
                  ← Back
                </button>
              ) : (
                <div />
              )}

              {currentStep < 5 ? (
                <button type="button" onClick={() => setCurrentStep(s => s + 1)} disabled={!canProceed()}
                  className={`px-8 py-3 rounded-[12px] font-semibold text-white shadow-soft transition-all duration-300 cursor-pointer ${
                    canProceed()
                      ? 'bg-primary hover:bg-primary-dark hover:shadow-medium hover:-translate-y-0.5'
                      : 'bg-warm-gray-300 cursor-not-allowed'
                  }`}>
                  Next →
                </button>
              ) : (
                <button type="button" onClick={handleSubmit} disabled={isSubmitting}
                  className="px-8 py-3 rounded-[12px] font-semibold text-white bg-primary hover:bg-primary-dark shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-0.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
                  {isSubmitting ? 'Submitting...' : 'Submit for Verification'}
                </button>
              )}
            </div>
          </div>

          <p className="text-center mt-6">
            <Link to="/" className="text-sm text-warm-gray-400 hover:text-warm-gray-600 transition-colors">
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
