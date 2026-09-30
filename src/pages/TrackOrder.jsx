import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function TrackOrder() {
  const [code, setCode] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function track(e) {
    e?.preventDefault()
    setError('')
    setResult(null)
    if (!code.trim()) {
      setError('Please enter your order code.')
      return
    }
    setLoading(true)
    try {
      const { data, error: qErr } = await supabase
        .from('orders')
        .select('code, created_at, items, total, status')
        .ilike('code', code.trim())
        .maybeSingle()

      if (qErr) throw qErr
      if (!data) {
        setError('No order found with that code.')
        setLoading(false)
        return
      }
      setResult(data)
    } catch (e) {
      setError(e.message || 'Something went wrong')
    }
    setLoading(false)
  }

  const statusClass = result?.status?.replace(/\s+/g, '')

  return (
    <div>
      <header className="header">
        <Link to="/" className="brand">
          <div className="brand-mark"></div>
          <div>
            <div className="brand-name">DREAM SPACE</div>
            <div className="brand-sub">ALUMINUM · FURNITURE &amp; INTERIOR DESIGN</div>
          </div>
        </Link>
      </header>

      <div className="track-page">
        <Link to="/" className="back-link">← Back to store</Link>
        <h1 className="serif">Track your order</h1>
        <p className="track-sub">Enter the code you received when you placed your order.</p>
        <form onSubmit={track}>
          <input
            className="track-input"
            type="text"
            placeholder="DS-XXXXXX"
            maxLength={9}
            value={code}
            onChange={e => setCode(e.target.value)}
          />
          <button className="track-btn" type="submit" disabled={loading}>
            {loading ? 'Checking…' : 'Check status'}
          </button>
        </form>
        {error && <p className="error-note">{error}</p>}

        {result && (
          <div className="track-result">
            <span className={`status-badge ${statusClass}`}>{result.status}</span>
            {result.items.map((it, i) => (
              <div key={i} className="item-line">
                <span>{it.qty}x {it.name}</span>
                <span>${it.price * it.qty}</span>
              </div>
            ))}
            <div className="total-line"><span>Total</span><span>${result.total}</span></div>
          </div>
        )}
      </div>
    </div>
  )
}
