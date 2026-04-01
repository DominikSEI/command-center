import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Tracker from './pages/Tracker'
import Tasks from './pages/Tasks'
import Ideas from './pages/Ideas'
import Trading from './pages/Trading'
import Notes from './pages/Notes'
import Briefing from './pages/Briefing'
import Content from './pages/Content'
import VPS from './pages/VPS'

function PrivateRoute({ children }) {
  return localStorage.getItem('token') ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/monitor" replace />} />
        <Route path="monitor" element={<Dashboard />} />
        <Route path="tracker" element={<Tracker />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="ideas" element={<Ideas />} />
        <Route path="trading" element={<Trading />} />
        <Route path="briefing" element={<Briefing />} />
        <Route path="content" element={<Content />} />
        <Route path="vps" element={<VPS />} />
        <Route path="notes" element={<Notes />} />
      </Route>
    </Routes>
  )
}
