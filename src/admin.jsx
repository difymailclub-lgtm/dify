import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react'
import { Link, NavLink, Routes, Route, useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom'
import { supabase, errText } from './lib/supabase'
import { Tin } from './components'
import { UI } from './art'
import './admin.css'

/* ================= helpers ================= */
const mk = (d) => function Ic(props) { return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>{d}</svg> }
const Ic = {
  ...UI,
  more: mk(<><circle cx="5" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="19" cy="12" r="1.3" /></>),
  left: mk(<path d="M15 5 8 12l7 7" />),
  card: mk(<><rect x="2.5" y="5" width="19" height="14" rx="2" /><path d="M2.5 10h19M6 15h4" /></>),
  ban: mk(<><circle cx="12" cy="12" r="9" /><path d="m5.6 5.6 12.8 12.8" /></>),
  phone: mk(<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z" />),
  chat: mk(<path d="M4 20l1.3-3.9A8 8 0 1 1 8 19.3z" />),
  refresh: mk(<><path d="M20 11a8 8 0 0 0-14.9-3M4 13a8 8 0 0 0 14.9 3" /><path d="M5 3v5h5M19 21v-5h-5" /></>),
  logout: mk(<><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11" /></>),
  ext: mk(<><path d="M14 4h6v6M20 4l-9 9" /><path d="M19 14v5H5V5h5" /></>),
  plus: mk(<path d="M12 5v14M5 12h14" />),
  trash: mk(<><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></>),
  search: mk(<><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></>),
  box: mk(<><path d="M3 7l9-4 9 4v10l-9 4-9-4z" /><path d="M3 7l9 4 9-4M12 11v10" /></>),
  mailOut: mk(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>),
}

const money = (c, cur = 'USD') => ((c ?? 0) / 100).toLocaleString(undefined, { style: 'currency', currency: cur })
const when = (d) => (d ? new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—')
const STATUS = {
  awaiting_payment: ['Awaiting payment', 'warn'], payment_review: ['Payment review', 'info'],
  awaiting_confirmation: ['Awaiting confirmation', 'warn'], confirmed: ['Confirmed', 'ok'], packed: ['Packed', 'ok'],
  dispatched: ['Dispatched', 'info'], delivered: ['Delivered', 'done'], cancelled: ['Cancelled', 'bad'], returned: ['Returned', 'bad'],
}
const PAY = { unpaid: 'Unpaid', under_review: 'Under review', paid: 'Paid', rejected: 'Rejected', cod_pending: 'COD · pending', cod_collected: 'COD · collected', refunded: 'Refunded' }
const METHOD = { bank_transfer: 'Bank transfer', cod: 'Cash on delivery' }
const Pill = ({ s }) => { const [l, t] = STATUS[s] || [s, '']; return <span className={`ad-pill ${t}`}>{l}</span> }
const clean = (s) => s.replace(/[,()*\\%]/g, ' ').trim() // PostgREST filter strings: strip operator characters
const csv = (rows, name) => {
  if (!rows?.length) return
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([[Object.keys(rows[0]).map(esc).join(','), ...rows.map((r) => Object.values(r).map(esc).join(','))].join('\n')], { type: 'text/csv' }))
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}
const imgUrl = (path) => supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl

/* ================= app context ================= */
const Ctx = createContext()
const useAdmin = () => useContext(Ctx)

function useQuery(fn, deps) {
  const { version } = useAdmin()
  const [n, setN] = useState(0)
  const [s, set] = useState({ loading: true })
  useEffect(() => {
    let live = true
    set((p) => ({ ...p, loading: true }))
    Promise.resolve(fn())
      .then((r) => live && set(r?.error ? { error: r.error, loading: false } : { data: r?.data, count: r?.count, loading: false }))
      .catch((e) => live && set({ error: e, loading: false }))
    return () => { live = false }
  }, [...deps, n, version]) // eslint-disable-line react-hooks/exhaustive-deps
  return { ...s, reload: () => setN((x) => x + 1) }
}

const prefsKey = 'admin-prefs'
const loadPrefs = () => { try { return JSON.parse(localStorage.getItem(prefsKey)) || {} } catch { return {} } }

export function Admin() {
  const [session, setSession] = useState(undefined)
  const [isAdmin, setIsAdmin] = useState(null)
  const [prefs, setPrefs] = useState(loadPrefs)
  const [toast, setToast] = useState(null)
  const [dlg, setDlg] = useState(null)
  const [version, setVersion] = useState(0)
  const [counts, setCounts] = useState({})
  const [sheet, setSheet] = useState(false)
  const loc = useLocation()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  useEffect(() => {
    if (!session) { setIsAdmin(null); return }
    supabase.from('admins').select('user_id').eq('user_id', session.user.id).maybeSingle()
      .then(({ data }) => setIsAdmin(!!data))
  }, [session])
  useEffect(() => { try { localStorage.setItem(prefsKey, JSON.stringify(prefs)) } catch { /* storage unavailable */ } }, [prefs])
  useEffect(() => { setSheet(false); document.querySelector('.ad-main h1')?.focus() }, [loc.pathname])
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 4500); return () => clearTimeout(t) }, [toast])

  const loadCounts = useCallback(async () => {
    const head = { count: 'exact', head: true }
    const [p, c, s] = await Promise.all([
      supabase.from('payment_proofs').select('id', head).eq('status', 'pending'),
      supabase.from('orders').select('id', head).eq('status', 'awaiting_confirmation'),
      supabase.from('orders').select('id', head).in('status', ['confirmed', 'packed']),
    ])
    setCounts({ proofs: p.count || 0, cod: c.count || 0, ship: s.count || 0 })
  }, [])

  // realtime: new orders / screenshots refresh the badges and the open page
  useEffect(() => {
    if (!isAdmin) return
    loadCounts()
    const ch = supabase.channel('admin-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, ({ new: o }) => { setToast({ msg: `New order #${o.number} · ${money(o.total_cents, o.currency)}` }); setVersion((v) => v + 1); loadCounts() })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => { setVersion((v) => v + 1); loadCounts() })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payment_proofs' }, () => { setToast({ msg: 'New payment screenshot to review' }); setVersion((v) => v + 1); loadCounts() })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [isAdmin, loadCounts])

  const notify = (msg, tone) => setToast({ msg, tone, k: Date.now() })
  const ask = (req) => new Promise((resolve) => setDlg({ ...req, resolve }))
  const closeDlg = (v) => { dlg?.resolve(v); setDlg(null) }
  const act = async (p, okMsg) => {
    const { error } = await p
    if (error) { notify(errText(error), 'bad'); return false }
    if (okMsg) notify(okMsg)
    setVersion((v) => v + 1)
    loadCounts()
    return true
  }
  const attrs = { 'data-contrast': prefs.contrast ? 'high' : undefined, 'data-text': prefs.text || undefined, 'data-motion': prefs.motion ? 'reduce' : undefined, 'data-theme': prefs.dark ? 'dark' : undefined }

  if (session === undefined) return <div className="admin" {...attrs}><p className="ad-center" role="status">Loading…</p></div>
  if (!session) return <div className="admin" {...attrs}><Login /></div>
  if (isAdmin === null) return <div className="admin" {...attrs}><p className="ad-center" role="status">Checking access…</p></div>
  if (!isAdmin) return (
    <div className="admin" {...attrs}>
      <main className="ad-login"><div className="ad-login-card"><h1>No admin access</h1><p className="ad-muted">{session.user.email} is signed in but isn't an admin.</p><button className="ad-btn" onClick={() => supabase.auth.signOut()}>Sign out</button><Link to="/">← Back to store</Link></div></main>
    </div>
  )

  const nav = [
    ['', 'Home', Ic.dash], ['orders', 'Orders', Ic.receipt, counts.cod + counts.ship], ['payments', 'Payments', Ic.card, counts.proofs],
    ['products', 'Products', Ic.box], ['customers', 'Customers', Ic.users], ['discounts', 'Discounts', Ic.tag],
    ['reviews', 'Reviews', Ic.star], ['blocklist', 'Blocklist', Ic.ban], ['subscribers', 'Subscribers', Ic.mailOut], ['settings', 'Settings', Ic.gear],
  ]
  const toggle = (k, v = true) => setPrefs({ ...prefs, [k]: prefs[k] === v ? undefined : v })
  const Prefs = (
    <div className="ad-prefs" role="group" aria-label="Display settings">
      <button aria-pressed={!!prefs.contrast} onClick={() => toggle('contrast')}><Ic.contrast /> Contrast</button>
      <button aria-pressed={prefs.text === 'lg'} onClick={() => toggle('text', 'lg')}><Ic.text /> Large text</button>
      <button aria-pressed={!!prefs.motion} onClick={() => toggle('motion')}><Ic.motion /> Less motion</button>
      <button aria-pressed={!!prefs.dark} onClick={() => toggle('dark')}><Ic.moon /> Dark</button>
    </div>
  )
  const NavItem = ([to, l, I, badge]) => (
    <NavLink key={to} to={`/admin/${to}`} end={!to} className="ad-nav-item">
      <span className="ad-nav-ic"><I />{badge > 0 && <em aria-label={`${badge} need attention`}>{badge}</em>}</span><span>{l}</span>
    </NavLink>
  )

  return (
    <Ctx.Provider value={{ notify, ask, act, version, counts, loadCounts }}>
      <div className="admin" {...attrs}>
        <a href="#ad-main" className="skip">Skip to main content</a>
        <aside className="ad-side" aria-label="Admin">
          <Link to="/admin" className="ad-brand">Brinebird <small>Admin</small></Link>
          <nav className="ad-side-nav">{nav.map(NavItem)}</nav>
          <div className="ad-side-foot">
            {Prefs}
            <a className="ad-btn ghost" href="/" target="_blank" rel="noreferrer"><Ic.ext /> View store</a>
            <button className="ad-btn ghost" onClick={() => supabase.auth.signOut()}><Ic.logout /> Sign out</button>
          </div>
        </aside>
        <main id="ad-main" className="ad-main" tabIndex={-1}>
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:id" element={<OrderDetail />} />
            <Route path="payments" element={<Payments />} />
            <Route path="products" element={<Products />} />
            <Route path="products/:id" element={<ProductEdit />} />
            <Route path="customers" element={<Customers />} />
            <Route path="discounts" element={<Discounts />} />
            <Route path="reviews" element={<Reviews />} />
            <Route path="blocklist" element={<Blocklist />} />
            <Route path="subscribers" element={<Subscribers />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Head title="Not found" />} />
          </Routes>
        </main>
        {/* phone: bottom tabs + "More" sheet */}
        <nav className="ad-tabs" aria-label="Admin">
          {nav.slice(0, 4).map(NavItem)}
          <button className="ad-nav-item" aria-expanded={sheet} aria-controls="ad-sheet" onClick={() => setSheet(!sheet)}><span className="ad-nav-ic"><Ic.more /></span><span>More</span></button>
        </nav>
        {sheet && <div className="ad-scrim" onClick={() => setSheet(false)} />}
        <div id="ad-sheet" className={`ad-sheet ${sheet ? 'on' : ''}`} role="dialog" aria-modal="true" aria-label="More" hidden={!sheet}>
          <nav className="ad-sheet-grid">{nav.slice(4).map(NavItem)}</nav>
          {Prefs}
          <div className="ad-row"><a className="ad-btn" href="/" target="_blank" rel="noreferrer"><Ic.ext /> View store</a><button className="ad-btn" onClick={() => supabase.auth.signOut()}><Ic.logout /> Sign out</button></div>
        </div>
        <div className="ad-toast" role="status" aria-live="polite">{toast && <span key={toast.k} className={toast.tone}>{toast.msg}</span>}</div>
        <AskDialog req={dlg} done={closeDlg} />
      </div>
    </Ctx.Provider>
  )
}

/* ================= shared UI ================= */
function Head({ title, back, actions, sub }) {
  return (
    <header className="ad-head">
      {back && <Link to={back} className="ad-icon-btn" aria-label="Back"><Ic.left /></Link>}
      <div className="ad-head-t"><h1 tabIndex={-1}>{title}</h1>{sub && <p className="ad-muted">{sub}</p>}</div>
      {actions && <div className="ad-head-actions">{actions}</div>}
    </header>
  )
}

function Field({ name, label, type = 'text', required, options, defaultValue, hint, ...rest }) {
  const id = `f-${name}`
  if (type === 'checkbox') return <label className="ad-check"><input type="checkbox" name={name} defaultChecked={!!defaultValue} {...rest} /> {label}</label>
  return (
    <div className="ad-field">
      <label htmlFor={id}>{label}{required && <span aria-hidden> *</span>}</label>
      {type === 'select' ? <select id={id} name={name} defaultValue={defaultValue} required={required} {...rest}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        : type === 'textarea' ? <textarea id={id} name={name} defaultValue={defaultValue} required={required} rows={3} {...rest} />
        : <input id={id} name={name} type={type} defaultValue={defaultValue} required={required} aria-describedby={hint ? `${id}-h` : undefined} {...rest} />}
      {hint && <small id={`${id}-h`} className="ad-muted">{hint}</small>}
    </div>
  )
}

function AskDialog({ req, done }) {
  const ref = useRef()
  useEffect(() => { if (req) ref.current?.showModal(); else if (ref.current?.open) ref.current.close() }, [req])
  return (
    <dialog ref={ref} className="ad-dialog" onCancel={(e) => { e.preventDefault(); done(null) }} aria-labelledby="ad-dlg-h">
      {req && (
        <form onSubmit={(e) => { e.preventDefault(); done(Object.fromEntries(new FormData(e.currentTarget))) }}>
          <h2 id="ad-dlg-h">{req.title}</h2>
          {req.body && <p>{req.body}</p>}
          {req.fields?.map((f) => <Field key={f.name} {...f} />)}
          <div className="ad-dlg-actions">
            <button type="button" className="ad-btn" onClick={() => done(null)}>Cancel</button>
            <button className={`ad-btn ${req.danger ? 'danger' : 'primary'}`} autoFocus={!req.fields}>{req.ok || 'Confirm'}</button>
          </div>
        </form>
      )}
    </dialog>
  )
}

const State = ({ q, empty, children }) =>
  q.loading && !q.data ? <p className="ad-muted ad-pad" role="status">Loading…</p>
    : q.error ? <p className="ad-err ad-pad" role="alert">{errText(q.error)} <button className="ad-link" onClick={q.reload}>Retry</button></p>
    : !q.data?.length && empty ? <div className="ad-empty">{empty}</div>
    : children

/* ================= login ================= */
function Login() {
  const [err, setErr] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    const f = Object.fromEntries(new FormData(e.currentTarget))
    setBusy(true); setErr('')
    const { error } = await supabase.auth.signInWithPassword({ email: f.email, password: f.password })
    setBusy(false)
    if (error) setErr(error.message)
  }
  const reset = async () => {
    const email = document.getElementById('f-email').value
    if (!email) return setErr('Enter your email first.')
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/admin` })
    if (error) setErr(error.message); else setMsg('If that account exists, a reset link is on its way.')
  }
  return (
    <main className="ad-login">
      <form className="ad-login-card" onSubmit={submit} aria-describedby={err ? 'login-err' : undefined}>
        <h1>Brinebird Admin</h1>
        <Field name="email" label="Email" type="email" autoComplete="username" required autoFocus />
        <Field name="password" label="Password" type="password" autoComplete="current-password" required />
        {err && <p id="login-err" className="ad-err" role="alert">{err}</p>}
        {msg && <p role="status">{msg}</p>}
        <button className="ad-btn primary full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <button type="button" className="ad-link" onClick={reset}>Forgot password?</button>
        <Link to="/">← Back to store</Link>
      </form>
    </main>
  )
}

/* ================= dashboard ================= */
function Dashboard() {
  const { counts } = useAdmin()
  const q = useQuery(() => supabase.rpc('admin_stats', { p_days: 14 }), [])
  const recent = useQuery(() => supabase.from('orders').select('id, number, email, status, total_cents, currency, created_at').order('created_at', { ascending: false }).limit(6), [])
  const s = q.data
  const max = Math.max(1, ...(s?.daily || []).map((d) => d.total_cents))
  return (
    <>
      <Head title="Dashboard" actions={<button className="ad-icon-btn" onClick={q.reload} aria-label="Refresh"><Ic.refresh /></button>} />
      <section className="ad-todo" aria-label="Needs your attention">
        <Link to="/admin/payments" className={`ad-todo-tile ${counts.proofs ? 'hot' : ''}`}><Ic.card /><b>{counts.proofs ?? '–'}</b><span>Payments to review</span></Link>
        <Link to="/admin/orders?f=awaiting_confirmation" className={`ad-todo-tile ${counts.cod ? 'hot' : ''}`}><Ic.phone /><b>{counts.cod ?? '–'}</b><span>COD to confirm</span></Link>
        <Link to="/admin/orders?f=to_ship" className={`ad-todo-tile ${counts.ship ? 'hot' : ''}`}><Ic.truck /><b>{counts.ship ?? '–'}</b><span>Ready to ship</span></Link>
      </section>
      <State q={q}>
        {s && (
          <>
            <section className="ad-kpis" aria-label="Key numbers">
              <div className="ad-card"><span>Revenue (paid)</span><b>{money(s.revenue_cents)}</b></div>
              <div className="ad-card"><span>Orders</span><b>{s.orders}</b></div>
              <div className="ad-card"><span>Avg. order</span><b>{money(s.orders ? s.revenue_cents / Math.max(1, s.orders) : 0)}</b></div>
            </section>
            <section className="ad-card">
              <h2 id="chart-h">Sales, last 14 days</h2>
              <div className="ad-chart" role="img" aria-labelledby="chart-h" aria-describedby="chart-t">
                {s.daily.map((d) => <div key={d.day} className="ad-bar" title={`${d.day}: ${money(d.total_cents)}`}><span style={{ height: `${(d.total_cents / max) * 100}%` }} /><small>{d.day.slice(8)}</small></div>)}
              </div>
              <details><summary>Show as table</summary>
                <table id="chart-t" className="ad-table"><thead><tr><th scope="col">Day</th><th scope="col">Sales</th></tr></thead><tbody>{s.daily.map((d) => <tr key={d.day}><td>{d.day}</td><td>{money(d.total_cents)}</td></tr>)}</tbody></table>
              </details>
            </section>
            {!!s.low_stock.length && (
              <section className="ad-card"><h2>Low stock</h2>
                <ul className="ad-list">{s.low_stock.map((p) => <li key={p.slug}><span>{p.name}</span><b className={p.stock === 0 ? 'ad-err' : ''}>{p.stock === 0 ? 'Sold out' : `${p.stock} left`}</b></li>)}</ul>
              </section>
            )}
          </>
        )}
      </State>
      <section className="ad-card"><h2>Latest orders</h2>
        <State q={recent} empty="No orders yet.">
          <ul className="ad-rows">{recent.data?.map((o) => <OrderRow key={o.id} o={o} />)}</ul>
        </State>
      </section>
    </>
  )
}

/* ================= orders ================= */
const FILTERS = [
  ['needs', 'Needs action', ['payment_review', 'awaiting_confirmation', 'confirmed', 'packed']],
  ['all', 'All', null],
  ['awaiting_payment', 'Awaiting payment', ['awaiting_payment']],
  ['payment_review', 'Payment review', ['payment_review']],
  ['awaiting_confirmation', 'COD to confirm', ['awaiting_confirmation']],
  ['to_ship', 'To ship', ['confirmed', 'packed']],
  ['dispatched', 'Dispatched', ['dispatched']],
  ['delivered', 'Delivered', ['delivered']],
  ['closed', 'Cancelled / returned', ['cancelled', 'returned']],
]
const PAGE = 25

function OrderRow({ o }) {
  return (
    <li>
      <Link to={`/admin/orders/${o.id}`} className="ad-order-row">
        <span className="ad-or-num">#{o.number}</span>
        <span className="ad-or-who">{o.shipping_address?.name || o.email}<small>{o.email}</small></span>
        <Pill s={o.status} />
        <b className="ad-or-total">{money(o.total_cents, o.currency)}</b>
        <small className="ad-or-meta">{METHOD[o.payment_method] || ''}{o.created_at && ` · ${when(o.created_at)}`}</small>
      </Link>
    </li>
  )
}

function Orders() {
  const [params, setParams] = useSearchParams()
  const f = params.get('f') || 'needs'
  const search = params.get('q') || ''
  const [page, setPage] = useState(0)
  const [text, setText] = useState(search)
  useEffect(() => setPage(0), [f, search])
  const q = useQuery(() => {
    let r = supabase.from('orders').select('id, number, email, status, payment_method, total_cents, currency, created_at, shipping_address', { count: 'exact' })
      .order('created_at', { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1)
    const statuses = FILTERS.find(([k]) => k === f)?.[2]
    if (statuses) r = r.in('status', statuses)
    const s = clean(search)
    if (/^#?\d+$/.test(s)) r = r.eq('number', Number(s.replace('#', '')))
    else if (s) r = r.or(`email.ilike.*${s}*,phone.ilike.*${s}*`)
    return r
  }, [f, search, page])
  const set = (k, v) => { const p = new URLSearchParams(params); v ? p.set(k, v) : p.delete(k); setParams(p, { replace: true }) }
  const pages = Math.ceil((q.count || 0) / PAGE)
  return (
    <>
      <Head title="Orders" sub={q.count != null ? `${q.count} ${q.count === 1 ? 'order' : 'orders'}` : null}
        actions={<button className="ad-icon-btn" onClick={q.reload} aria-label="Refresh"><Ic.refresh /></button>} />
      <form className="ad-search" role="search" onSubmit={(e) => { e.preventDefault(); set('q', text.trim()) }}>
        <label htmlFor="o-q" className="sr-only">Search orders</label>
        <Ic.search />
        <input id="o-q" type="search" inputMode="search" placeholder="Order #, email or phone" value={text} onChange={(e) => { setText(e.target.value); if (!e.target.value) set('q', '') }} />
      </form>
      <div className="ad-chips" role="group" aria-label="Filter orders">
        {FILTERS.map(([k, l]) => <button key={k} aria-pressed={f === k} onClick={() => set('f', k)}>{l}</button>)}
      </div>
      <State q={q} empty={f === 'needs' ? 'All caught up. Nothing needs action right now.' : 'No orders match.'}>
        <ul className="ad-rows">{q.data?.map((o) => <OrderRow key={o.id} o={o} />)}</ul>
        {pages > 1 && (
          <nav className="ad-pager" aria-label="Pages">
            <button className="ad-btn" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
            <span>Page {page + 1} of {pages}</span>
            <button className="ad-btn" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Next</button>
          </nav>
        )}
      </State>
    </>
  )
}

function ProofImage({ path }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    let live = true
    supabase.storage.from('payment-proofs').createSignedUrl(path, 300).then(({ data }) => live && setUrl(data?.signedUrl))
    return () => { live = false }
  }, [path])
  if (!url) return <div className="ad-proof-ph" role="status">Loading screenshot…</div>
  return path.endsWith('.pdf')
    ? <a className="ad-btn" href={url} target="_blank" rel="noreferrer"><Ic.ext /> Open PDF</a>
    : <a href={url} target="_blank" rel="noreferrer" className="ad-proof"><img src={url} alt="Payment screenshot uploaded by the customer" loading="lazy" /><span>Open full size</span></a>
}

function useProofReview() {
  const { ask, act } = useAdmin()
  return {
    approve: async (proof, order) => {
      const v = await ask({ title: `Approve payment for #${order.number}?`, body: `Check that the screenshot shows ${money(order.total_cents, order.currency)} and reference #${order.number}.`, ok: 'Approve payment',
        fields: [{ name: 'ref', label: 'Bank transaction ID (optional)', hint: 'Stops the same transfer being used for another order.' }] })
      return v && act(supabase.rpc('review_payment_proof', { p_proof: proof.id, p_approve: true, p_transaction_ref: v.ref || null }), `Payment approved. Order #${order.number} confirmed.`)
    },
    reject: async (proof, order) => {
      const v = await ask({ title: `Reject payment for #${order.number}?`, ok: 'Reject', danger: true, body: 'The customer can upload a new screenshot.',
        fields: [{ name: 'reason', label: 'Reason (shown to the customer)', type: 'textarea', required: true, maxLength: 500, placeholder: 'e.g. The amount doesn’t match the order total.' }] })
      return v && act(supabase.rpc('review_payment_proof', { p_proof: proof.id, p_approve: false, p_reason: v.reason }), `Payment rejected for #${order.number}.`)
    },
  }
}

function OrderDetail() {
  const { id } = useParams()
  const { ask, act } = useAdmin()
  const review = useProofReview()
  const q = useQuery(() => supabase.from('orders').select('*, order_items(*), order_events(*), payment_proofs(*), notifications(*)').eq('id', id).single(), [id])
  const o = q.data
  if (!o) return <><Head title="Order" back="/admin/orders" /><State q={q}>{null}</State></>

  const move = async (to, opts = {}) => {
    const v = opts.fields || opts.body ? await ask({ title: opts.title, body: opts.body, fields: opts.fields, ok: opts.ok, danger: opts.danger }) : {}
    if (!v) return
    const fields = v.courier || v.tracking ? { courier: v.courier, tracking_number: v.tracking } : {}
    act(supabase.rpc('transition_order', { p_order: o.id, p_to: to, p_note: v.note || opts.note || null, p_fields: fields }), opts.done)
  }
  const cancel = () => move('cancelled', { title: `Cancel order #${o.number}?`, body: 'Held stock goes back on sale.', ok: 'Cancel order', danger: true, done: 'Order cancelled', fields: [{ name: 'note', label: 'Reason (internal)', type: 'textarea', required: true }] })
  const pending = o.payment_proofs.find((p) => p.status === 'pending')
  const phone = o.phone?.replace(/[^\d]/g, '')
  const waText = encodeURIComponent(`Hi ${o.shipping_address?.name || ''}! This is Brinebird about order #${o.number} (${money(o.total_cents, o.currency)}, cash on delivery). Can you confirm you'd like us to ship it? Reply YES or NO.`)
  const actions = {
    payment_review: pending && <><button className="ad-btn primary" onClick={() => review.approve(pending, o)}><Ic.check /> Approve payment</button><button className="ad-btn danger" onClick={() => review.reject(pending, o)}>Reject</button></>,
    awaiting_payment: <button className="ad-btn danger" onClick={cancel}>Cancel order</button>,
    awaiting_confirmation: <><button className="ad-btn primary" onClick={() => move('confirmed', { title: `Mark #${o.number} confirmed?`, body: 'Use this when the customer confirmed by phone or WhatsApp.', ok: 'Confirm order', done: 'Order confirmed', fields: [{ name: 'note', label: 'How did they confirm? (internal)', placeholder: 'e.g. Confirmed on WhatsApp' }] })}><Ic.check /> Confirm order</button><button className="ad-btn danger" onClick={cancel}>Cancel</button></>,
    confirmed: <><button className="ad-btn primary" onClick={() => move('packed', { done: 'Marked packed' })}><Ic.box /> Mark packed</button><DispatchBtn move={move} o={o} /><button className="ad-btn danger" onClick={cancel}>Cancel</button></>,
    packed: <><DispatchBtn move={move} o={o} primary /><button className="ad-btn danger" onClick={cancel}>Cancel</button></>,
    dispatched: <><button className="ad-btn primary" onClick={() => move('delivered', { title: `Mark #${o.number} delivered?`, body: o.payment_method === 'cod' ? `This also records ${money(o.total_cents, o.currency)} cash as collected.` : undefined, ok: 'Mark delivered', done: 'Marked delivered' })}><Ic.check /> Mark delivered</button><button className="ad-btn" onClick={() => move('returned', { title: 'Mark as returned?', ok: 'Mark returned', danger: true, done: 'Marked returned', fields: [{ name: 'note', label: 'Reason', type: 'textarea', required: true }] })}>Returned</button></>,
    delivered: <button className="ad-btn" onClick={() => move('returned', { title: 'Mark as returned?', ok: 'Mark returned', danger: true, done: 'Marked returned', fields: [{ name: 'note', label: 'Reason', type: 'textarea', required: true }] })}>Mark returned</button>,
  }[o.status]
  const addNote = async (e) => {
    e.preventDefault()
    const form = e.currentTarget
    const note = new FormData(form).get('note')
    if (await act(supabase.rpc('add_order_note', { p_order: o.id, p_note: note }), 'Note added')) form.reset()
  }
  const a = o.shipping_address || {}
  return (
    <>
      <Head title={`Order #${o.number}`} back="/admin/orders" sub={when(o.created_at)} />
      <div className="ad-status-strip"><Pill s={o.status} /><span className="ad-pill">{PAY[o.payment_status]}</span><span className="ad-pill">{METHOD[o.payment_method]}</span>{o.expires_at && <span className="ad-muted">Auto-cancels {when(o.expires_at)}</span>}</div>
      {actions && <div className="ad-actionbar">{actions}</div>}
      <div className="ad-detail">
        <div className="ad-stack">
          {o.payment_proofs.length > 0 && (
            <section className="ad-card"><h2>Payment screenshots</h2>
              <p>Expected: <b>{money(o.total_cents, o.currency)}</b> with reference <b>#{o.number}</b></p>
              <div className="ad-proofs">{o.payment_proofs.map((p) => (
                <figure key={p.id} className="ad-proof-card"><ProofImage path={p.file_path} />
                  <figcaption><span className={`ad-pill ${p.status === 'approved' ? 'ok' : p.status === 'rejected' ? 'bad' : 'info'}`}>{p.status}</span> {when(p.created_at)}{p.transaction_ref && <> · Txn {p.transaction_ref}</>}{p.reject_reason && <><br /><span className="ad-err">{p.reject_reason}</span></>}</figcaption>
                </figure>
              ))}</div>
            </section>
          )}
          <section className="ad-card"><h2>Items</h2>
            <ul className="ad-items">{o.order_items.map((i) => <li key={i.id}><span>{i.name}<small>{i.variant_title} · {money(i.unit_price_cents, o.currency)} × {i.quantity}</small></span><b>{money(i.unit_price_cents * i.quantity, o.currency)}</b></li>)}</ul>
            <dl className="ad-totals">
              <div><dt>Subtotal</dt><dd>{money(o.subtotal_cents, o.currency)}</dd></div>
              {o.discount_cents > 0 && <div><dt>Discount {o.discount_code}</dt><dd>−{money(o.discount_cents, o.currency)}</dd></div>}
              <div><dt>Shipping</dt><dd>{o.shipping_cents ? money(o.shipping_cents, o.currency) : 'Free'}</dd></div>
              <div><dt>Tax</dt><dd>{money(o.tax_cents, o.currency)}</dd></div>
              <div className="ad-total"><dt>Total</dt><dd>{money(o.total_cents, o.currency)}</dd></div>
            </dl>
            {o.gift_note && <p className="ad-note">Gift note: “{o.gift_note}”</p>}
          </section>
          <section className="ad-card"><h2>Timeline</h2>
            <form className="ad-inline" onSubmit={addNote}>
              <label htmlFor="note" className="sr-only">Internal note</label>
              <input id="note" name="note" placeholder="Add an internal note…" required maxLength={1000} />
              <button className="ad-btn">Add</button>
            </form>
            <ol className="ad-timeline">{[...o.order_events].sort((x, y) => y.created_at.localeCompare(x.created_at)).map((e) => (
              <li key={e.id} className={e.type}><time>{when(e.created_at)} · {e.actor_kind}</time><p>{e.type === 'note' ? e.note : <>{e.to_status ? (STATUS[e.to_status]?.[0] || e.to_status) : e.type}{e.note && ` — ${e.note}`}</>}</p></li>
            ))}</ol>
          </section>
        </div>
        <aside className="ad-stack">
          <section className="ad-card"><h2>Customer</h2>
            <p><b>{a.name}</b><br /><a href={`mailto:${o.email}`}>{o.email}</a>{o.phone && <><br />{o.phone}</>}</p>
            <div className="ad-row">
              {o.phone && <a className="ad-btn" href={`tel:${o.phone}`}><Ic.phone /> Call</a>}
              {phone && <a className="ad-btn" href={`https://wa.me/${phone}?text=${waText}`} target="_blank" rel="noreferrer"><Ic.chat /> WhatsApp</a>}
              <Link className="ad-btn" to={`/admin/orders?f=all&q=${encodeURIComponent(o.email)}`}>All orders</Link>
            </div>
            <h3>Ship to</h3>
            <address>{a.line1}{a.line2 && <>, {a.line2}</>}<br />{[a.city, a.region, a.postal_code].filter(Boolean).join(', ')}{a.country && <><br />{a.country}</>}</address>
            {(o.courier || o.tracking_number) && <p><b>Courier:</b> {o.courier} {o.tracking_number && <>· {o.tracking_number}</>}</p>}
            <p className="ad-muted">{o.whatsapp_opt_in ? 'WhatsApp updates: yes' : 'WhatsApp updates: no'} · {o.marketing_opt_in ? 'Marketing: yes' : 'Marketing: no'}</p>
            <BlockButtons email={o.email} phone={o.phone} />
          </section>
          <section className="ad-card"><h2>Messages sent</h2>
            {o.notifications.length ? <ul className="ad-list">{o.notifications.map((n) => <li key={n.id}><span>{n.template}<small>{n.channel} · {when(n.created_at)}</small></span><span className={`ad-pill ${n.status === 'sent' ? 'ok' : n.status === 'failed' ? 'bad' : ''}`}>{n.status}</span></li>)}</ul>
              : <p className="ad-muted">No messages logged yet. Emails are sent automatically once email sending is connected.</p>}
          </section>
        </aside>
      </div>
    </>
  )
}

function DispatchBtn({ move, o, primary }) {
  return <button className={`ad-btn ${primary ? 'primary' : ''}`} onClick={() => move('dispatched', { title: `Dispatch #${o.number}`, ok: 'Mark dispatched', done: 'Marked dispatched',
    fields: [{ name: 'courier', label: 'Courier', required: true, placeholder: 'e.g. TCS, Leopards, DHL' }, { name: 'tracking', label: 'Tracking number', required: true, autoComplete: 'off' }] })}><Ic.truck /> Dispatch</button>
}

function BlockButtons({ email, phone }) {
  const { ask, act } = useAdmin()
  const block = async (kind, value) => {
    const v = await ask({ title: `Block this ${kind}?`, body: `${value} won't be able to place new orders.`, ok: 'Block', danger: true, fields: [{ name: 'reason', label: 'Reason (internal)', required: true }] })
    if (v) act(supabase.from('blocked_contacts').insert({ kind, value: kind === 'email' ? value.toLowerCase() : value, reason: v.reason }), `${value} blocked`)
  }
  return (
    <div className="ad-row ad-sm">
      <button className="ad-link danger" onClick={() => block('email', email)}><Ic.ban /> Block email</button>
      {phone && <button className="ad-link danger" onClick={() => block('phone', phone)}><Ic.ban /> Block phone</button>}
    </div>
  )
}

/* ================= payments queue ================= */
function Payments() {
  const review = useProofReview()
  const q = useQuery(() => supabase.from('payment_proofs').select('id, file_path, created_at, order:orders(id, number, total_cents, currency, email, shipping_address, created_at)').eq('status', 'pending').order('created_at'), [])
  return (
    <>
      <Head title="Payments to review" sub="Compare each screenshot with the order total and reference." actions={<button className="ad-icon-btn" onClick={q.reload} aria-label="Refresh"><Ic.refresh /></button>} />
      <State q={q} empty="No payment screenshots waiting. New ones appear here automatically.">
        <div className="ad-review-grid">
          {q.data?.map((p) => (
            <article key={p.id} className="ad-card ad-review">
              <ProofImage path={p.file_path} />
              <div className="ad-review-info">
                <p className="ad-big">{money(p.order.total_cents, p.order.currency)}</p>
                <p>Reference <b>#{p.order.number}</b> · {p.order.shipping_address?.name}</p>
                <p className="ad-muted">{p.order.email}<br />Uploaded {when(p.created_at)}</p>
                <div className="ad-row">
                  <button className="ad-btn primary" onClick={() => review.approve(p, p.order)}><Ic.check /> Approve</button>
                  <button className="ad-btn danger" onClick={() => review.reject(p, p.order)}>Reject</button>
                  <Link className="ad-btn ghost" to={`/admin/orders/${p.order.id}`}>Order</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </State>
    </>
  )
}

/* ================= products ================= */
function Products() {
  const { act } = useAdmin()
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const q = useQuery(() => supabase.from('products').select('id, slug, name, status, stock, badge, colors, art, species, image_path, variants(price_cents)').order('sort_order'), [])
  const list = (q.data || []).filter((p) => p.name.toLowerCase().includes(text.toLowerCase()))
  const saveStock = (p, v) => {
    const stock = v === '' ? null : Math.max(0, parseInt(v, 10) || 0)
    if (stock !== p.stock) act(supabase.from('products').update({ stock }).eq('id', p.id), `Stock updated: ${p.name}`)
  }
  return (
    <>
      <Head title="Products" sub={q.data ? `${q.data.length} products` : null} actions={<button className="ad-btn primary" onClick={() => navigate('/admin/products/new')}><Ic.plus /> Add</button>} />
      <div className="ad-search"><Ic.search /><label htmlFor="p-q" className="sr-only">Search products</label><input id="p-q" type="search" placeholder="Search products" value={text} onChange={(e) => setText(e.target.value)} /></div>
      <State q={q} empty="No products yet.">
        <ul className="ad-prod-grid">
          {list.map((p) => {
            const prices = p.variants.map((v) => v.price_cents)
            return (
              <li key={p.id} className="ad-card ad-prod">
                <Link to={`/admin/products/${p.id}`} className="ad-prod-img" aria-label={`Edit ${p.name}`}>
                  {p.image_path ? <img src={imgUrl(p.image_path)} alt="" loading="lazy" /> : <Tin p={{ slug: p.slug, tin: p.colors?.length ? p.colors : undefined, fish: p.species, art: p.art }} label={null} />}
                </Link>
                <div className="ad-prod-info">
                  <Link to={`/admin/products/${p.id}`} className="ad-prod-name">{p.name}</Link>
                  <p className="ad-muted">{prices.length ? (Math.min(...prices) === Math.max(...prices) ? money(prices[0]) : `${money(Math.min(...prices))} – ${money(Math.max(...prices))}`) : 'No variants'}{p.status !== 'active' && <> · <span className="ad-pill warn">{p.status}</span></>}</p>
                  <label className="ad-stock">
                    <span>Stock</span>
                    <input type="number" inputMode="numeric" min="0" defaultValue={p.stock ?? ''} placeholder="∞" aria-label={`Stock for ${p.name}, blank means not tracked`}
                      className={p.stock === 0 ? 'zero' : p.stock != null && p.stock < 15 ? 'low' : ''} onBlur={(e) => saveStock(p, e.target.value)} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
                  </label>
                </div>
              </li>
            )
          })}
        </ul>
      </State>
    </>
  )
}

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)

function ProductEdit() {
  const { id } = useParams()
  const isNew = id === 'new'
  const navigate = useNavigate()
  const { act, ask, notify } = useAdmin()
  const q = useQuery(() => Promise.all([
    isNew ? { data: null } : supabase.from('products').select('*, variants(*), product_collections(collection)').eq('id', id).single(),
    supabase.from('collections').select('handle, title').order('sort_order'),
  ]).then(([p, c]) => (p.error || c.error ? { error: p.error || c.error } : { data: { p: p.data, cols: c.data } })), [id])
  const [variants, setVariants] = useState(null)
  const [busy, setBusy] = useState(false)
  const p = q.data?.p
  useEffect(() => { if (q.data) setVariants((q.data.p?.variants || [{ title: 'Single', units: 1, gift_tin: false, price_cents: 1000 }]).slice().sort((x, y) => x.sort_order - y.sort_order)) }, [q.data])
  if (!q.data || !variants) return <><Head title={isNew ? 'New product' : 'Product'} back="/admin/products" /><State q={q}>{null}</State></>

  const setV = (i, k, v) => setVariants(variants.map((x, j) => (j === i ? { ...x, [k]: v } : x)))
  const save = async (e) => {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const row = {
      name: f.get('name').trim(), slug: f.get('slug').trim() || slugify(f.get('name')), description: f.get('description'),
      status: f.get('status'), badge: f.get('badge').trim() || null, species: f.get('species').trim() || null, origin: f.get('origin').trim() || null,
      stock: f.get('stock') === '' ? null : Math.max(0, parseInt(f.get('stock'), 10) || 0), colors: [f.get('c1'), f.get('c2')],
    }
    if (!variants.length) return notify('Add at least one variant', 'bad')
    setBusy(true)
    try {
      let pid = p?.id
      if (isNew) {
        const { data, error } = await supabase.from('products').insert(row).select('id').single()
        if (error) throw error
        pid = data.id
      } else {
        const { error } = await supabase.from('products').update(row).eq('id', pid)
        if (error) throw error
      }
      const file = f.get('image')
      if (file && file.size) {
        if (file.size > 5 * 1024 * 1024) throw new Error('Image must be 5MB or smaller')
        const path = `${pid}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`
        const up = await supabase.storage.from('product-images').upload(path, file, { contentType: file.type })
        if (up.error) throw up.error
        await supabase.from('products').update({ image_path: path }).eq('id', pid)
      }
      const keep = variants.filter((v) => v.id).map((v) => v.id)
      const removed = (p?.variants || []).filter((v) => !keep.includes(v.id)).map((v) => v.id)
      if (removed.length) { const { error } = await supabase.from('variants').delete().in('id', removed); if (error) throw error }
      for (const [i, v] of variants.entries()) {
        const vr = { product_id: pid, title: v.title.trim() || 'Single', units: Number(v.units) || 1, gift_tin: !!v.gift_tin, price_cents: Math.round(Number(v.price_cents) || 0), compare_at_cents: v.compare_at_cents ? Math.round(Number(v.compare_at_cents)) : null, sku: v.sku?.trim() || null, sort_order: i }
        const { error } = v.id ? await supabase.from('variants').update(vr).eq('id', v.id) : await supabase.from('variants').insert(vr)
        if (error) throw error
      }
      const cols = f.getAll('collections')
      await supabase.from('product_collections').delete().eq('product_id', pid)
      if (cols.length) { const { error } = await supabase.from('product_collections').insert(cols.map((c) => ({ product_id: pid, collection: c }))); if (error) throw error }
      notify(`${row.name} saved`)
      navigate('/admin/products')
    } catch (err) {
      notify(errText(err), 'bad')
    } finally { setBusy(false) }
  }
  const archive = async () => {
    if (await ask({ title: `Archive ${p.name}?`, body: 'It disappears from the store but past orders keep their history.', ok: 'Archive', danger: true }))
      if (await act(supabase.from('products').update({ status: 'archived' }).eq('id', p.id), 'Product archived')) navigate('/admin/products')
  }
  const inCols = new Set((p?.product_collections || []).map((c) => c.collection))
  return (
    <>
      <Head title={isNew ? 'New product' : p.name} back="/admin/products" />
      <form className="ad-detail" onSubmit={save}>
        <div className="ad-stack">
          <section className="ad-card ad-form">
            <Field name="name" label="Name" required defaultValue={p?.name} maxLength={200} />
            <Field name="description" label="Description" type="textarea" defaultValue={p?.description} maxLength={5000} />
            <div className="ad-grid2">
              <Field name="species" label="Species" defaultValue={p?.species} />
              <Field name="origin" label="Origin" defaultValue={p?.origin} />
            </div>
          </section>
          <section className="ad-card">
            <h2>Variants & prices</h2>
            <p className="ad-muted">Prices are in cents (1200 = $12.00). “Tins used” is how many come out of stock per sale (a 6-pack uses 6).</p>
            <div className="ad-variants">
              {variants.map((v, i) => (
                <fieldset key={v.id || `new-${i}`} className="ad-variant">
                  <legend>Variant {i + 1}</legend>
                  <div className="ad-grid3">
                    <div className="ad-field"><label htmlFor={`vt${i}`}>Title</label><input id={`vt${i}`} value={v.title} onChange={(e) => setV(i, 'title', e.target.value)} required /></div>
                    <div className="ad-field"><label htmlFor={`vp${i}`}>Price (cents)</label><input id={`vp${i}`} type="number" inputMode="numeric" min="0" value={v.price_cents} onChange={(e) => setV(i, 'price_cents', e.target.value)} required /></div>
                    <div className="ad-field"><label htmlFor={`vc${i}`}>Compare-at</label><input id={`vc${i}`} type="number" inputMode="numeric" min="0" value={v.compare_at_cents ?? ''} onChange={(e) => setV(i, 'compare_at_cents', e.target.value)} /></div>
                    <div className="ad-field"><label htmlFor={`vu${i}`}>Tins used</label><input id={`vu${i}`} type="number" inputMode="numeric" min="1" max="100" value={v.units} onChange={(e) => setV(i, 'units', e.target.value)} required /></div>
                    <div className="ad-field"><label htmlFor={`vs${i}`}>SKU</label><input id={`vs${i}`} value={v.sku ?? ''} onChange={(e) => setV(i, 'sku', e.target.value)} /></div>
                    <label className="ad-check"><input type="checkbox" checked={!!v.gift_tin} onChange={(e) => setV(i, 'gift_tin', e.target.checked)} /> Gift tin</label>
                  </div>
                  <button type="button" className="ad-link danger" onClick={() => setVariants(variants.filter((_, j) => j !== i))}><Ic.trash /> Remove variant</button>
                </fieldset>
              ))}
            </div>
            <button type="button" className="ad-btn" onClick={() => setVariants([...variants, { title: '', units: 1, gift_tin: false, price_cents: 0 }])}><Ic.plus /> Add variant</button>
          </section>
        </div>
        <aside className="ad-stack">
          <section className="ad-card ad-form">
            <Field name="status" label="Status" type="select" defaultValue={p?.status || 'draft'} options={[['draft', 'Draft (hidden)'], ['active', 'Active (on sale)'], ['archived', 'Archived']]} />
            <Field name="stock" label="Stock (tins)" type="number" inputMode="numeric" min="0" defaultValue={p?.stock ?? ''} hint="Blank = not tracked. 0 = sold out." />
            <Field name="slug" label="URL handle" defaultValue={p?.slug} pattern="[a-z0-9-]{1,80}" hint="Lowercase letters, numbers and dashes." />
            <Field name="badge" label="Badge" defaultValue={p?.badge} maxLength={40} hint="e.g. New, Best Seller" />
            <fieldset className="ad-fieldset"><legend>Collections</legend>
              {q.data.cols.map((c) => <label key={c.handle} className="ad-check"><input type="checkbox" name="collections" value={c.handle} defaultChecked={inCols.has(c.handle)} /> {c.title}</label>)}
            </fieldset>
          </section>
          <section className="ad-card ad-form">
            <h2>Image</h2>
            {p?.image_path && <img className="ad-prod-preview" src={imgUrl(p.image_path)} alt="Current product image" />}
            <Field name="image" label="Upload photo (JPG, PNG or WebP, max 5MB)" type="file" accept="image/jpeg,image/png,image/webp" />
            <div className="ad-grid2">
              <Field name="c1" label="Tin colour" type="color" defaultValue={p?.colors?.[0] || '#fdcd62'} />
              <Field name="c2" label="Background" type="color" defaultValue={p?.colors?.[1] || '#73c3f5'} />
            </div>
          </section>
          <div className="ad-save-bar">
            <button className="ad-btn primary full" disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button>
            {!isNew && p.status !== 'archived' && <button type="button" className="ad-btn danger full" onClick={archive}>Archive</button>}
          </div>
        </aside>
      </form>
    </>
  )
}

/* ================= customers ================= */
function Customers() {
  const [text, setText] = useState('')
  const q = useQuery(() => supabase.rpc('admin_customers'), [])
  const list = (q.data || []).filter((c) => `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(text.toLowerCase()))
  return (
    <>
      <Head title="Customers" sub={q.data ? `${q.data.length} customers` : null} actions={<button className="ad-btn" disabled={!q.data?.length} onClick={() => csv(q.data, 'customers.csv')}>Export CSV</button>} />
      <div className="ad-search"><Ic.search /><label htmlFor="c-q" className="sr-only">Search customers</label><input id="c-q" type="search" placeholder="Name, email or phone" value={text} onChange={(e) => setText(e.target.value)} /></div>
      <State q={q} empty="Customers appear after their first order.">
        <ul className="ad-rows">{list.map((c) => (
          <li key={c.email} className="ad-card ad-cust">
            <div><b>{c.name || c.email}</b><small>{c.email}{c.phone && ` · ${c.phone}`}</small></div>
            <div className="ad-cust-stats">
              <span>{c.orders} orders</span><b>{money(c.spent_cents)}</b>
              {c.cod_cancelled > 0 && <span className="ad-pill bad" title="Cancelled cash-on-delivery orders">{c.cod_cancelled} COD cancelled</span>}
              {c.marketing && <span className="ad-pill ok">Subscribed</span>}
            </div>
            <div className="ad-row ad-sm"><Link className="ad-link" to={`/admin/orders?f=all&q=${encodeURIComponent(c.email)}`}>View orders</Link><BlockButtons email={c.email} phone={c.phone} /></div>
          </li>
        ))}</ul>
      </State>
    </>
  )
}

/* ================= discounts ================= */
function Discounts() {
  const { act, ask } = useAdmin()
  const q = useQuery(() => supabase.from('discount_codes').select('*').order('created_at', { ascending: false }), [])
  const create = async () => {
    const v = await ask({ title: 'New discount code', ok: 'Create', fields: [
      { name: 'code', label: 'Code', required: true, pattern: '[A-Za-z0-9_-]{3,32}', hint: '3–32 letters, numbers, - or _', style: { textTransform: 'uppercase' } },
      { name: 'type', label: 'Type', type: 'select', options: [['percent', 'Percent off'], ['fixed', 'Fixed amount off (cents)'], ['free_shipping', 'Free shipping']] },
      { name: 'value', label: 'Value', type: 'number', min: 0, defaultValue: 10, hint: 'Percent: 1–100. Fixed: amount in cents.' },
      { name: 'label', label: 'Label shown to customers' },
      { name: 'max_uses', label: 'Max uses (optional)', type: 'number', min: 1 },
      { name: 'min', label: 'Minimum order in cents (optional)', type: 'number', min: 0 },
      { name: 'ends_at', label: 'Ends on (optional)', type: 'date' },
    ] })
    if (!v) return
    act(supabase.from('discount_codes').insert({
      code: v.code.toUpperCase().trim(), type: v.type, value: v.type === 'free_shipping' ? 0 : Number(v.value) || 0, label: v.label,
      max_uses: v.max_uses ? Number(v.max_uses) : null, min_subtotal_cents: v.min ? Number(v.min) : 0, ends_at: v.ends_at ? `${v.ends_at}T23:59:59` : null,
    }), `Code ${v.code.toUpperCase()} created`)
  }
  const describe = (d) => (d.type === 'percent' ? `${d.value}% off` : d.type === 'fixed' ? `${money(d.value)} off` : 'Free shipping')
  return (
    <>
      <Head title="Discounts" actions={<button className="ad-btn primary" onClick={create}><Ic.plus /> New code</button>} />
      <State q={q} empty="No discount codes yet.">
        <ul className="ad-rows">{q.data?.map((d) => (
          <li key={d.code} className="ad-card ad-code">
            <div><code>{d.code}</code><small>{describe(d)}{d.min_subtotal_cents > 0 && ` · min ${money(d.min_subtotal_cents)}`}{d.ends_at && ` · ends ${new Date(d.ends_at).toLocaleDateString()}`}</small></div>
            <span className="ad-muted">{d.uses}{d.max_uses ? `/${d.max_uses}` : ''} used</span>
            <label className="ad-switch"><input type="checkbox" role="switch" checked={d.active} onChange={() => act(supabase.from('discount_codes').update({ active: !d.active }).eq('code', d.code), `${d.code} ${d.active ? 'paused' : 'activated'}`)} /><span>{d.active ? 'Active' : 'Paused'}</span></label>
            <button className="ad-icon-btn danger" aria-label={`Delete ${d.code}`} onClick={async () => { if (await ask({ title: `Delete ${d.code}?`, ok: 'Delete', danger: true })) act(supabase.from('discount_codes').delete().eq('code', d.code), `${d.code} deleted`) }}><Ic.trash /></button>
          </li>
        ))}</ul>
      </State>
    </>
  )
}

/* ================= reviews ================= */
function Reviews() {
  const { act } = useAdmin()
  const [f, setF] = useState('pending')
  const q = useQuery(() => supabase.from('reviews').select('*, product:products(name)').eq('status', f).order('created_at', { ascending: false }), [f])
  return (
    <>
      <Head title="Reviews" />
      <div className="ad-chips" role="group" aria-label="Filter reviews">{['pending', 'approved', 'rejected'].map((s) => <button key={s} aria-pressed={f === s} onClick={() => setF(s)}>{s[0].toUpperCase() + s.slice(1)}</button>)}</div>
      <State q={q} empty={`No ${f} reviews.`}>
        <ul className="ad-rows">{q.data?.map((r) => (
          <li key={r.id} className="ad-card ad-review-item">
            <p><b>{r.product?.name}</b> <span aria-label={`${r.rating} out of 5`}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span></p>
            {r.title && <h3>{r.title}</h3>}
            <p>{r.body}</p>
            <small className="ad-muted">{when(r.created_at)} · verified buyer</small>
            <div className="ad-row">
              {r.status !== 'approved' && <button className="ad-btn primary" onClick={() => act(supabase.from('reviews').update({ status: 'approved' }).eq('id', r.id), 'Review published')}>Publish</button>}
              {r.status !== 'rejected' && <button className="ad-btn" onClick={() => act(supabase.from('reviews').update({ status: 'rejected' }).eq('id', r.id), 'Review hidden')}>Hide</button>}
              <button className="ad-btn danger" onClick={() => act(supabase.from('reviews').delete().eq('id', r.id), 'Review deleted')}>Delete</button>
            </div>
          </li>
        ))}</ul>
      </State>
    </>
  )
}

/* ================= blocklist ================= */
function Blocklist() {
  const { act, ask } = useAdmin()
  const q = useQuery(() => supabase.from('blocked_contacts').select('*').order('created_at', { ascending: false }), [])
  const add = async () => {
    const v = await ask({ title: 'Block a contact', ok: 'Block', danger: true, fields: [
      { name: 'kind', label: 'Type', type: 'select', options: [['phone', 'Phone (+92…)'], ['email', 'Email'], ['ip', 'IP address']] },
      { name: 'value', label: 'Value', required: true },
      { name: 'reason', label: 'Reason', required: true },
    ] })
    if (v) act(supabase.from('blocked_contacts').insert({ kind: v.kind, value: v.kind === 'email' ? v.value.trim().toLowerCase() : v.value.trim(), reason: v.reason }), `${v.value} blocked`)
  }
  return (
    <>
      <Head title="Blocklist" sub="Blocked phones, emails and IPs can't place orders." actions={<button className="ad-btn primary" onClick={add}><Ic.plus /> Block</button>} />
      <State q={q} empty="Nobody is blocked.">
        <ul className="ad-rows">{q.data?.map((b) => (
          <li key={`${b.kind}:${b.value}`} className="ad-card ad-code">
            <div><b>{b.value}</b><small>{b.kind} · {b.reason} · {when(b.created_at)}</small></div>
            <button className="ad-btn" onClick={() => act(supabase.from('blocked_contacts').delete().eq('kind', b.kind).eq('value', b.value), `${b.value} unblocked`)}>Unblock</button>
          </li>
        ))}</ul>
      </State>
    </>
  )
}

/* ================= subscribers ================= */
function Subscribers() {
  const q = useQuery(() => supabase.from('subscribers').select('*').order('created_at', { ascending: false }), [])
  return (
    <>
      <Head title="Subscribers" sub={q.data ? `${q.data.length} emails` : null} actions={<button className="ad-btn" disabled={!q.data?.length} onClick={() => csv(q.data, 'subscribers.csv')}>Export CSV</button>} />
      <State q={q} empty="No newsletter signups yet.">
        <ul className="ad-card ad-list">{q.data?.map((s) => <li key={s.email}><span>{s.email}</span><small className="ad-muted">{when(s.created_at)}</small></li>)}</ul>
      </State>
    </>
  )
}

/* ================= settings ================= */
function Settings() {
  const { act } = useAdmin()
  const q = useQuery(() => supabase.rpc('admin_settings'), [])
  const s = q.data
  const save = (e) => {
    e.preventDefault()
    const f = Object.fromEntries(new FormData(e.currentTarget))
    const cents = (v) => Math.round(Number(v || 0) * 100)
    act(supabase.from('settings').update({
      currency: f.currency.trim().toUpperCase() || 'USD',
      free_ship_threshold_cents: cents(f.free_ship), shipping_flat_cents: cents(f.flat_ship),
      tax_rate: Number(f.tax || 0) / 100, low_stock_threshold: Number(f.low || 0),
      bank_transfer_enabled: !!f.bank_on, cod_enabled: !!f.cod_on, cod_max_total_cents: f.cod_max ? cents(f.cod_max) : null,
      unpaid_expiry_hours: Number(f.unpaid_h) || 48, cod_confirm_expiry_hours: Number(f.cod_h) || 24,
      announcements: f.announcements.split('\n').map((x) => x.trim()).filter(Boolean),
      bank_details: { bank: f.bank, account_title: f.account_title, account_number: f.account_number, iban: f.iban, instructions: f.instructions },
    }).eq('id', true), 'Settings saved')
  }
  return (
    <>
      <Head title="Settings" />
      <State q={q}>
        {s && (
          <form className="ad-stack ad-narrow" onSubmit={save}>
            <section className="ad-card ad-form"><h2>Payments</h2>
              <Field name="bank_on" label="Accept bank transfer" type="checkbox" defaultValue={s.bank_transfer_enabled} />
              <div className="ad-grid2">
                <Field name="bank" label="Bank name" defaultValue={s.bank_details?.bank} />
                <Field name="account_title" label="Account title" defaultValue={s.bank_details?.account_title} />
                <Field name="account_number" label="Account number" defaultValue={s.bank_details?.account_number} inputMode="numeric" />
                <Field name="iban" label="IBAN" defaultValue={s.bank_details?.iban} />
              </div>
              <Field name="instructions" label="Instructions shown to customers" type="textarea" defaultValue={s.bank_details?.instructions} />
              <Field name="cod_on" label="Accept cash on delivery" type="checkbox" defaultValue={s.cod_enabled} />
              <Field name="cod_max" label="COD limit per order (blank = no limit)" type="number" min="0" step="0.01" defaultValue={s.cod_max_total_cents != null ? s.cod_max_total_cents / 100 : ''} />
            </section>
            <section className="ad-card ad-form"><h2>Order windows</h2>
              <div className="ad-grid2">
                <Field name="unpaid_h" label="Cancel unpaid transfers after (hours)" type="number" min="1" defaultValue={s.unpaid_expiry_hours} />
                <Field name="cod_h" label="Cancel unconfirmed COD after (hours)" type="number" min="1" defaultValue={s.cod_confirm_expiry_hours} />
              </div>
            </section>
            <section className="ad-card ad-form"><h2>Pricing</h2>
              <div className="ad-grid2">
                <Field name="currency" label="Currency code" defaultValue={s.currency} maxLength={3} hint="e.g. USD, PKR" />
                <Field name="tax" label="Tax rate (%)" type="number" min="0" max="100" step="0.01" defaultValue={Number(s.tax_rate) * 100} />
                <Field name="free_ship" label="Free shipping from" type="number" min="0" step="0.01" defaultValue={s.free_ship_threshold_cents / 100} />
                <Field name="flat_ship" label="Flat shipping" type="number" min="0" step="0.01" defaultValue={s.shipping_flat_cents / 100} />
                <Field name="low" label="Low-stock warning below" type="number" min="0" defaultValue={s.low_stock_threshold} />
              </div>
            </section>
            <section className="ad-card ad-form"><h2>Announcement bar</h2>
              <Field name="announcements" label="One message per line" type="textarea" rows={4} defaultValue={(s.announcements || []).join('\n')} />
            </section>
            <div className="ad-save-bar"><button className="ad-btn primary full">Save settings</button></div>
          </form>
        )}
      </State>
    </>
  )
}
