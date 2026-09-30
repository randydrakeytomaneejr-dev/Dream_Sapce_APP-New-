import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase, PAYMENT_INFO, ORDERS_FUNCTION_URL, ORDERS_FUNCTION_HEADERS } from '../lib/supabase'
import { CATEGORY_IMAGES, CATEGORY_DESCRIPTIONS } from '../lib/categories'

export default function Storefront() {
  const [products, setProducts] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('All')
  const [cart, setCart] = useState({})
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [orderResult, setOrderResult] = useState(null)
  const [error, setError] = useState('')
  const [selectedRating, setSelectedRating] = useState(0)
  const [revName, setRevName] = useState('')
  const [revComment, setRevComment] = useState('')
  const [toast, setToast] = useState(null)
  const [custName, setCustName] = useState('')
  const [custPhone, setCustPhone] = useState('')
  const [custEmail, setCustEmail] = useState('')
  const [custNote, setCustNote] = useState('')

  useEffect(() => {
    async function load() {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from('products').select('*').order('sort_order'),
        supabase.from('reviews').select('*').order('created_at', { ascending: false }),
      ])
      setProducts(p || [])
      setReviews(r || [])
      setLoading(false)
    }
    load()
  }, [])

  const categories = ['All', ...new Set(products.map(p => p.category))]
  const filtered = activeCategory === 'All' ? products : products.filter(p => p.category === activeCategory)
  const cartIds = Object.keys(cart)
  const cartCount = cartIds.reduce((s, id) => s + cart[id], 0)
  const cartTotal = cartIds.reduce((s, id) => {
    const p = products.find(x => x.id === id)
    return s + (p ? p.price * cart[id] : 0)
  }, 0)

  const showToast = useCallback((msg, type = '') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  function addItem(id) {
    setCart(c => ({ ...c, [id]: (c[id] || 0) + 1 }))
    setDrawerOpen(true)
  }
  function changeQty(id, delta) {
    setCart(c => {
      const n = (c[id] || 0) + delta
      const copy = { ...c }
      if (n <= 0) delete copy[id]
      else copy[id] = n
      return copy
    })
  }

  async function placeOrder() {
    setError('')
    if (!custPhone.trim()) {
      setError('Please enter a phone number so we can reach you.')
      return
    }
    const items = cartIds.map(id => ({ id, qty: cart[id] }))
    try {
      const res = await fetch(`${ORDERS_FUNCTION_URL}/create-order`, {
        method: 'POST',
        headers: ORDERS_FUNCTION_HEADERS,
        body: JSON.stringify({
          items,
          customerName: custName.trim(),
          customerPhone: custPhone.trim(),
          customerEmail: custEmail.trim(),
          customerNote: custNote.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setOrderResult(data.order)
      setConfirming(true)
    } catch (e) {
      setError(e.message)
    }
  }

  function resetOrder() {
    setCart({})
    setCustName('')
    setCustPhone('')
    setCustEmail('')
    setCustNote('')
    setConfirming(false)
    setOrderResult(null)
    setDrawerOpen(false)
  }

  async function submitReview() {
    if (!revName.trim() || !selectedRating) {
      showToast('Please enter your name and pick a star rating.', 'error')
      return
    }
    const { data, error: rErr } = await supabase.from('reviews').insert({
      name: revName.trim().slice(0, 60),
      rating: selectedRating,
      comment: revComment.trim().slice(0, 500),
    }).select().single()

    if (rErr) { showToast('Could not submit review.', 'error'); return }
    setReviews([data, ...reviews])
    setRevName('')
    setRevComment('')
    setSelectedRating(0)
    showToast('Thank you for your rating!', 'success')
  }

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length)
    : 0

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
        <div className="header-actions">
          <button className="ghost-btn" onClick={() => { setActiveCategory('All'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
            <Link to="/track" style={{ color: 'inherit' }}>Track order</Link>
          </button>
          <button className="ghost-btn" onClick={() => setDrawerOpen(true)}>
            Cart <span className="cart-count">{cartCount}</span>
          </button>
        </div>
      </header>

      <div className="hero">
        <h1 className="serif">Every corner, a dream come true.</h1>
        <p>Wall panels, gypsum ceilings, UV sheets &amp; PU stone finishes — order by the panel, priced and ready to install.</p>
      </div>

      {/* Category cards */}
      {activeCategory === 'All' && (
        <div className="category-section">
          <div className="category-grid">
            {['Wall Panels', 'PU Stone', 'UV Sheet', 'Gypsum Board'].map(cat => (
              <div key={cat} className="category-card" onClick={() => {
                setActiveCategory(cat)
                document.querySelector('.tabs')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}>
                <img src={CATEGORY_IMAGES[cat]} alt={cat} />
                <div className="cat-arrow">→</div>
                <div className="cat-label">
                  <h3>{cat}</h3>
                  <span>{CATEGORY_DESCRIPTIONS[cat]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        {categories.map(c => (
          <button key={c} className={`tab ${c === activeCategory ? 'active' : ''}`} onClick={() => setActiveCategory(c)}>
            {c}
          </button>
        ))}
      </div>

      {/* Product grid */}
      {loading ? (
        <div className="loading"><div className="spinner"></div>Loading products…</div>
      ) : (
        <div className="product-grid">
          {filtered.map(p => (
            <div key={p.id} className="product-card">
              <img src={p.image} alt={p.name} />
              <div className="card-body">
                <div className="card-cat">{p.category}</div>
                <h3>{p.name}</h3>
                <p>{p.unit}</p>
                <div className="card-foot">
                  <div className="price">${p.price} <span>{p.unit}</span></div>
                  <button className="add-btn" onClick={() => addItem(p.id)}>Add</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reviews */}
      <div className="reviews-section">
        <h2 className="serif">Customer ratings</h2>
        {reviews.length === 0 ? (
          <div className="avg-rating">— <span>no ratings yet</span></div>
        ) : (
          <div className="avg-rating">
            {'★'.repeat(Math.round(avgRating))}{'☆'.repeat(5 - Math.round(avgRating))}
            <span> {avgRating.toFixed(1)} out of 5 · {reviews.length} rating{reviews.length === 1 ? '' : 's'}</span>
          </div>
        )}

        <div className="review-form">
          <label className="form-label">Your name</label>
          <input className="form-field" type="text" placeholder="Your name" value={revName} onChange={e => setRevName(e.target.value)} />
          <label className="form-label">Rating</label>
          <div className="star-input">
            {[1, 2, 3, 4, 5].map(v => (
              <span key={v} className={v <= selectedRating ? 'filled' : ''} onClick={() => setSelectedRating(v)}>★</span>
            ))}
          </div>
          <label className="form-label">Comment (optional)</label>
          <textarea className="form-field" rows={2} placeholder="How was your experience?" value={revComment} onChange={e => setRevComment(e.target.value)} />
          <button className="add-btn" onClick={submitReview}>Submit rating</button>
        </div>

        {reviews.slice(0, 20).map(r => (
          <div key={r.id} className="review-item">
            <span className="rname">{r.name}</span> &nbsp;
            <span className="stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
            {r.comment && <p>{r.comment}</p>}
          </div>
        ))}
      </div>

      <footer className="footer">
        Dream Space — Aluminum, Furniture &amp; Interior Design · #DreamSpaceDesign
      </footer>

      {/* Cart drawer */}
      <div className={`overlay ${drawerOpen ? 'show' : ''}`} onClick={() => setDrawerOpen(false)}></div>
      <div className={`drawer ${drawerOpen ? 'show' : ''}`}>
        <button className="close-btn" onClick={() => setDrawerOpen(false)}>✕</button>
        {!confirming ? (
          <div>
            <h2 className="serif">Your order</h2>
            {cartIds.length === 0 ? (
              <div className="empty-note">No items added yet.</div>
            ) : (
              cartIds.map(id => {
                const p = products.find(x => x.id === id)
                if (!p) return null
                return (
                  <div key={id} className="cart-line">
                    <span className="cart-line-name">{p.name}</span>
                    <div className="qty-ctrl">
                      <button onClick={() => changeQty(id, -1)}>−</button>
                      <span>{cart[id]}</span>
                      <button onClick={() => changeQty(id, 1)}>+</button>
                    </div>
                  </div>
                )
              })
            )}
            {cartIds.length > 0 && (
              <div className="drawer-total"><span>Total</span><span>${cartTotal.toFixed(0)}</span></div>
            )}

            <div style={{ marginTop: '1.2rem' }}>
              <label className="form-label">Your name</label>
              <input className="form-field" type="text" placeholder="Full name" value={custName} onChange={e => setCustName(e.target.value)} />
              <label className="form-label">Phone or WhatsApp number</label>
              <input className="form-field" type="text" placeholder="+91..." value={custPhone} onChange={e => setCustPhone(e.target.value)} />
              <label className="form-label">Email (for receipt)</label>
              <input className="form-field" type="email" placeholder="you@email.com" value={custEmail} onChange={e => setCustEmail(e.target.value)} />
              <label className="form-label">Delivery notes (optional)</label>
              <textarea className="form-field" rows={2} placeholder="Address, wall size, timing..." value={custNote} onChange={e => setCustNote(e.target.value)} />
            </div>

            <button className="checkout-btn" disabled={cartIds.length === 0} onClick={placeOrder}>Place order</button>
            {error && <p className="error-note">{error}</p>}
          </div>
        ) : (
          <div className="confirm">
            <h3 className="serif">Order placed — complete payment to confirm</h3>
            <div className="order-code">{orderResult?.code}</div>
            <p>Save this code — use it on the <strong>Track order</strong> page anytime to check your order status.</p>
            <div className="pay-box">
              Send <b>${orderResult?.total}</b> via <b>{PAYMENT_INFO.method}</b> to:<br />
              Number: <b>{PAYMENT_INFO.number}</b><br />
              Name: <b>{PAYMENT_INFO.name}</b><br /><br />
              Once sent, we'll confirm your payment and email your receipt — check anytime with your code above.
            </div>
            <button className="add-btn" style={{ marginTop: '1.2rem', width: '100%' }} onClick={resetOrder}>Start new order</button>
          </div>
        )}
      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}
