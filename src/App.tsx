import { Routes, Route } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import Layout from './components/layout/Layout'
import Home from './pages/Home'
import Impressum from './pages/Impressum'
import Datenschutz from './pages/Datenschutz'
import AGB from './pages/AGB'
import NotFound from './pages/NotFound'

// Eigenständige Flows aus dem Marketing-Bundle heraustrennen (Code-Splitting):
// die Marketing-Seite lädt schneller, und Portal-Änderungen invalidieren nicht
// den Marketing-Cache. Jede Route lädt ihren Chunk erst beim Aufruf.
const MeinProgramm = lazy(() => import('./pages/MeinProgramm'))
const Fragebogen = lazy(() => import('./pages/Fragebogen'))
const Termin = lazy(() => import('./pages/Termin'))
const Vereinbarung = lazy(() => import('./pages/Vereinbarung'))

export default function App() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100dvh', background: '#F7F9FB' }} />}>
      <Routes>
        {/* Standalone-App-Shell, ohne Marketing-Nav/Footer */}
        <Route path="/mein-programm" element={<MeinProgramm />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/impressum" element={<Impressum />} />
          <Route path="/datenschutz" element={<Datenschutz />} />
          <Route path="/agb" element={<AGB />} />
          <Route path="/fragebogen" element={<Fragebogen />} />
          <Route path="/termin" element={<Termin />} />
          <Route path="/vereinbarung" element={<Vereinbarung />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
