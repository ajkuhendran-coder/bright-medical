import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Home from './pages/Home'
import Impressum from './pages/Impressum'
import Datenschutz from './pages/Datenschutz'
import AGB from './pages/AGB'
import Fragebogen from './pages/Fragebogen'
import Termin from './pages/Termin'
import Vereinbarung from './pages/Vereinbarung'
import MeinProgramm from './pages/MeinProgramm'
import NotFound from './pages/NotFound'

export default function App() {
  return (
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
  )
}
