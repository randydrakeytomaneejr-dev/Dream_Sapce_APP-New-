import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('signin')
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'signup') {
        const { error: sErr } = await supabase.auth.signUp({ email: email.trim(), password })
        if (sErr) throw sErr
        setError('')
        setMode('signin')
        setEmail('')
        setPassword('')
        alert('Account created! You can now sign in.')
      } else {
        const { error: sErr } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (sErr) throw sErr
        navigate('/admin')
      }
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  return (
    <div className="auth-page">
      <div className="auth-box">
        <Link to="/" className="brand" style={{ justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div className="brand-mark"></div>
          <div>
            <div className="brand-name">DREAM SPACE</div>
            <div className="brand-sub">ADMIN PANEL</div>
          </div>
        </Link>
        <h1 className="serif">{mode === 'signin' ? 'Admin sign in' : 'Create admin account'}</h1>
        <p className="sub">{mode === 'signin' ? 'Access your order dashboard.' : 'Set up your admin access.'}</p>
        <form onSubmit={handleSubmit}>
          <input
            className="auth-input"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            className="auth-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? 'Please wait…' : (mode === 'signin' ? 'Sign in' : 'Create account')}
          </button>
        </form>
        {error && <p className="auth-error">{error}</p>}
        <p className="auth-link">
          {mode === 'signin' ? (
            <>No account? <a onClick={() => setMode('signup')}>Create one</a></>
          ) : (
            <>Already have an account? <a onClick={() => setMode('signin')}>Sign in</a></>
          )}
        </p>
        <p className="auth-link" style={{ marginTop: '0.5rem' }}>
          <Link to="/">← Back to store</Link>
        </p>
      </div>
    </div>
  )
}
