import { useState, useEffect, useRef, createContext, useContext } from 'react'
import { Link, NavLink, Routes, Route, useNavigate, useParams, useLocation } from 'react-router-dom'
import { BRAND, products, orders, codes, settings, collections, commit, resetStore, money, shipping } from './data'
import { Tin } from './components'
import { UI as Ic } from './art'

/* ---------- a11y prefs, toasts, confirm ---------- */
const UI = createContext()
const useUI = () => useContext(UI)
const session = { get: (k) => { try { return sessionStorage.getItem(k) } catch { return null } }, set: (k, v) => { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v) } catch { /* storage unavailable */ } } }
const loadPrefs = () => { try { return JSON.parse(localStorage.getItem('admin-prefs')) || {} } catch { return {} } }

function useSort(list, key0, dir0 = 'asc') {
  const [key, setKey] = useState(key0)
  const [dir, setDir] = useState(dir0)
  const sorted = [...list].sort((a, b) => {
    const x = a[key] ?? '', y = b[key] ?? ''
    const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))
    return dir === 'asc' ? c : -c
  })
  const th = (k, label, cls) => (
    <th scope="col" className={cls} aria-sort={key === k ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button onClick={() => { setDir(key === k && dir === 'asc' ? 'desc' : 'asc'); setKey(k) }}>{label}<span aria-hidden>{key === k ? (dir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}</span></button>
    </th>
  )
  return [sorted, th]
}

function Confirm({ state, close }) {
  const ref = useRef()
  useEffect(() => { if (state) ref.current?.showModal(); else ref.current?.close() }, [state])
  return (
    <dialog ref={ref} className="a-dialog" onClose={() => close(false)} aria-labelledby="dlg-h">
      <h2 id="dlg-h">{state?.title}</h2>
      <p>{state?.body}</p>
      <div className="a-row end">
        <button className="a-btn" onClick={() => close(false)} autoFocus>Cancel</button>
        <button className="a-btn danger" onClick={() => close(true)}>{state?.ok || 'Confirm'}</button>
      </div>
    </dialog>
  )
}

/* ---------- Shell ---------- */
const NAV = [['', 'Dashboard', Ic.dash], ['orders', 'Orders', Ic.receipt], ['products', 'Products', Ic.fish], ['customers', 'Customers', Ic.users], ['discounts', 'Discounts', Ic.tag], ['settings', 'Settings', Ic.gear]]

export function Admin() {
  const [authed, setAuthed] = useState(() => session.get('admin') === '1')
  const [prefs, setPrefs] = useState(loadPrefs)
  const [toast, setToast] = useState('')
  const [dlg, setDlg] = useState(null)
  const [menu, setMenu] = useState(false)
  const loc = useLocation()
  useEffect(() => { try { localStorage.setItem('admin-prefs', JSON.stringify(prefs)) } catch { /* storage unavailable */ } }, [prefs])
  useEffect(() => { setMenu(false); document.querySelector('.a-main h1')?.focus() }, [loc.pathname])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 4000); return () => clearTimeout(t) }, [toast])
  const confirm = (opts) => new Promise((res) => setDlg({ ...opts, res }))
  const closeDlg = (v) => { dlg?.res(v); setDlg(null) }
  const notify = (m) => { setToast(''); setTimeout(() => setToast(m), 30) }
  const attrs = { 'data-contrast': prefs.contrast ? 'high' : undefined, 'data-text': prefs.text || undefined, 'data-motion': prefs.motion ? 'reduce' : undefined, 'data-theme': prefs.dark ? 'dark' : undefined }

  if (!authed) return <div className="admin" {...attrs}><Login onOk={() => { session.set('admin', '1'); setAuthed(true) }} /></div>
  const toggle = (k) => setPrefs({ ...prefs, [k]: !prefs[k] })

  return (
    <UI.Provider value={{ notify, confirm }}>
      <div className="admin" {...attrs}>
        <a href="#a-main" className="skip">Skip to main content</a>
        <header className="a-top">
          <button className="a-burger" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-controls="a-nav" aria-label="Toggle navigation"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden><path d="M4 7h16M4 12h16M4 17h16" /></svg></button>
          <Link to="/admin" className="a-logo">{BRAND} <small>Admin</small></Link>
          <div className="a-prefs" role="group" aria-label="Accessibility settings">
            <button aria-pressed={!!prefs.contrast} onClick={() => toggle('contrast')} title="High contrast"><Ic.contrast /> <span className="a-hide-sm">Contrast</span></button>
            <button aria-pressed={prefs.text === 'lg'} onClick={() => setPrefs({ ...prefs, text: prefs.text === 'lg' ? '' : 'lg' })} title="Larger text"><Ic.text /> <span className="a-hide-sm">Text</span></button>
            <button aria-pressed={!!prefs.motion} onClick={() => toggle('motion')} title="Reduce motion"><Ic.motion /> <span className="a-hide-sm">Motion</span></button>
            <button aria-pressed={!!prefs.dark} onClick={() => toggle('dark')} title="Dark mode"><Ic.moon /> <span className="a-hide-sm">Dark</span></button>
          </div>
          <Link to="/" className="a-btn ghost">View store ↗</Link>
          <button className="a-btn ghost" onClick={() => { session.set('admin', null); setAuthed(false) }}>Log out</button>
        </header>
        <div className="a-body">
          <nav id="a-nav" className={`a-nav ${menu ? 'on' : ''}`} aria-label="Admin">
            {NAV.map(([to, l, NavIcon]) => <NavLink key={to} to={`/admin/${to}`} end={!to}><NavIcon /> {l}{to === 'orders' && <em className="a-pill">{orders.filter((o) => o.fulfillment === 'Unfulfilled' && o.status === 'Paid').length || ''}</em>}</NavLink>)}
          </nav>
          <main id="a-main" className="a-main" tabIndex={-1}>
            <Routes>
              <Route index element={<Dashboard />} />
              <Route path="orders" element={<Orders />} />
              <Route path="orders/:id" element={<OrderDetail />} />
              <Route path="products" element={<Products />} />
              <Route path="products/:slug" element={<ProductForm />} />
              <Route path="customers" element={<Customers />} />
              <Route path="discounts" element={<Discounts />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<h1 tabIndex={-1}>Not found</h1>} />
            </Routes>
          </main>
        </div>
        <div className="a-toast" role="status" aria-live="polite">{toast && <span>{toast}</span>}</div>
        <Confirm state={dlg} close={closeDlg} />
      </div>
    </UI.Provider>
  )
}

function Login({ onOk }) {
  const [v, setV] = useState('')
  const [err, setErr] = useState('')
  return (
    <main className="a-login">
      <form onSubmit={(e) => { e.preventDefault(); v === settings.adminPass ? onOk() : setErr('Incorrect passcode. Try again.') }}>
        <h1>{BRAND} Admin</h1>
        <p className="a-muted">Demo gate only. Real authentication must run on your server.</p>
        <label htmlFor="pass">Passcode</label>
        <input id="pass" type="password" value={v} onChange={(e) => setV(e.target.value)} aria-invalid={!!err} aria-describedby={err ? 'pass-err' : 'pass-hint'} autoFocus autoComplete="current-password" />
        <small id="pass-hint" className="a-muted">Default passcode: admin (change it in Settings)</small>
        {err && <p id="pass-err" className="a-err" role="alert">{err}</p>}
        <button className="a-btn primary">Log in</button>
        <Link to="/">← Back to store</Link>
      </form>
    </main>
  )
}

const H = ({ children, actions }) => <div className="a-head"><h1 tabIndex={-1}>{children}</h1>{actions && <div className="a-row">{actions}</div>}</div>
const Badge = ({ v }) => <span className={`a-badge s-${String(v).toLowerCase().replace(/\s/g, '-')}`}>{v}</span>
const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

/* ---------- Dashboard ---------- */
function Dashboard() {
  const paid = orders.filter((o) => !['Refunded', 'Cancelled'].includes(o.status))
  const revenue = paid.reduce((s, o) => s + o.total, 0)
  const units = paid.reduce((s, o) => s + o.lines.reduce((a, l) => a + l.q, 0), 0)
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 13 + i)
    const k = d.toISOString().slice(0, 10)
    return { k, label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), v: paid.filter((o) => o.date.slice(0, 10) === k).reduce((s, o) => s + o.total, 0) }
  })
  const max = Math.max(1, ...days.map((d) => d.v))
  const top = Object.values(paid.flatMap((o) => o.lines).reduce((m, l) => { m[l.slug] = m[l.slug] || { name: l.name, q: 0, rev: 0 }; m[l.slug].q += l.q; m[l.slug].rev += l.unit * l.q; return m }, {})).sort((a, b) => b.rev - a.rev).slice(0, 5)
  const low = products.filter((p) => p.stock != null && p.stock < settings.lowStock).sort((a, b) => a.stock - b.stock)
  return (
    <>
      <H>Dashboard</H>
      <section className="a-kpis" aria-label="Key metrics">
        {[['Revenue', money(revenue)], ['Orders', paid.length], ['Avg. order value', money(paid.length ? revenue / paid.length : 0)], ['Units sold', units]].map(([l, v]) => <div key={l} className="a-card kpi"><span>{l}</span><b>{v}</b></div>)}
      </section>
      <div className="a-grid2">
        <section className="a-card">
          <h2 id="chart-h">Revenue, last 14 days</h2>
          <div className="a-chart" role="img" aria-labelledby="chart-h" aria-describedby="chart-t">
            {days.map((d) => <div key={d.k} className="a-barcol" title={`${d.label}: ${money(d.v)}`}><span style={{ height: `${(d.v / max) * 100}%` }} /><small>{d.label.split(' ')[1]}</small></div>)}
          </div>
          <details><summary>View as table</summary>
            <table id="chart-t" className="a-table"><caption className="sr-only">Daily revenue</caption><thead><tr><th scope="col">Day</th><th scope="col">Revenue</th></tr></thead><tbody>{days.map((d) => <tr key={d.k}><td>{d.label}</td><td>{money(d.v)}</td></tr>)}</tbody></table>
          </details>
        </section>
        <section className="a-card">
          <h2>Top products</h2>
          {top.length ? <ol className="a-list">{top.map((t) => <li key={t.name}><span>{t.name}</span><b>{money(t.rev)}</b><small>{t.q} sold</small></li>)}</ol> : <p className="a-muted">No sales yet. Place a test order on the storefront.</p>}
        </section>
        <section className="a-card">
          <h2>Low stock <Badge v={low.length} /></h2>
          {low.length ? <ul className="a-list">{low.map((p) => <li key={p.slug}><Link to={`/admin/products/${p.slug}`}>{p.name}</Link><b className={p.stock === 0 ? 'a-err' : ''}>{p.stock === 0 ? 'Out of stock' : `${p.stock} left`}</b></li>)}</ul> : <p className="a-muted">All stocked up.</p>}
        </section>
        <section className="a-card">
          <h2>Recent orders</h2>
          {orders.length ? <ul className="a-list">{[...orders].reverse().slice(0, 5).map((o) => <li key={o.id}><Link to={`/admin/orders/${o.id}`}>#{o.id}</Link><span>{o.customer.first} {o.customer.last}</span><b>{money(o.total)}</b></li>)}</ul> : <p className="a-muted">No orders yet.</p>}
        </section>
      </div>
    </>
  )
}

/* ---------- Orders ---------- */
const FULFILL = ['Unfulfilled', 'Fulfilled', 'Shipped', 'Delivered']

function exportCSV(rows, name) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = [Object.keys(rows[0]).map(esc).join(','), ...rows.map((r) => Object.values(r).map(esc).join(','))].join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

function Orders() {
  const [q, setQ] = useState(new URLSearchParams(useLocation().search).get('q') || '')
  const [f, setF] = useState('All')
  const rows = orders.map((o) => ({ ...o, name: `${o.customer.first} ${o.customer.last}`, email: o.customer.email, items: o.lines.reduce((a, l) => a + l.q, 0) }))
    .filter((o) => (f === 'All' || o.fulfillment === f || o.status === f) && `${o.id} ${o.name} ${o.email}`.toLowerCase().includes(q.toLowerCase()))
  const [sorted, th] = useSort(rows, 'date', 'desc')
  return (
    <>
      <H actions={<button className="a-btn" disabled={!orders.length} onClick={() => exportCSV(orders.map((o) => ({ id: o.id, date: o.date, email: o.customer.email, name: `${o.customer.first} ${o.customer.last}`, total: o.total, status: o.status, fulfillment: o.fulfillment, code: o.code })), 'orders.csv')}>Export CSV</button>}>Orders</H>
      <div className="a-toolbar">
        <label className="a-search"><span className="sr-only">Search orders</span><input type="search" placeholder="Search by order #, name or email" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <div className="a-tabs" role="group" aria-label="Filter by status">{['All', ...FULFILL, 'Refunded', 'Cancelled'].map((s) => <button key={s} aria-pressed={f === s} onClick={() => setF(s)}>{s}</button>)}</div>
      </div>
      <p className="sr-only" role="status">{sorted.length} orders shown</p>
      <div className="a-card flush">
        <table className="a-table">
          <caption className="sr-only">Orders, sortable by column</caption>
          <thead><tr>{th('id', 'Order')}{th('date', 'Date')}{th('name', 'Customer')}{th('total', 'Total', 'num')}{th('status', 'Payment')}{th('fulfillment', 'Fulfillment')}{th('items', 'Items', 'num')}</tr></thead>
          <tbody>
            {sorted.map((o) => (
              <tr key={o.id}>
                <th scope="row"><Link to={`/admin/orders/${o.id}`}>#{o.id}</Link></th>
                <td>{fmtDate(o.date)}</td><td>{o.name}<br /><small className="a-muted">{o.email}</small></td><td className="num">{money(o.total)}</td>
                <td><Badge v={o.status} /></td><td><Badge v={o.fulfillment} /></td><td className="num">{o.items}</td>
              </tr>
            ))}
            {!sorted.length && <tr><td colSpan={7} className="a-empty">No orders match. Place a test order on the storefront to see it here.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}

function OrderDetail() {
  const { id } = useParams()
  const { notify, confirm } = useUI()
  const [note, setNote] = useState('')
  const o = orders.find((x) => x.id === id)
  if (!o) return <H>Order not found</H>
  const update = (patch, msg) => { Object.assign(o, patch); commit(); notify(msg) }
  const refund = async (status) => {
    if (!(await confirm({ title: `${status === 'Refunded' ? 'Refund' : 'Cancel'} order #${o.id}?`, body: `This marks the order ${status.toLowerCase()} and returns items to stock.`, ok: status === 'Refunded' ? 'Refund' : 'Cancel order' }))) return
    o.lines.forEach((l) => { const p = products.find((x) => x.slug === l.slug); if (p?.stock != null) p.stock += l.q * l.pack })
    update({ status, notes: [...o.notes, { at: new Date().toISOString(), text: `Order ${status.toLowerCase()}, items restocked` }] }, `Order #${o.id} ${status.toLowerCase()}`)
  }
  const closed = ['Refunded', 'Cancelled'].includes(o.status)
  return (
    <>
      <H actions={<><button className="a-btn" onClick={() => window.print()}>Print packing slip</button>{!closed && <><button className="a-btn" onClick={() => refund('Cancelled')}>Cancel</button><button className="a-btn danger" onClick={() => refund('Refunded')}>Refund</button></>}</>}>
        <Link to="/admin/orders" className="a-back" aria-label="Back to orders">←</Link> Order #{o.id} <Badge v={o.status} /> <Badge v={o.fulfillment} />
      </H>
      <p className="a-muted">{new Date(o.date).toLocaleString()}</p>
      <div className="a-grid2 wide">
        <div className="a-stack">
          <section className="a-card print">
            <h2>Items</h2>
            <table className="a-table">
              <caption className="sr-only">Order items</caption>
              <thead><tr><th scope="col">Product</th><th scope="col" className="num">Qty</th><th scope="col" className="num">Price</th><th scope="col" className="num">Total</th></tr></thead>
              <tbody>{o.lines.map((l) => <tr key={l.id}><td>{l.name}{l.label && <><br /><small className="a-muted">{l.label}</small></>}</td><td className="num">{l.q}</td><td className="num">{money(l.unit)}</td><td className="num">{money(l.unit * l.q)}</td></tr>)}</tbody>
              <tfoot>
                <tr><td colSpan={3}>Subtotal</td><td className="num">{money(o.subtotal)}</td></tr>
                {o.discount > 0 && <tr><td colSpan={3}>Discount ({o.code})</td><td className="num">−{money(o.discount)}</td></tr>}
                <tr><td colSpan={3}>Shipping ({shipping.find((s) => s.id === o.ship)?.label})</td><td className="num">{money(o.shipCost)}</td></tr>
                <tr><td colSpan={3}>Tax</td><td className="num">{money(o.tax)}</td></tr>
                <tr><th scope="row" colSpan={3}>Total</th><th className="num">{money(o.total)}</th></tr>
              </tfoot>
            </table>
            {o.note && <p><b>Gift note:</b> “{o.note}”</p>}
          </section>
          <section className="a-card">
            <h2>Fulfillment</h2>
            <ol className="a-steps">{FULFILL.map((s, i) => <li key={s} className={FULFILL.indexOf(o.fulfillment) >= i ? 'done' : ''} aria-current={o.fulfillment === s ? 'step' : undefined}>{s}</li>)}</ol>
            {!closed && FULFILL.indexOf(o.fulfillment) < FULFILL.length - 1 && (
              <button className="a-btn primary" onClick={() => { const n = FULFILL[FULFILL.indexOf(o.fulfillment) + 1]; update({ fulfillment: n, notes: [...o.notes, { at: new Date().toISOString(), text: `Marked ${n.toLowerCase()}` }] }, `Order #${o.id} marked ${n.toLowerCase()}`) }}>
                Mark as {FULFILL[FULFILL.indexOf(o.fulfillment) + 1].toLowerCase()}
              </button>
            )}
          </section>
          <section className="a-card">
            <h2>Timeline</h2>
            <form className="a-row" onSubmit={(e) => { e.preventDefault(); if (!note.trim()) return; update({ notes: [...o.notes, { at: new Date().toISOString(), text: note.trim() }] }, 'Note added'); setNote('') }}>
              <label className="grow"><span className="sr-only">Add internal note</span><input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Leave an internal note…" /></label>
              <button className="a-btn">Post</button>
            </form>
            <ol className="a-timeline">
              {[...o.notes].reverse().map((n, i) => <li key={i}><time>{new Date(n.at).toLocaleString()}</time><p>{n.text}</p></li>)}
              <li><time>{new Date(o.date).toLocaleString()}</time><p>Order placed · {o.pay} (demo)</p></li>
            </ol>
          </section>
        </div>
        <aside className="a-stack">
          <section className="a-card print">
            <h2>Customer</h2>
            <p><Link to={`/admin/orders?q=${encodeURIComponent(o.customer.email)}`}>{o.customer.first} {o.customer.last}</Link><br /><a href={`mailto:${o.customer.email}`}>{o.customer.email}</a>{o.customer.phone && <><br />{o.customer.phone}</>}</p>
            <h3>Shipping address</h3>
            <address>{o.customer.address}{o.customer.apt && `, ${o.customer.apt}`}<br />{o.customer.city}, {o.customer.state} {o.customer.zip}</address>
            <p className="a-muted">{o.customer.news ? 'Subscribed to marketing' : 'Not subscribed to marketing'}</p>
          </section>
        </aside>
      </div>
    </>
  )
}

/* ---------- Products ---------- */
function Products() {
  const { notify, confirm } = useUI()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [sel, setSel] = useState([])
  const rows = products.filter((p) => (!cat || p.cat.includes(cat)) && p.name.toLowerCase().includes(q.toLowerCase())).map((p) => ({ ...p, stockN: p.stock ?? Infinity }))
  const [sorted, th] = useSort(rows, 'name')
  const del = async (slugs) => {
    if (!(await confirm({ title: `Delete ${slugs.length} product${slugs.length > 1 ? 's' : ''}?`, body: 'This cannot be undone.', ok: 'Delete' }))) return
    slugs.forEach((s) => products.splice(products.findIndex((p) => p.slug === s), 1))
    setSel([]); commit(); notify(`Deleted ${slugs.length} product${slugs.length > 1 ? 's' : ''}`)
  }
  const setStock = (p, v) => { p.stock = v === '' ? undefined : Math.max(0, +v); commit() }
  const all = sorted.length > 0 && sel.length === sorted.length
  return (
    <>
      <H actions={<button className="a-btn primary" onClick={() => navigate('/admin/products/new')}>+ Add product</button>}>Products</H>
      <div className="a-toolbar">
        <label className="a-search"><span className="sr-only">Search products</span><input type="search" placeholder="Search products" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <label>Collection <select value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All</option>{Object.entries(collections).filter(([k]) => k !== 'all').map(([k, v]) => <option key={k} value={k}>{v.title}</option>)}</select></label>
        {!!sel.length && <div className="a-row" role="group" aria-label="Bulk actions"><span>{sel.length} selected</span><button className="a-btn danger" onClick={() => del(sel)}>Delete selected</button></div>}
      </div>
      <p className="sr-only" role="status">{sorted.length} products shown</p>
      <div className="a-card flush">
        <table className="a-table">
          <caption className="sr-only">Products, sortable by column</caption>
          <thead><tr>
            <th scope="col" className="chk"><input type="checkbox" aria-label="Select all products" checked={all} onChange={() => setSel(all ? [] : sorted.map((p) => p.slug))} /></th>
            <th scope="col"><span className="sr-only">Image</span></th>{th('name', 'Product')}{th('price', 'Price', 'num')}{th('stockN', 'Inventory', 'num')}<th scope="col">Collections</th><th scope="col"><span className="sr-only">Actions</span></th>
          </tr></thead>
          <tbody>
            {sorted.map((p) => (
              <tr key={p.slug}>
                <td className="chk"><input type="checkbox" aria-label={`Select ${p.name}`} checked={sel.includes(p.slug)} onChange={() => setSel(sel.includes(p.slug) ? sel.filter((s) => s !== p.slug) : [...sel, p.slug])} /></td>
                <td className="thumb"><Tin p={p} label={null} /></td>
                <th scope="row"><Link to={`/admin/products/${p.slug}`}>{p.name}</Link>{p.badge && <> <Badge v={p.badge} /></>}</th>
                <td className="num">{money(p.price)}</td>
                <td className="num"><label><span className="sr-only">Stock for {p.name} (blank = not tracked)</span><input className={`a-stock ${p.stock === 0 ? 'zero' : p.stock < settings.lowStock ? 'low' : ''}`} type="number" min="0" value={p.stock ?? ''} placeholder="∞" onChange={(e) => setStock(p, e.target.value)} /></label></td>
                <td>{p.cat.map((c) => collections[c]?.title).filter(Boolean).join(', ')}</td>
                <td className="a-actions">
                  <Link className="a-btn sm" to={`/products/${p.slug}`} target="_blank" rel="noreferrer" aria-label={`View ${p.name} in store (opens new tab)`}>View</Link>
                  <button className="a-btn sm danger" onClick={() => del([p.slug])} aria-label={`Delete ${p.name}`}>Delete</button>
                </td>
              </tr>
            ))}
            {!sorted.length && <tr><td colSpan={7} className="a-empty">No products match.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

function ProductForm() {
  const { slug } = useParams()
  const isNew = slug === 'new'
  const existing = products.find((p) => p.slug === slug)
  const navigate = useNavigate()
  const { notify } = useUI()
  const [f, setF] = useState(() => existing ? { ...existing, stock: existing.stock ?? '', cat: [...existing.cat], tin: [...existing.tin] } : { name: '', slug: '', price: '', stock: '', badge: '', cat: ['tinned-fish'], tin: ['#fdcd62', '#73c3f5'], fish: '', origin: '', desc: '', protein: '', omega: '', mercury: '' })
  const [errors, setErrors] = useState({})
  if (!isNew && !existing) return <H>Product not found</H>
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const submit = (e) => {
    e.preventDefault()
    const s = f.slug || slugify(f.name)
    const er = {}
    if (!f.name.trim()) er.name = 'Name is required'
    if (f.price === '' || +f.price < 0) er.price = 'Enter a price of 0 or more'
    if (!f.cat.length) er.cat = 'Choose at least one collection'
    if (products.some((p) => p.slug === s && p !== existing)) er.slug = 'Another product already uses this URL handle'
    setErrors(er)
    if (Object.keys(er).length) { setTimeout(() => document.querySelector('.a-err-summary')?.focus()); return }
    const data = { ...f, slug: s, price: +f.price, stock: f.stock === '' ? undefined : +f.stock, badge: f.badge || undefined, protein: f.protein === '' ? undefined : +f.protein, omega: f.omega === '' ? undefined : +f.omega, fish: f.fish || null }
    if (existing) Object.assign(existing, data); else products.push(data)
    commit(); notify(`${data.name} saved`)
    navigate('/admin/products')
  }
  const fld = (k, label, props = {}) => (
    <div className={`a-field ${props.half ? 'half' : ''}`}>
      <label htmlFor={`p-${k}`}>{label}{props.req && <span aria-hidden> *</span>}</label>
      {props.area ? <textarea id={`p-${k}`} value={f[k]} onChange={set(k)} rows={4} /> : <input id={`p-${k}`} value={f[k]} onChange={set(k)} type={props.type || 'text'} min={props.min} step={props.step} required={props.req} aria-invalid={!!errors[k]} aria-describedby={[errors[k] && `pe-${k}`, props.hint && `ph-${k}`].filter(Boolean).join(' ') || undefined} />}
      {props.hint && <small id={`ph-${k}`} className="a-muted">{props.hint}</small>}
      {errors[k] && <p id={`pe-${k}`} className="a-err">{errors[k]}</p>}
    </div>
  )
  return (
    <>
      <H><Link to="/admin/products" className="a-back" aria-label="Back to products">←</Link> {isNew ? 'Add product' : f.name}</H>
      <form className="a-grid2 wide" onSubmit={submit} noValidate>
        <div className="a-stack">
          {!!Object.keys(errors).length && <div className="a-err-summary" tabIndex={-1} role="alert"><b>Fix these to save:</b><ul>{Object.entries(errors).map(([k, m]) => <li key={k}><a href={k === 'cat' ? '#p-cat' : `#p-${k}`}>{m}</a></li>)}</ul></div>}
          <section className="a-card a-fields">
            {fld('name', 'Title', { req: true })}
            {fld('desc', 'Description', { area: true })}
          </section>
          <section className="a-card a-fields">
            <h2>Pricing & inventory</h2>
            {fld('price', 'Price (USD)', { type: 'number', min: 0, step: '0.01', half: true, req: true })}
            {fld('stock', 'Stock', { type: 'number', min: 0, half: true, hint: 'Leave blank to not track inventory. 0 = sold out (shows "Notify me").' })}
          </section>
          <section className="a-card a-fields">
            <h2>Details</h2>
            {fld('fish', 'Species', { half: true })}{fld('origin', 'Origin', { half: true })}
            {fld('protein', 'Protein (g)', { type: 'number', min: 0, half: true })}{fld('omega', 'Omega-3 (g)', { type: 'number', min: 0, step: '0.1', half: true })}
            {fld('mercury', 'Mercury level', { half: true })}
          </section>
        </div>
        <aside className="a-stack">
          <section className="a-card a-fields">
            <h2>Organization</h2>
            {fld('slug', 'URL handle', { hint: `/products/${f.slug || slugify(f.name) || '…'}` })}
            {fld('badge', 'Badge', { hint: 'e.g. New, Best Seller, Limited' })}
            <fieldset id="p-cat" aria-invalid={!!errors.cat} aria-describedby={errors.cat ? 'pe-cat' : undefined}>
              <legend>Collections</legend>
              {Object.entries(collections).filter(([k]) => k !== 'all').map(([k, v]) => (
                <label key={k} className="a-check"><input type="checkbox" checked={f.cat.includes(k)} onChange={() => setF({ ...f, cat: f.cat.includes(k) ? f.cat.filter((c) => c !== k) : [...f.cat, k] })} /> {v.title}</label>
              ))}
              {errors.cat && <p id="pe-cat" className="a-err">{errors.cat}</p>}
            </fieldset>
          </section>
          <section className="a-card a-fields">
            <h2>Placeholder art</h2>
            <div className="a-row"><label>Tin <input type="color" value={f.tin[0]} onChange={(e) => setF({ ...f, tin: [e.target.value, f.tin[1]] })} /></label><label>Background <input type="color" value={f.tin[1]} onChange={(e) => setF({ ...f, tin: [f.tin[0], e.target.value] })} /></label></div>
            <Tin p={f} label={null} />
          </section>
          <button className="a-btn primary full">Save product</button>
        </aside>
      </form>
    </>
  )
}

/* ---------- Customers ---------- */
function Customers() {
  const [q, setQ] = useState('')
  const map = {}
  orders.forEach((o) => {
    const k = o.customer.email.toLowerCase()
    const c = (map[k] ||= { email: o.customer.email, name: `${o.customer.first} ${o.customer.last}`, city: `${o.customer.city}, ${o.customer.state}`, orders: 0, spent: 0, last: o.date, news: o.customer.news })
    c.orders++
    if (!['Refunded', 'Cancelled'].includes(o.status)) c.spent += o.total
    if (o.date > c.last) c.last = o.date
  })
  const rows = Object.values(map).filter((c) => `${c.name} ${c.email}`.toLowerCase().includes(q.toLowerCase()))
  const [sorted, th] = useSort(rows, 'spent', 'desc')
  return (
    <>
      <H actions={<button className="a-btn" disabled={!rows.length} onClick={() => exportCSV(rows, 'customers.csv')}>Export CSV</button>}>Customers</H>
      <div className="a-toolbar"><label className="a-search"><span className="sr-only">Search customers</span><input type="search" placeholder="Search customers" value={q} onChange={(e) => setQ(e.target.value)} /></label></div>
      <div className="a-card flush">
        <table className="a-table">
          <caption className="sr-only">Customers, sortable by column</caption>
          <thead><tr>{th('name', 'Customer')}{th('city', 'Location')}{th('orders', 'Orders', 'num')}{th('spent', 'Amount spent', 'num')}{th('last', 'Last order')}<th scope="col">Marketing</th></tr></thead>
          <tbody>
            {sorted.map((c) => <tr key={c.email}><th scope="row"><Link to={`/admin/orders?q=${encodeURIComponent(c.email)}`}>{c.name}</Link><br /><small className="a-muted">{c.email}</small></th><td>{c.city}</td><td className="num">{c.orders}</td><td className="num">{money(c.spent)}</td><td>{fmtDate(c.last)}</td><td><Badge v={c.news ? 'Subscribed' : 'No'} /></td></tr>)}
            {!sorted.length && <tr><td colSpan={6} className="a-empty">No customers yet. They appear after the first order.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}

/* ---------- Discounts ---------- */
function Discounts() {
  const { notify, confirm } = useUI()
  const [f, setF] = useState({ code: '', type: 'pct', pct: 10, label: '' })
  const [err, setErr] = useState('')
  const add = (e) => {
    e.preventDefault()
    const k = f.code.trim().toUpperCase()
    if (!/^[A-Z0-9_-]{3,20}$/.test(k)) return setErr('Use 3–20 letters, numbers, - or _')
    if (codes[k]) return setErr('That code already exists')
    if (f.type === 'pct' && !(f.pct > 0 && f.pct <= 100)) return setErr('Percent must be 1–100')
    codes[k] = f.type === 'pct' ? { pct: +f.pct, label: f.label || `${f.pct}% off`, active: true, uses: 0 } : { ship: true, label: f.label || 'Free shipping', active: true, uses: 0 }
    commit(); notify(`Code ${k} created`); setErr(''); setF({ code: '', type: 'pct', pct: 10, label: '' })
  }
  return (
    <>
      <H>Discounts</H>
      <div className="a-grid2 wide">
        <div className="a-card flush">
          <table className="a-table">
            <caption className="sr-only">Discount codes</caption>
            <thead><tr><th scope="col">Code</th><th scope="col">Discount</th><th scope="col" className="num">Uses</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {Object.entries(codes).map(([k, c]) => (
                <tr key={k}>
                  <th scope="row"><code>{k}</code></th><td>{c.label}</td><td className="num">{c.uses || 0}</td>
                  <td><label className="a-switch"><input type="checkbox" role="switch" checked={c.active} onChange={() => { c.active = !c.active; commit(); notify(`${k} ${c.active ? 'activated' : 'deactivated'}`) }} /><span>{c.active ? 'Active' : 'Inactive'}</span></label></td>
                  <td><button className="a-btn sm danger" aria-label={`Delete code ${k}`} onClick={async () => { if (await confirm({ title: `Delete ${k}?`, body: 'Customers will no longer be able to use it.', ok: 'Delete' })) { delete codes[k]; commit(); notify(`${k} deleted`) } }}>Delete</button></td>
                </tr>
              ))}
              {!Object.keys(codes).length && <tr><td colSpan={5} className="a-empty">No discount codes.</td></tr>}
            </tbody>
          </table>
        </div>
        <form className="a-card a-fields" onSubmit={add} noValidate>
          <h2>Create code</h2>
          <div className="a-field"><label htmlFor="d-code">Code *</label><input id="d-code" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} aria-invalid={!!err} aria-describedby={err ? 'd-err' : undefined} style={{ textTransform: 'uppercase' }} /></div>
          <fieldset><legend>Type</legend>
            <label className="a-check"><input type="radio" name="dtype" checked={f.type === 'pct'} onChange={() => setF({ ...f, type: 'pct' })} /> Percentage off</label>
            <label className="a-check"><input type="radio" name="dtype" checked={f.type === 'ship'} onChange={() => setF({ ...f, type: 'ship' })} /> Free shipping</label>
          </fieldset>
          {f.type === 'pct' && <div className="a-field"><label htmlFor="d-pct">Percent off</label><input id="d-pct" type="number" min="1" max="100" value={f.pct} onChange={(e) => setF({ ...f, pct: e.target.value })} /></div>}
          <div className="a-field"><label htmlFor="d-label">Customer-facing label</label><input id="d-label" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} /></div>
          {err && <p id="d-err" className="a-err" role="alert">{err}</p>}
          <button className="a-btn primary">Create code</button>
        </form>
      </div>
    </>
  )
}

/* ---------- Settings ---------- */
function Settings() {
  const { notify, confirm } = useUI()
  const [f, setF] = useState({ ...settings, subOff: settings.subOff * 100, taxRate: settings.taxRate * 100, announcements: settings.announcements.join('\n') })
  const [pass, setPass] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const save = (e) => {
    e.preventDefault()
    Object.assign(settings, { freeShip: +f.freeShip, giftTin: +f.giftTin, subOff: +f.subOff / 100, taxRate: +f.taxRate / 100, lowStock: +f.lowStock, announcements: f.announcements.split('\n').map((s) => s.trim()).filter(Boolean) })
    if (pass) { if (pass.length < 6) return notify('Passcode must be at least 6 characters'); settings.adminPass = pass; setPass('') }
    commit(); notify('Settings saved')
  }
  const num = (k, label, hint, step = '1') => <div className="a-field half"><label htmlFor={`s-${k}`}>{label}</label><input id={`s-${k}`} type="number" min="0" step={step} value={f[k]} onChange={set(k)} aria-describedby={`sh-${k}`} /><small id={`sh-${k}`} className="a-muted">{hint}</small></div>
  return (
    <>
      <H>Settings</H>
      <form className="a-stack narrow" onSubmit={save}>
        <section className="a-card a-fields">
          <h2>Checkout & pricing</h2>
          {num('freeShip', 'Free shipping threshold ($)', 'Drives the cart progress bar.')}
          {num('taxRate', 'Tax rate (%)', 'Flat estimated rate.', '0.01')}
          {num('subOff', 'Subscribe & Save discount (%)', 'Applied to subscription purchases.')}
          {num('giftTin', 'Gift tin upcharge ($)', 'Added for the gift tin option.', '0.01')}
          {num('lowStock', 'Low stock threshold', 'Below this, products show "Only X left".')}
        </section>
        <section className="a-card a-fields">
          <h2>Announcement bar</h2>
          <div className="a-field"><label htmlFor="s-ann">Messages (one per line)</label><textarea id="s-ann" rows={5} value={f.announcements} onChange={set('announcements')} /></div>
        </section>
        <section className="a-card a-fields">
          <h2>Security</h2>
          <div className="a-field"><label htmlFor="s-pass">New admin passcode</label><input id="s-pass" type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} aria-describedby="s-pass-h" /><small id="s-pass-h" className="a-muted">Leave blank to keep current. Min 6 characters. Demo only, so use server-side auth in production.</small></div>
        </section>
        <div className="a-row"><button className="a-btn primary">Save settings</button><button type="button" className="a-btn danger" onClick={async () => { if (await confirm({ title: 'Reset all store data?', body: 'Products, orders, discount codes and settings return to the demo defaults.', ok: 'Reset' })) resetStore() }}>Reset demo data</button></div>
      </form>
    </>
  )
}
