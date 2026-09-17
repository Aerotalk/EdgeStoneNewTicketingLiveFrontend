import { Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Toaster } from 'react-hot-toast'

// Lazy load pages for code splitting
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'))
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'))
const OverviewPage = lazy(() => import('./pages/dashboard/OverviewPage'))
const TicketsPage = lazy(() => import('./pages/dashboard/TicketsPage'))
const ClientsPage = lazy(() => import('./pages/dashboard/ClientsPage'))
const VendorsPage = lazy(() => import('./pages/dashboard/VendorsPage'))
const AssignAgentsPage = lazy(() => import('./pages/dashboard/AssignAgentsPage'))
const SLAPage = lazy(() => import('./pages/dashboard/SLAPage'))
const CircuitsPage = lazy(() => import('./pages/dashboard/CircuitsPage'))
const TicketRoadmapView = lazy(() => import('./pages/dashboard/TicketRoadmapView'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

const PageLoader = () => (
  <div className="flex h-screen w-full items-center justify-center bg-gray-50/50 backdrop-blur-sm">
    <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
  </div>
)

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Dashboard Routes */}
            <Route path="/dashboard/:id" element={<DashboardLayout />}>
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<OverviewPage />} />
              <Route path="tickets" element={<TicketsPage />} />
              <Route path="clients" element={<ClientsPage />} />
              <Route path="vendors" element={<VendorsPage />} />
              <Route path="circuits" element={<CircuitsPage />} />
              <Route path="assign-agents" element={
                <ProtectedRoute requireSuperAdmin={true}>
                  <AssignAgentsPage />
                </ProtectedRoute>
              } />
              <Route path="sla" element={<SLAPage />} />
            </Route>

            {/* Roadmap standalone route */}
            <Route path="/roadmap" element={<TicketRoadmapView />} />

            {/* Default Route */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Fallback for 404 (Game) */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  )
}

export default App
