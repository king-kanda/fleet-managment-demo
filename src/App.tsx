import { useState } from 'react'
import { Sidebar, type View } from './components/Sidebar'
import { Dashboard } from './pages/Dashboard'
import { MapView } from './pages/MapView'
import { Trips } from './pages/Trips'
import { Drivers } from './pages/Drivers'
import { WhatsApp } from './pages/WhatsApp'
import { Settings } from './pages/Settings'

export function App() {
  const [view, setView] = useState<View>('dashboard')

  return (
    <div className="app">
      <Sidebar view={view} setView={setView} />
      <main className="main">
        {view === 'dashboard' && <Dashboard onNavigate={setView} />}
        {view === 'map' && <MapView />}
        {view === 'trips' && <Trips />}
        {view === 'drivers' && <Drivers />}
        {view === 'whatsapp' && <WhatsApp />}
        {view === 'settings' && <Settings />}
      </main>
    </div>
  )
}
