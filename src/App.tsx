import { useState } from 'react'
import { Sidebar, type View } from './components/Sidebar'
import { Dashboard } from './pages/Dashboard'
import { MapView } from './pages/MapView'
import { Fleet } from './pages/Fleet'
import { Trips } from './pages/Trips'
import { Drivers } from './pages/Drivers'
import { WhatsApp } from './pages/WhatsApp'
import { Settings } from './pages/Settings'
import { Login } from './pages/Login'
import { ToastProvider } from './components/ui/Toast'
import { Onboarding } from './components/Onboarding'
import { useAuth } from './lib/auth'

export function App() {
  const user = useAuth()
  const [view, setView] = useState<View>('dashboard')

  if (!user) {
    return (
      <ToastProvider>
        <Login />
      </ToastProvider>
    )
  }

  return (
    <ToastProvider>
      <div className="app">
        <Sidebar view={view} setView={setView} />
        <main className={`main ${view === 'map' ? 'map-flush' : ''}`}>
          {view === 'dashboard' && <Dashboard onNavigate={setView} />}
          {view === 'map' && <MapView />}
          {view === 'fleet' && <Fleet />}
          {view === 'trips' && <Trips />}
          {view === 'drivers' && <Drivers />}
          {view === 'whatsapp' && <WhatsApp />}
          {view === 'settings' && <Settings />}
        </main>
        <Onboarding />
      </div>
    </ToastProvider>
  )
}
