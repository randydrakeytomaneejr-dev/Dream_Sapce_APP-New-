import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase, ORDERS_FUNCTION_URL, ORDERS_FUNCTION_HEADERS } from '../lib/supabase'

const STATUSES = ['awaiting payment', 'payment confirmed', 'in production', 'delivered']

export default function AdminDashboard() {
  const { session, loading: authLoading, signOut } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [receiptModal, setReceiptModal] = useState(null)
  const [sendingReceipt, setSendingReceipt] = useState(null)

  useEffect(() => {
    if (!authLoading && !session) navigate('/admin/login')
  }, [authLoading, session, navigate])

  const showToast = useCallback((msg, type = '') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const loadOrders = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      showToast('Failed to load orders', 'error')
    } else {
      setOrders(data || [])
    }
    setLoading(false)
  }, [showToast])

  useEffect(() => {
    if (session) loadOrders()
  }, [session, loadOrders])

  async function updateStatus(id, status) {
    const { error } = await supabase.from('orders').update({
      status,
      updated_at: new Date().toISOString(),
    }).eq('id', id)

    if (error) {
      showToast('Failed to update status', 'error')
      return
    }

    setOrders(orders.map(o => o.id === id ? { ...o, status } : o))

    if (status === 'payment confirmed') {
      await sendReceipt(id)
    } else {
      showToast('Status updated', 'success')
    }
  }

  async function sendReceipt(orderId) {
    setSendingReceipt(orderId)
    try {
      const res = await fetch(`${ORDERS_FUNCTION_URL}/send-receipt`, {
        method: 'POST',
        headers: ORDERS_FUNCTION_HEADERS,
        body: JSON.stringify({ orderId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send receipt')

      setOrders(orders.map(o => o.id === orderId ? { ...o, receipt_sent: true, status: 'payment confirmed' } : o))
      showToast('Receipt sent to customer email', 'success')
    } catch (e) {
      showToast(e.message, 'error')
    }
    setSendingReceipt(null)
  }

  function viewReceipt(order) {
    setReceiptModal(order)
  }

  if (authLoading || !session) {
    return <div className="loading"><div className="spinner"></div>Loading…</div>
  }

  return (
    <div className="admin-layout">
      <div className="admin-header">
        <Link to="/" className="brand">
          <div className="brand-mark"></div>
          <div>
            <div className="brand-name">DREAM SPACE</div>
            <div className="brand-sub">ADMIN DASHBOARD</div>
          </div>
        </Link>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ color: 'var(--sub)', fontSize: '0.82rem' }}>{session.user.email}</span>
          <button className="ghost-btn" onClick={async () => { await signOut(); navigate('/admin/login') }}>
            Sign out
          </button>
        </div>
      </div>

      <div className="admin-body">
        <div className="admin-toolbar">
          <h1>Orders ({orders.length})</h1>
          <button className="refresh-btn" onClick={loadOrders}>Refresh</button>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner"></div>Loading orders…</div>
        ) : orders.length === 0 ? (
          <div className="empty-state">No orders yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Code</th><th>Date</th><th>Customer</th><th>Items</th>
                  <th>Total</th><th>Note</th><th>Status</th><th>Receipt</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{o.code}</td>
                    <td>{new Date(o.created_at).toLocaleString()}</td>
                    <td>
                      {o.customer_name || '—'}<br />
                      <span style={{ color: 'var(--sub)' }}>{o.customer_phone}</span><br />
                      <span style={{ color: 'var(--sub)', fontSize: '0.78rem' }}>{o.customer_email}</span>
                    </td>
                    <td>{o.items.map((it, i) => (
                      <div key={i}>{it.qty}x {it.name}</div>
                    ))}</td>
                    <td>${o.total}</td>
                    <td>{o.customer_note || '—'}</td>
                    <td>
                      <select
                        className="status-select"
                        value={o.status}
                        onChange={e => updateStatus(o.id, e.target.value)}
                      >
                        {STATUSES.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        className="receipt-btn"
                        disabled={sendingReceipt === o.id || o.status === 'awaiting payment'}
                        onClick={() => sendReceipt(o.id)}
                      >
                        {sendingReceipt === o.id ? 'Sending…' : 'Send receipt'}
                      </button>
                      <button
                        className="receipt-btn"
                        style={{ marginTop: '0.3rem', borderColor: 'var(--line)', color: 'var(--sub)' }}
                        onClick={() => viewReceipt(o)}
                      >
                        View
                      </button>
                      {o.receipt_sent && <div className="receipt-sent-tag">Sent ✓</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Receipt preview modal */}
      {receiptModal && (
        <div className="receipt-modal-bg" onClick={() => setReceiptModal(null)}>
          <div className="receipt-modal" onClick={e => e.stopPropagation()}>
            <h2 className="serif">Receipt — {receiptModal.code}</h2>
            <div className="receipt-section">
              <div className="receipt-row"><span className="label">Date</span><span>{new Date(receiptModal.created_at).toLocaleString()}</span></div>
              <div className="receipt-row"><span className="label">Customer</span><span>{receiptModal.customer_name || '—'}</span></div>
              <div className="receipt-row"><span className="label">Phone</span><span>{receiptModal.customer_phone}</span></div>
              <div className="receipt-row"><span className="label">Email</span><span>{receiptModal.customer_email || '—'}</span></div>
              <div className="receipt-row"><span className="label">Status</span><span style={{ color: 'var(--accent)' }}>{receiptModal.status}</span></div>
            </div>
            <div className="receipt-section">
              {receiptModal.items.map((it, i) => (
                <div key={i} className="receipt-row">
                  <span>{it.qty}x {it.name}</span>
                  <span>${it.price * it.qty}</span>
                </div>
              ))}
              <div className="receipt-row" style={{ fontWeight: 700, paddingTop: '0.5rem', borderTop: '1px solid var(--line)', marginTop: '0.3rem' }}>
                <span>Total</span><span style={{ color: 'var(--gold)' }}>${receiptModal.total}</span>
              </div>
            </div>
            <button className="receipt-close" onClick={() => setReceiptModal(null)}>Close</button>
          </div>
        </div>
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  )
}
