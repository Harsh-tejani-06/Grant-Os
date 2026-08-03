import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import SignupPage from './pages/SignupPage.jsx'
import OrgRegistrationPage from './pages/OrgRegistrationPage.jsx'
import OrgPendingPage from './pages/OrgPendingPage.jsx'
import OrgRejectedPage from './pages/OrgRejectedPage.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import OrgDashboardPage from './pages/OrgDashboardPage.jsx'
import MemberPendingVerificationPage from './pages/MemberPendingVerificationPage.jsx'
import TeamMemberDashboard from './pages/TeamMemberDashboard.jsx'
import FundingAgencyRegistrationPage from './pages/FundingAgencyRegistrationPage.jsx'
import FundingAgencyPendingPage from './pages/FundingAgencyPendingPage.jsx'
import FundingAgencyRejectedPage from './pages/FundingAgencyRejectedPage.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/org/register" element={<OrgRegistrationPage />} />
      <Route path="/org/pending" element={<OrgPendingPage />} />
      <Route path="/org/rejected" element={<OrgRejectedPage />} />
      <Route path="/org/dashboard" element={<OrgDashboardPage />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/member/pending-verification" element={<MemberPendingVerificationPage />} />
      <Route path="/member/dashboard" element={<TeamMemberDashboard />} />
      <Route path="/agency/register" element={<FundingAgencyRegistrationPage />} />
      <Route path="/agency/pending" element={<FundingAgencyPendingPage />} />
      <Route path="/agency/rejected" element={<FundingAgencyRejectedPage />} />
    </Routes>
  )
}

export default App
