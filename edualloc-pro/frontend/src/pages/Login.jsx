import { useState } from 'react'
import { motion } from 'framer-motion'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../lib/firebase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err) {
      setError(err.message || 'Failed to login')
    } finally {
      setLoading(false)
    }
  }

  const bypassLogin = () => {
    if (window._triggerAuthBypass) window._triggerAuthBypass()
    else {
      sessionStorage.setItem('auth_bypass', 'true')
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen flex bg-[#060C1A] overflow-hidden relative">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(#60a5fa 1px, transparent 1px), linear-gradient(90deg, #60a5fa 1px, transparent 1px)',
          backgroundSize: '48px 48px'
        }}
      />
      {/* Radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(37,99,235,0.15)_0%,_transparent_70%)]" />

      {/* Left: Branding panel */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7 }}
        className="hidden lg:flex w-[55%] flex-col justify-between p-14 relative z-10"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900">
            <span className="material-symbols-outlined text-white text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
          </div>
          <span className="text-white font-black tracking-tight text-lg">EduGov Pro</span>
        </div>

        <div>
          <div className="inline-flex items-center gap-2 bg-blue-900/30 border border-blue-800/50 rounded-full px-4 py-2 mb-6">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold text-blue-300 uppercase tracking-widest">System Online · Nandurbar District</span>
          </div>
          <h2 className="text-5xl font-black tracking-tight text-white leading-tight mb-4">
            School Intelligence<br />
            <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Mission Control
            </span>
          </h2>
          <p className="text-slate-400 text-base leading-relaxed max-w-sm">
            AI-powered teacher deployment platform for equitable education access across Maharashtra's tribal districts.
          </p>

          <div className="mt-10 grid grid-cols-3 gap-6">
            {[
              { label: 'Schools Monitored', value: '1,247', icon: 'school' },
              { label: 'AI Deployments', value: '3,891', icon: 'group' },
              { label: 'Districts Active', value: '6', icon: 'map' },
            ].map(({ label, value, icon }) => (
              <div key={label}>
                <span className="material-symbols-outlined text-blue-500 text-[22px]">{icon}</span>
                <div className="text-2xl font-black text-white mt-1">{value}</div>
                <div className="text-xs text-slate-500 font-semibold">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-slate-700 font-medium">
          Powered by Google BigQuery · Vertex AI · Gemini 1.5 Pro
        </p>
      </motion.div>

      {/* Right: Auth panel */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-[400px]"
        >
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            {/* Top glow bar */}
            <div className="h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600" />

            <div className="p-8">
              {/* Mobile logo */}
              <div className="lg:hidden flex items-center gap-3 mb-8">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
                </div>
                <span className="text-white font-black tracking-tight text-lg">EduGov Pro</span>
              </div>

              <div className="mb-8">
                <h1 className="text-xl font-bold text-white">Officer Access</h1>
                <p className="text-slate-400 text-sm mt-1">Sign in to Mission Control</p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mb-5 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs font-medium"
                >
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Official Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                    placeholder="officer@edugov.in"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Passcode
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold py-3 px-4 rounded-xl transition-all mt-2 flex items-center justify-center gap-2 shadow-lg shadow-blue-900/50 disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Authenticating…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">login</span>
                      Access Terminal
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-slate-800 text-center">
                <button
                  onClick={bypassLogin}
                  className="text-xs text-slate-600 hover:text-slate-400 underline decoration-dotted underline-offset-2 transition-colors"
                >
                  Bypass Auth (Dev Mode)
                </button>
              </div>
            </div>
          </div>

          <p className="text-center text-[11px] text-slate-700 font-medium mt-6">
            Google Solution Challenge 2026 · EduAllocPro
          </p>
        </motion.div>
      </div>
    </div>
  )
}
