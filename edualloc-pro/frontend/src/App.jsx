import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { motion, AnimatePresence } from 'framer-motion'
import { auth } from './lib/firebase'
import './i18n/index.js'
import './index.css'

import Dashboard from './pages/Dashboard'
import Deploy from './pages/Deploy'
import Briefing from './pages/Briefing'
import Login from './pages/Login'
import DeploymentMap from './pages/DeploymentMap'
import DistrictAnalytics from './pages/DistrictAnalytics'
import BEODashboard from './pages/BEODashboard'

const NAV_ITEMS = [
  { id: 'dashboard', icon: 'dashboard',     text: 'Intelligence',       subtext: 'School overview' },
  { id: 'briefing',  icon: 'auto_awesome',  text: 'AI Briefing',        subtext: 'Gemini analysis' },
  { id: 'deploy',    icon: 'groups',        text: 'Staffing Pool',      subtext: 'Match teachers' },
  { id: 'map',       icon: 'explore',       text: 'Deployment Map',     subtext: 'Geospatial view' },
  { id: 'analytics', icon: 'insights',      text: 'District Analytics', subtext: 'BigQuery metrics' },
  { id: 'beo',       icon: 'supervisor_account', text: 'BEO View',      subtext: 'Block officer panel' },
]

export default function App() {
  const { t, i18n } = useTranslation()
  const [page, setPage] = useState('dashboard')

  // Auth state
  const [user, setUser] = useState(null)
  const [authChecking, setAuthChecking] = useState(true)
  const [bypassed, setBypassed] = useState(false)

  // Header dropdowns
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('auth_bypass') === 'true') {
      setBypassed(true)
      setAuthChecking(false)
      return
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setAuthChecking(false)
    })
    return () => unsubscribe()
  }, [])

  // Expose global navigate for components to use
  useEffect(() => {
    window._navigateToDeploy = (schoolId) => setPage('deploy')
  }, [])

  const handleLogout = async () => {
    if (bypassed) {
      sessionStorage.removeItem('auth_bypass')
      window.location.reload()
      return
    }
    await signOut(auth)
  }

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'mr' : 'en')
  }

  if (authChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0A0F1E]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <p className="text-slate-500 text-sm font-semibold">Initializing…</p>
        </div>
      </div>
    )
  }

  if (!user && !bypassed) {
    window._triggerAuthBypass = () => {
      sessionStorage.setItem('auth_bypass', 'true')
      setBypassed(true)
    }
    return <Login />
  }

  return (
    <div className="bg-slate-50 antialiased flex h-screen overflow-hidden">

      {/* ── SideNavBar ──────────────────────────────────────────────────────── */}
      <nav className="flex flex-col h-screen fixed w-[240px] z-50 bg-[#0A0F1E]">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-900">
              <span className="material-symbols-outlined text-white text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-white leading-none">EduGov Pro</h1>
              <p className="text-[10px] text-slate-500 font-semibold mt-0.5 uppercase tracking-widest">District Intelligence</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-3 px-3">
          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest px-2 py-2 mb-1">Navigation</p>
          <ul className="space-y-0.5">
            {NAV_ITEMS.map(item => {
              const isActive = page === item.id
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setPage(item.id)}
                    className={`w-full text-left px-3 py-3 rounded-lg flex items-center gap-3 transition-all group ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-[20px] flex-shrink-0"
                      style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                    >
                      {item.icon}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold leading-tight">{item.text}</div>
                      <div className={`text-[10px] font-medium leading-none mt-0.5 ${isActive ? 'text-blue-200' : 'text-slate-600'}`}>
                        {item.subtext}
                      </div>
                    </div>
                    {isActive && (
                      <span className="material-symbols-outlined text-[14px] ml-auto text-blue-300">chevron_right</span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Bottom user area */}
        <div className="border-t border-white/5 p-3">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 cursor-pointer" onClick={handleLogout}>
            <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-blue-400 text-[16px]">person</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-300 truncate">{user?.email || 'District Officer'}</p>
              <p className="text-[10px] text-slate-600">Nandurbar</p>
            </div>
            <span className="material-symbols-outlined text-slate-600 text-[16px]">logout</span>
          </div>
        </div>
      </nav>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <div className="ml-[240px] flex-1 flex flex-col h-screen w-full min-w-0">

        {/* TopNavBar */}
        <header className="sticky top-0 w-full border-b border-slate-200 z-40 bg-white/80 backdrop-blur-md flex items-center justify-between px-6 py-2 h-14 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-slate-400 text-xs font-semibold">
              <span>District</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-slate-800 font-bold capitalize">
                {NAV_ITEMS.find(n => n.id === page)?.text || 'Dashboard'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative hidden md:block">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">search</span>
              <input
                className="pl-8 pr-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none focus:bg-white w-44 text-slate-700 placeholder-slate-400 transition-all"
                placeholder="Search schools…"
                type="text"
              />
            </div>

            {/* Language toggle */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors px-3 py-1.5 rounded-lg text-xs font-bold"
            >
              <span className="material-symbols-outlined text-[14px]">translate</span>
              {i18n.language === 'en' ? 'मराठी' : 'EN'}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false) }}
                className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white" />
              </button>
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    className="absolute right-0 top-12 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Alerts</p>
                    </div>
                    {[
                      { icon: 'warning', color: 'rose', msg: '3 deployments pending final approval in Taloda block.' },
                      { icon: 'info', color: 'blue', msg: 'New DI analysis available for Akrani cluster.' },
                    ].map((n, i) => (
                      <div key={i} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50">
                        <span className={`material-symbols-outlined text-${n.color}-500 text-[18px] flex-shrink-0 mt-0.5`}>{n.icon}</span>
                        <p className="text-sm text-slate-700 leading-snug">{n.msg}</p>
                      </div>
                    ))}
                    <div className="px-4 py-2 text-center">
                      <button className="text-xs text-blue-600 font-bold hover:underline">View all alerts</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile */}
            <div className="relative">
              <button
                onClick={() => { setShowProfile(!showProfile); setShowNotifications(false) }}
                className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center hover:bg-blue-700 transition-colors"
              >
                {(user?.email?.[0] || 'O').toUpperCase()}
              </button>
              <AnimatePresence>
                {showProfile && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    className="absolute right-0 top-12 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-bold text-slate-900 truncate">{user?.email || 'District Officer'}</p>
                      <p className="text-xs text-slate-500">Nandurbar District</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-3 text-sm text-rose-600 hover:bg-slate-50 font-bold flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[16px]">logout</span>
                      Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {page === 'dashboard' && <Dashboard />}
          {page === 'deploy'    && <Deploy />}
          {page === 'briefing'  && <Briefing />}
          {page === 'map'       && <DeploymentMap />}
          {page === 'analytics' && <DistrictAnalytics />}
          {page === 'beo'       && <BEODashboard />}
        </main>
      </div>
    </div>
  )
}
