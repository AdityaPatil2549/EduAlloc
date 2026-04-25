import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import './i18n/index.js'
import './index.css'
import Dashboard from './pages/Dashboard'
import Deploy from './pages/Deploy'
import Briefing from './pages/Briefing'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'nav.dashboard', icon: '🗺' },
  { id: 'deploy',    label: 'nav.deploy',    icon: '📋' },
  { id: 'briefing',  label: 'nav.briefing',  icon: '📄' },
]

export default function App() {
  const { t, i18n } = useTranslation()
  const [page, setPage] = useState('dashboard')

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'mr' : 'en')
    document.body.classList.toggle('lang-mr', i18n.language === 'en')
  }

  return (
    <div className="flex flex-col h-screen font-body" style={{ background: 'var(--surface)' }}>
      {/* ── Top navigation (Dark Intelligence) ───────────────────── */}
      <header className="flex items-center justify-between px-6 py-3 flex-shrink-0 shadow-sm"
              style={{ background: 'var(--inverse-surface)', color: 'var(--text-inverse)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded flex items-center justify-center text-sm font-bold"
               style={{ background: 'var(--primary)' }}>E</div>
          <span className="font-bold tracking-tight text-sm">EduAllocPro</span>
          <span className="text-xs ml-2 opacity-60 hidden sm:block uppercase tracking-wider">Mission Control</span>
        </div>

        <nav className="flex items-center gap-2">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              id={`nav-${item.id}`}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                page === item.id
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="mr-2">{item.icon}</span>
              {t(item.label)}
            </button>
          ))}
        </nav>

        {/* Language toggle */}
        <button
          onClick={toggleLanguage}
          id="language-toggle-btn"
          className="px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all"
          style={{ border: '1px solid var(--outline-variant)', color: 'var(--outline-variant)' }}
        >
          {i18n.language === 'en' ? 'EN / MR' : 'MR / EN'}
        </button>
      </header>

      {/* ── Page content ──────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden relative">
        {page === 'dashboard' && <Dashboard />}
        {page === 'deploy'    && <Deploy />}
        {page === 'briefing'  && <Briefing />}
      </main>
    </div>
  )
}
