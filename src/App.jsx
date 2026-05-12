import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import Home from './pages/Home'
import JobBoard from './pages/JobBoard'
import AdminLogin from './pages/admin/Login'
import AdminLayout from './components/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import Applications from './pages/admin/Applications'
import Messages from './pages/admin/Messages'
import UserTracking from './pages/admin/UserTracking'
import Inbox from './pages/admin/Inbox'
import Employees from './pages/admin/Employees'
import ReportDetail from './pages/admin/ReportDetail'
import SiteAnalytics from './pages/admin/SiteAnalytics'
import EventQuote from './pages/EventQuote'
import Menu from './pages/Menu'
import Quotes from './pages/admin/Quotes'
import QuoteDetail from './pages/admin/QuoteDetail'
import QuoteBEO from './pages/admin/QuoteBEO'
import Calendar from './pages/admin/Calendar'
import WorkspaceShell from './pages/admin/workspace/WorkspaceShell'
import Sales from './pages/admin/Sales'
import Meetings from './pages/admin/Meetings'
import MeetingRoom from './pages/admin/MeetingRoom'
import QuoteCotizacion from './pages/admin/QuoteCotizacion'
import AportacionDetail from './pages/admin/AportacionDetail'
import Communities from './pages/admin/Communities'
import Permissions from './pages/admin/Permissions'
import Reservations from './pages/admin/Reservations'
import MothersDayReservation from './pages/MothersDayReservation'
import ReservationClientDetail from './pages/ReservationClientDetail'
import SpecialEventReservation from './pages/SpecialEventReservation'
import StandardReservation from './pages/StandardReservation'
import DialDevLab from './pages/dev/DialDevLab'
import { applySandboxSeoGuards, getSandboxLabel, isSandboxEnvironment } from './config/runtime'

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/admin/login" />;
}

function App() {
  const sandboxMode = isSandboxEnvironment();

  useEffect(() => {
    applySandboxSeoGuards();
  }, []);

  return (
    <ThemeProvider>
      <Router>
      {sandboxMode && (
        <div className="sandbox-badge" role="status" aria-label="Entorno sandbox activo">
          {getSandboxLabel()}
        </div>
      )}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/bolsa-de-trabajo" element={<JobBoard />} />
        <Route path="/cotizador" element={<EventQuote />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/reservacion-dia-madres" element={<MothersDayReservation />} />
        <Route path="/reservacion" element={<StandardReservation />} />
        <Route path="/reservacion-especial/:slug" element={<SpecialEventReservation />} />
        <Route path="/reservacion-detalle" element={<ReservationClientDetail />} />
        {import.meta.env.DEV ? <Route path="/dev/dial-lab" element={<DialDevLab />} /> : null}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/admin/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="applications" element={<Applications />} />
          <Route path="messages" element={<Messages />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="employees" element={<Employees />} />
          <Route path="quotes" element={<Quotes />} />
          <Route path="quotes/:id" element={<QuoteDetail />} />
          <Route path="quotes/:id/beo" element={<QuoteBEO />} />
          <Route path="quotes/:id/cotizacion" element={<QuoteCotizacion />} />
          <Route path="calendar" element={<Navigate to="/admin/workspace" replace />} />
          <Route path="sales" element={<Sales />} />
          <Route path="meetings" element={<Meetings />} />
          <Route path="meetings/:id" element={<MeetingRoom />} />
          <Route path="tracking" element={<UserTracking />} />
          <Route path="analytics" element={<SiteAnalytics />} />
          <Route path="communities" element={<Communities />} />
          <Route path="permissions" element={<Permissions />} />
          <Route path="reservations" element={<Reservations />} />
        </Route>
        <Route path="/admin/workspace" element={<ProtectedRoute><WorkspaceShell /></ProtectedRoute>} />
        <Route path="/admin/report/:reportId" element={<ProtectedRoute><ReportDetail /></ProtectedRoute>} />
        <Route path="/admin/aportaciones/:id" element={<ProtectedRoute><AportacionDetail /></ProtectedRoute>} />
      </Routes>
      </Router>
    </ThemeProvider>
  )
}

export default App
