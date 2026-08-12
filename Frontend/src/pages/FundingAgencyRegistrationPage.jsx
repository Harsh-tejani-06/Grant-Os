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
  { id: 1, title: 'Basic Identity', icon: '🏛️' },
  { id: 2, title: 'Legal Verification', icon: '📜' },
  { id: 3, title: 'Headquarters', icon: '📍' },
  { id: 4, title: 'Contact Officer', icon: '👤' },
  { id: 5, title: 'Funding Profile', icon: '💰' },
]

const AGENCY_TYPES = [
  { value: 'government_central', label: 'Government (Central / Ministry)' },
  { value: 'government_state', label: 'Government (State Council / Department)' },
  { value: 'corporate_csr', label: 'Corporate CSR' },
  { value: 'private_foundation', label: 'Private Foundation / Trust' },
  { value: 'international_agency', label: 'International Agency (UN / World Bank / Global)' },
]

const FUNDING_DOMAINS = [
  'Science & Technology', 'Healthcare & Medicine', 'Social Sciences & Humanities',
  'Education & Skill Development', 'Environmental Conservation', 'Agriculture & Rural Development',
  'Innovation & Entrepreneurship', 'Artificial Intelligence & Deep Tech',
]

const GRANT_TYPES = [
  { value: 'research_grant', label: 'Research Grant', desc: 'Project-based research funding for institutions and labs' },
  { value: 'startup_seed', label: 'Startup & Innovation Seed Grant', desc: 'Pre-seed or proof-of-concept capital' },
  { value: 'institutional_infra', label: 'Institutional Infrastructure', desc: 'Equipment, lab upgrading & facility grants' },
]

const inputClass = "w-full px-4 py-3 rounded-[12px] bg-cream border border-warm-gray-200 text-warm-gray-900 placeholder:text-warm-gray-400 focus:outline-none focus:ring-2 focus:ring-amber/30 focus:border-amber transition-all duration-200"
const labelClass = "block text-sm font-semibold text-warm-gray-700 mb-2"

export default function FundingAgencyRegistrationPage() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    agencyName: '',
    agencyType: '',
    establishedYear: '',
    website: '',
    cin: '',
    darpanId: '',
    csrRegistrationNumber: '',
    authorizationLetterUrl: '',
    registrationCertificateUrl: '',
    headquarters: { street: '', city: '', state: '', pincode: '', country: 'India' },
    contactPerson: { name: '', designation: '', email: '', phone: '' },
    fundingDomains: [],
    grantTypesOffered: [],
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
        return formData.agencyName && formData.agencyType && formData.establishedYear
      case 2:
        return true // Legal fields optional/conditional
      case 3:
        return formData.headquarters.street && formData.headquarters.city && formData.headquarters.state && formData.headquarters.pincode
      case 4:
        return formData.contactPerson.name && formData.contactPerson.email && formData.contactPerson.phone
      case 5:
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
      }
      await api.post('/agency/register', payload)
      setSubmitSuccess(true)

      // Refresh user auth status
      const meRes = await api.get('/auth/me')
      if (meRes.data.success) {
        localStorage.setItem('grantos_user', JSON.stringify(meRes.data.user))
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit funding agency application. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-6">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-amber/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 w-full max-w-lg text-center">
          <div className="bg-surface-elevated rounded-[16px] border border-warm-gray-200/60 shadow-soft p-10">
            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">🏛️</span>
            </div>
            <h1 className="font-heading text-3xl font-bold text-warm-gray-900 mb-3">
              Agency Application Submitted!
            </h1>
            <p className="text-warm-gray-500 leading-relaxed mb-6">
              Your funding agency credentials have been submitted for verification. Our administrative compliance team will review your application within <strong className="text-warm-gray-700">3 business days</strong>.
            </p>
            <div className="p-4 rounded-[12px] bg-amber-50 border border-amber/15 mb-8 text-left">
              <p className="text-sm text-amber leading-relaxed">
                <strong>💡 Verification process:</strong> We verify official domains, legal registration IDs (CIN/Darpan), and authorization documents before granting full access to post grants.
              </p>
            </div>
            <button
              onClick={() => navigate('/agency/pending')}
              className="w-full py-3.5 rounded-[12px] font-semibold text-white bg-amber hover:bg-amber-light shadow-soft transition-all duration-300 cursor-pointer"
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
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-amber/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex-1 flex items-start justify-center px-6 py-8">
        <div className="w-full max-w-2xl">
          {/* Logo */}
          <Link to="/agency/dashboard" className="flex items-center justify-center gap-2 mb-8 group" id="agency-reg-logo">
            <div className="w-11 h-11 bg-amber rounded-[12px] flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-105">
              <LeafIcon />
            </div>
            <span className="font-heading text-2xl font-semibold text-warm-gray-900 tracking-tight">
              Grant<span className="text-amber">OS</span>
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
                        ? 'bg-amber text-white'
                        : currentStep === step.id
                        ? 'bg-amber text-white shadow-glow'
                        : 'bg-warm-gray-100 text-warm-gray-400'
                    }`}
                  >
                    {currentStep > step.id ? <CheckCircleIcon /> : step.icon}
                  </div>
                  <span className={`text-xs mt-1.5 font-medium ${
                    currentStep >= step.id ? 'text-amber font-semibold' : 'text-warm-gray-400'
                  }`}>
                    {step.title}
                  </span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`w-12 sm:w-20 h-0.5 mx-1 mt-[-18px] transition-colors duration-300 ${
                    currentStep > step.id ? 'bg-amber' : 'bg-warm-gray-200'
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
              {currentStep === 1 && 'Basic credentials of the Funding Agency'}
              {currentStep === 2 && 'Public legal identifiers and official authorization'}
              {currentStep === 3 && 'Headquarters location details'}
              {currentStep === 4 && 'Contact person details (kept strictly confidential for vetting)'}
              {currentStep === 5 && 'Funding domains and grant categories offered'}
            </p>

            {error && (
              <div className="p-4 rounded-[12px] bg-red-50 border border-red-200 mb-6">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Step 1: Basic Identity */}
            {currentStep === 1 && (
              <div className="space-y-5">
                <div>
                  <label className={labelClass} htmlFor="agency-name">Funding Agency Name *</label>
                  <input id="agency-name" type="text" className={inputClass} placeholder="e.g. Dept. of Science & Technology (DST)" value={formData.agencyName} onChange={e => updateField('agencyName', e.target.value)} required />
                </div>
                <div>
                  <label className={labelClass} htmlFor="agency-type">Agency Classification *</label>
                  <select id="agency-type" className={inputClass} value={formData.agencyType} onChange={e => updateField('agencyType', e.target.value)} required>
                    <option value="">Select agency type...</option>
                    {AGENCY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass} htmlFor="est-year">Established Year *</label>
                    <input id="est-year" type="number" className={inputClass} placeholder="e.g. 1971" value={formData.establishedYear} onChange={e => updateField('establishedYear', e.target.value)} min="1800" max={new Date().getFullYear()} required />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="website">Official Website URL</label>
                    <input id="website" type="url" className={inputClass} placeholder="https://dst.gov.in" value={formData.website} onChange={e => updateField('website', e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Legal Verification */}
            {currentStep === 2 && (
              <div className="space-y-5">
                <div className="p-4 rounded-[12px] bg-amber-50 border border-amber/15 mb-2">
                  <p className="text-xs text-amber leading-relaxed">
                    <strong>🌐 Public vs. Confidential:</strong> Legal IDs (CIN, Darpan ID) are public identifiers. Uploaded authorization letters are stored securely and reviewed exclusively by the System Admin.
                  </p>
                </div>

                {formData.agencyType === 'corporate_csr' && (
                  <>
                    <div>
                      <label className={labelClass} htmlFor="cin">Corporate Identification Number (CIN)</label>
                      <input id="cin" type="text" className={inputClass} placeholder="e.g. L24231TN1984PLC010934" value={formData.cin} onChange={e => updateField('cin', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="csr-reg">Form CSR-1 Registration Number</label>
                      <input id="csr-reg" type="text" className={inputClass} placeholder="e.g. CSR00012345" value={formData.csrRegistrationNumber} onChange={e => updateField('csrRegistrationNumber', e.target.value)} />
                    </div>
                  </>
                )}

                {formData.agencyType === 'private_foundation' && (
                  <div>
                    <label className={labelClass} htmlFor="darpan">NGO Darpan ID (NITI Aayog)</label>
                    <input id="darpan" type="text" className={inputClass} placeholder="e.g. DL/2018/0123456" value={formData.darpanId} onChange={e => updateField('darpanId', e.target.value)} />
                  </div>
                )}

                <div>
                  <label className={labelClass} htmlFor="auth-doc">Authorization Letter Document URL / Reference</label>
                  <input id="auth-doc" type="text" className={inputClass} placeholder="Link to authorization document or document reference number" value={formData.authorizationLetterUrl} onChange={e => updateField('authorizationLetterUrl', e.target.value)} />
                  <p className="text-xs text-warm-gray-400 mt-1">Official letter from Head of Dept / Trustee authorizing this account</p>
                </div>

                <div>
                  <label className={labelClass} htmlFor="reg-cert">Registration Certificate Document URL / Gazette Ref</label>
                  <input id="reg-cert" type="text" className={inputClass} placeholder="Link to registration certificate or gazette notification" value={formData.registrationCertificateUrl} onChange={e => updateField('registrationCertificateUrl', e.target.value)} />
                </div>
              </div>
            )}

            {/* Step 3: Headquarters */}
            {currentStep === 3 && (
              <div className="space-y-5">
                <div>
                  <label className={labelClass} htmlFor="street">Street Address *</label>
                  <input id="street" type="text" className={inputClass} placeholder="Building, Street, Sector" value={formData.headquarters.street} onChange={e => updateNested('headquarters', 'street', e.target.value)} required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass} htmlFor="city">City *</label>
                    <input id="city" type="text" className={inputClass} placeholder="e.g. New Delhi" value={formData.headquarters.city} onChange={e => updateNested('headquarters', 'city', e.target.value)} required />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="state">State *</label>
                    <input id="state" type="text" className={inputClass} placeholder="e.g. Delhi" value={formData.headquarters.state} onChange={e => updateNested('headquarters', 'state', e.target.value)} required />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className={labelClass} htmlFor="pincode">Pincode *</label>
                    <input id="pincode" type="text" className={inputClass} placeholder="e.g. 110016" value={formData.headquarters.pincode} onChange={e => updateNested('headquarters', 'pincode', e.target.value)} required />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="country">Country</label>
                    <input id="country" type="text" className={inputClass} value={formData.headquarters.country} onChange={e => updateNested('headquarters', 'country', e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Contact Officer (Semi-Sensitive) */}
            {currentStep === 4 && (
              <div className="space-y-5">
                <div className="p-4 rounded-[12px] bg-red-50 border border-red-200 mb-2">
                  <p className="text-xs text-red-700 leading-relaxed">
                    <strong>🔒 Privacy Guarantee:</strong> Your personal contact details (email, phone, name) will NEVER be published on the public portal. They are strictly used for admin verification and internal notifications.
                  </p>
                </div>

                <div>
                  <label className={labelClass} htmlFor="contact-name">Nodal Officer / Contact Name *</label>
                  <input id="contact-name" type="text" className={inputClass} placeholder="Dr. A. K. Sharma" value={formData.contactPerson.name} onChange={e => updateNested('contactPerson', 'name', e.target.value)} required />
                </div>
                <div>
                  <label className={labelClass} htmlFor="contact-designation">Official Designation</label>
                  <input id="contact-designation" type="text" className={inputClass} placeholder="e.g. Scientist G / Head of Grants" value={formData.contactPerson.designation} onChange={e => updateNested('contactPerson', 'designation', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="contact-email">Official Email Address *</label>
                  <input id="contact-email" type="email" className={inputClass} placeholder="officer@agency.gov.in (must use official domain)" value={formData.contactPerson.email} onChange={e => updateNested('contactPerson', 'email', e.target.value)} required />
                </div>
                <div>
                  <label className={labelClass} htmlFor="contact-phone">Official Phone Number *</label>
                  <input id="contact-phone" type="tel" className={inputClass} placeholder="+91 11 2659 0000" value={formData.contactPerson.phone} onChange={e => updateNested('contactPerson', 'phone', e.target.value)} required />
                </div>
              </div>
            )}

            {/* Step 5: Funding Profile & Review */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div>
                  <label className={labelClass}>Funding Focus Domains</label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {FUNDING_DOMAINS.map(domain => (
                      <button key={domain} type="button"
                        onClick={() => toggleArrayItem('fundingDomains', domain)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${
                          formData.fundingDomains.includes(domain)
                            ? 'bg-amber text-white'
                            : 'bg-cream border border-warm-gray-200 text-warm-gray-600 hover:border-amber hover:text-amber'
                        }`}>
                        {domain}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Grant Categories Offered</label>
                  <div className="space-y-3 mb-6">
                    {GRANT_TYPES.map(grant => (
                      <label key={grant.value}
                        className={`flex items-start gap-3 p-4 rounded-[12px] border-2 cursor-pointer transition-all duration-200 ${
                          formData.grantTypesOffered.includes(grant.value)
                            ? 'border-amber bg-amber-50'
                            : 'border-warm-gray-200 bg-cream hover:border-warm-gray-300'
                        }`}>
                        <input type="checkbox" checked={formData.grantTypesOffered.includes(grant.value)}
                          onChange={() => toggleArrayItem('grantTypesOffered', grant.value)}
                          className="sr-only" />
                        <span className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          formData.grantTypesOffered.includes(grant.value)
                            ? 'border-amber bg-amber text-white'
                            : 'border-warm-gray-300'
                        }`}>
                          {formData.grantTypesOffered.includes(grant.value) && (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><polyline points="20 6 9 17 4 12" /></svg>
                          )}
                        </span>
                        <div>
                          <span className="block font-semibold text-warm-gray-900 text-sm">{grant.label}</span>
                          <span className="block text-warm-gray-500 text-xs mt-0.5">{grant.desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Review summary */}
                <div className="p-5 rounded-[12px] bg-cream border border-warm-gray-200">
                  <h3 className="font-heading text-sm font-bold text-warm-gray-900 mb-3">🏛️ Agency Summary</h3>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div><span className="text-warm-gray-500">Agency Name:</span></div><div className="font-medium text-warm-gray-900">{formData.agencyName}</div>
                    <div><span className="text-warm-gray-500">Classification:</span></div><div className="font-medium text-warm-gray-900 capitalize">{formData.agencyType.replace('_', ' ')}</div>
                    <div><span className="text-warm-gray-500">Established:</span></div><div className="font-medium text-warm-gray-900">{formData.establishedYear}</div>
                    <div><span className="text-warm-gray-500">Nodal Officer:</span></div><div className="font-medium text-warm-gray-900">{formData.contactPerson.name}</div>
                    <div><span className="text-warm-gray-500">Official Email:</span></div><div className="font-medium text-warm-gray-900">{formData.contactPerson.email}</div>
                  </div>
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
                      ? 'bg-amber hover:bg-amber-light hover:shadow-medium hover:-translate-y-0.5'
                      : 'bg-warm-gray-300 cursor-not-allowed'
                  }`}>
                  Next →
                </button>
              ) : (
                <button type="button" onClick={handleSubmit} disabled={isSubmitting}
                  className="px-8 py-3 rounded-[12px] font-semibold text-white bg-amber hover:bg-amber-light shadow-soft hover:shadow-medium transition-all duration-300 hover:-translate-y-0.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
                  {isSubmitting ? 'Submitting Application...' : 'Submit for Verification'}
                </button>
              )}
            </div>
          </div>
{/* 
          <p className="text-center mt-6">
            <Link to="/agency/dashboard" className="text-sm text-warm-gray-400 hover:text-warm-gray-600 transition-colors">
              ← Back to Dashboard
            </Link>
          </p> */}
        </div>
      </div>
    </div>
  )
}
