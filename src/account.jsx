import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { supabase, useAuth, api, Tin, PageHero } from './components'
import { products, settings } from './data'
import { UI } from './art'

export const cents = (c, cur = settings.currency) => ((c ?? 0) / 100).toLocaleString(undefined, { style: 'currency', currency: cur || 'USD' })
const when = (d) => new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
export const STATUS_TEXT = {
  awaiting_payment: ['Waiting for your payment', 'Transfer the total to the account below, then upload a screenshot of the transfer.'],
  payment_review: ['Checking your payment', 'We’ve got your screenshot. We confirm payments within a few hours during business hours.'],
  awaiting_confirmation: ['Please confirm your order', 'This is a cash-on-delivery order. Tap confirm and we’ll start packing.'],
  confirmed: ['Order confirmed', 'We’re getting your tins ready.'],
  packed: ['Packed', 'Your order is packed and waiting for the courier.'],
  dispatched: ['On its way', 'Your order is with the courier.'],
  delivered: ['Delivered', 'Enjoy! We’d love to hear what you think.'],
  cancelled: ['Cancelled', 'This order was cancelled. Any held stock has been released.'],
  returned: ['Returned', 'This order was returned.'],
}
const strongPw = (p) => p.length >= 10 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p)
export const PW_HINT = 'At least 10 characters, with a lowercase letter, an uppercase letter and a number.'
const authMsg = (e) => (/invalid login/i.test(e.message) ? 'Wrong email or password.' : /already registered/i.test(e.message) ? 'An account with this email already exists — sign in instead.' : e.message)

/* ================= ACCOUNT ================= */
export function Account() {
  const { session, user, signOut } = useAuth()
  const [params] = useSearchParams()
  const { hash } = useLocation()
  const recovery = hash.includes('type=recovery')
  if (session === undefined) return <section className="sec center"><p>Loading…</p></section>
  if (!user) return <AuthForms defaultTab={params.get('tab') || 'signin'} email={params.get('email') || ''} next={params.get('next')} />
  if (recovery) return <SetPassword />
  return <Dashboard user={user} signOut={signOut} />
}

export function AuthForms({ defaultTab = 'signin', email: email0 = '', next, compact, onDone }) {
  const [tab, setTab] = useState(defaultTab)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const navigate = useNavigate()
  const go = () => (onDone ? onDone() : navigate(next || '/account'))
  const submit = async (e) => {
    e.preventDefault()
    const f = Object.fromEntries(new FormData(e.currentTarget))
    setErr(''); setBusy(true)
    try {
      if (tab === 'signup') {
        if (!strongPw(f.password)) throw new Error(PW_HINT)
        const { data, error } = await supabase.auth.signUp({ email: f.email.trim(), password: f.password, options: { data: { full_name: f.name.trim(), phone: f.phone?.trim() || null } } })
        if (error) throw error
        if (!data.session) { setSent(true); return } // email confirmation is on
        if (f.phone?.trim()) await supabase.from('profiles').update({ full_name: f.name.trim(), phone: normalizeLocalPhone(f.phone) }).eq('id', data.user.id)
      } else if (tab === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(f.email.trim(), { redirectTo: `${location.origin}/account` })
        if (error) throw error
        setSent(true); return
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: f.email.trim(), password: f.password })
        if (error) throw error
      }
      go()
    } catch (er) { setErr(authMsg(er)) } finally { setBusy(false) }
  }
  if (sent) return <section className={compact ? 'auth-compact' : 'sec narrow'}><p className="notice">Check your inbox — we’ve sent you a link to continue.</p></section>
  return (
    <section className={compact ? 'auth-compact' : 'sec narrow auth'}>
      {!compact && <h1>{tab === 'signup' ? 'Create your account' : tab === 'reset' ? 'Reset your password' : 'Sign in'}</h1>}
      <div className="auth-tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'signin'} onClick={() => setTab('signin')}>Sign in</button>
        <button role="tab" aria-selected={tab === 'signup'} onClick={() => setTab('signup')}>Create account</button>
      </div>
      <form onSubmit={submit} className="auth-form" noValidate>
        {tab === 'signup' && <label className="field">Full name<input name="name" required autoComplete="name" maxLength={120} /></label>}
        {tab === 'signup' && <label className="field">Phone <small>(for delivery updates)</small><input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0300 1234567" /></label>}
        <label className="field">Email<input name="email" type="email" required autoComplete="email" defaultValue={email0} /></label>
        {tab !== 'reset' && <label className="field">Password<input name="password" type="password" required minLength={tab === 'signup' ? 10 : 1} autoComplete={tab === 'signup' ? 'new-password' : 'current-password'} />{tab === 'signup' && <small>{PW_HINT}</small>}</label>}
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn full" disabled={busy}>{busy ? 'Please wait…' : tab === 'signup' ? 'Create account' : tab === 'reset' ? 'Send reset link' : 'Sign in'}</button>
        {tab === 'signin' && <button type="button" className="link small" onClick={() => setTab('reset')}>Forgot password?</button>}
        {tab === 'reset' && <button type="button" className="link small" onClick={() => setTab('signin')}>Back to sign in</button>}
        {tab === 'signup' && <p className="fine left">Account holders get 10% off their first order with code <b>WELCOME10</b> and can track every order here.</p>}
      </form>
    </section>
  )
}

export const normalizeLocalPhone = (raw) => {
  const d = String(raw || '').replace(/[\s()-]/g, '')
  if (/^0\d{10}$/.test(d)) return '+92' + d.slice(1)
  if (/^92\d{10}$/.test(d)) return '+' + d
  return /^\+[1-9][0-9]{6,14}$/.test(d) ? d : null
}

function SetPassword() {
  const [err, setErr] = useState('')
  const navigate = useNavigate()
  const submit = async (e) => {
    e.preventDefault()
    const { password, confirm } = Object.fromEntries(new FormData(e.currentTarget))
    if (!strongPw(password)) return setErr(PW_HINT)
    if (password !== confirm) return setErr('The two passwords don’t match.')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setErr(error.message); else navigate('/account', { replace: true })
  }
  return (
    <section className="sec narrow auth"><h1>Choose a new password</h1>
      <form onSubmit={submit} className="auth-form">
        <label className="field">New password<input name="password" type="password" required minLength={10} autoComplete="new-password" autoFocus /><small>{PW_HINT}</small></label>
        <label className="field">Repeat password<input name="confirm" type="password" required minLength={10} autoComplete="new-password" /></label>
        {err && <p className="err" role="alert">{err}</p>}
        <button className="btn full">Save password</button>
      </form>
    </section>
  )
}

function Dashboard({ user, signOut }) {
  const [profile, setProfile] = useState(null)
  const [orders, setOrders] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [saved, setSaved] = useState('')
  useEffect(() => {
    supabase.from('profiles').select('full_name, phone, marketing_opt_in').eq('id', user.id).maybeSingle().then(({ data }) => setProfile(data || {}))
    supabase.from('orders').select('id, number, status, payment_method, payment_status, total_cents, currency, created_at, order_items(name, quantity)').order('created_at', { ascending: false }).then(({ data }) => setOrders(data || []))
    supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle().then(({ data }) => setIsAdmin(!!data))
  }, [user.id])
  const save = async (e) => {
    e.preventDefault()
    const f = Object.fromEntries(new FormData(e.currentTarget))
    const phone = f.phone.trim() ? normalizeLocalPhone(f.phone) : null
    if (f.phone.trim() && !phone) return setSaved('Enter a valid phone number, e.g. 0300 1234567')
    const { error } = await supabase.from('profiles').update({ full_name: f.name.trim(), phone, marketing_opt_in: !!f.marketing }).eq('id', user.id)
    setSaved(error ? error.message : 'Saved')
  }
  return (
    <>
      <PageHero title={`Hi${profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}!`} blurb={user.email} />
      <section className="sec account">
        <div className="acct-main">
          <h2>Your orders</h2>
          {!orders ? <p>Loading…</p> : !orders.length ? <div className="empty"><p>No orders yet.</p><Link className="btn" to="/collections/best-sellers">Shop best sellers</Link></div> : (
            <ul className="acct-orders">{orders.map((o) => (
              <li key={o.id}><Link to={`/order?id=${o.id}`}>
                <span className="ao-num">#{o.number}</span>
                <span className="ao-items">{o.order_items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}</span>
                <span className={`ao-status s-${o.status}`}>{STATUS_TEXT[o.status]?.[0] || o.status}</span>
                <b>{cents(o.total_cents, o.currency)}</b>
                <small>{when(o.created_at)} · {o.payment_method === 'cod' ? 'Cash on delivery' : 'Bank transfer'}</small>
              </Link></li>
            ))}</ul>
          )}
        </div>
        <aside className="acct-side">
          <h2>Your details</h2>
          {profile && (
            <form onSubmit={save} className="auth-form">
              <label className="field">Full name<input name="name" defaultValue={profile.full_name || ''} maxLength={120} /></label>
              <label className="field">Phone<input name="phone" type="tel" inputMode="tel" defaultValue={profile.phone || ''} placeholder="0300 1234567" /></label>
              <label className="check"><input type="checkbox" name="marketing" defaultChecked={profile.marketing_opt_in} /> Email me about new tins and offers</label>
              <button className="btn sm">Save</button>
              {saved && <p className="fine left" role="status">{saved}</p>}
            </form>
          )}
          {isAdmin && <Link className="btn ghost full" to="/admin">Open admin panel</Link>}
          <button className="link small" onClick={signOut}>Sign out</button>
        </aside>
      </section>
    </>
  )
}

/* ================= ORDER PAGE (guest link or signed-in owner) ================= */
export function OrderPage() {
  const [params] = useSearchParams()
  const t = params.get('t'), id = params.get('id')
  const { session } = useAuth()
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState('')
  const fileRef = useRef()
  const load = () => api(`order?${t ? `t=${encodeURIComponent(t)}` : `id=${encodeURIComponent(id || '')}`}`).then(setData).catch((e) => setErr(e.message))
  useEffect(() => { if (t || (id && session)) load() }, [t, id, session]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!t && !id) return <section className="sec center"><h1>Order not found</h1><Link className="btn" to="/home">Home</Link></section>
  if (!t && session === null) return <section className="sec center"><h1>Sign in to see this order</h1><Link className="btn" to={`/account?next=${encodeURIComponent(`/order?id=${id}`)}`}>Sign in</Link></section>
  if (err) return <section className="sec center"><h1>We couldn’t find that order</h1><p>{err}</p><Link className="btn" to="/home">Home</Link></section>
  if (!data) return <section className="sec center"><p>Loading your order…</p></section>
  const { order: o, items, proofs, bank_details: bank } = data
  const ref = { t, id }
  const [title, blurb] = STATUS_TEXT[o.status] || [o.status, '']
  const act = async (name, fn) => { setBusy(name); setErr(''); try { await fn(); await load() } catch (e) { setErr(e.message) } finally { setBusy('') } }
  const upload = (file) => act('upload', async () => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) throw new Error('The file must be 5MB or smaller')
    const start = await api('proof', { ...ref, step: 'start', type: file.type })
    const up = await supabase.storage.from('payment-proofs').uploadToSignedUrl(start.path, start.token, file, { contentType: file.type })
    if (up.error) throw new Error('Upload failed. Please try again.')
    await api('proof', { ...ref, step: 'done', path: start.path })
  })
  const steps = o.payment_method === 'cod' ? ['awaiting_confirmation', 'confirmed', 'dispatched', 'delivered'] : ['awaiting_payment', 'payment_review', 'confirmed', 'dispatched', 'delivered']
  const idx = steps.indexOf(o.status === 'packed' ? 'confirmed' : o.status)
  const rejected = proofs.filter((p) => p.status === 'rejected').slice(-1)[0]
  return (
    <article className="order-page">
      <header className="op-head">
        <p className="eyebrow">Order #{o.number} · {when(o.created_at)}</p>
        <h1>{title}</h1>
        <p className="op-blurb">{blurb}</p>
        {!['cancelled', 'returned'].includes(o.status) && (
          <ol className="op-steps" aria-label="Order progress">{steps.map((s, i) => <li key={s} className={i < idx ? 'done' : i === idx ? 'now' : ''} aria-current={i === idx ? 'step' : undefined}>{STATUS_TEXT[s][0]}</li>)}</ol>
        )}
      </header>

      {o.status === 'awaiting_payment' && bank && (
        <section className="op-card op-bank">
          <h2>1. Transfer {cents(o.total_cents, o.currency)}</h2>
          {rejected && <p className="err" role="alert">Your last screenshot was not accepted: {rejected.reject_reason}. Please upload a new one.</p>}
          <dl className="bank">
            {bank.bank && <div><dt>Bank</dt><dd>{bank.bank}</dd></div>}
            {bank.account_title && <div><dt>Account title</dt><dd>{bank.account_title}</dd></div>}
            {bank.account_number && <div><dt>Account number</dt><dd><code>{bank.account_number}</code></dd></div>}
            {bank.iban && <div><dt>IBAN</dt><dd><code>{bank.iban}</code></dd></div>}
            <div><dt>Reference</dt><dd><code>#{o.number}</code> <small>(write this in the transfer note)</small></dd></div>
          </dl>
          {bank.instructions && <p className="fine left">{bank.instructions}</p>}
          <h2>2. Upload the screenshot</h2>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only" onChange={(e) => upload(e.target.files[0])} />
          <button className="btn full" disabled={busy === 'upload'} onClick={() => fileRef.current.click()}><UI.card className="inl" /> {busy === 'upload' ? 'Uploading…' : 'Upload payment screenshot'}</button>
          {o.expires_at && <p className="fine left">Please pay by {when(o.expires_at)} — unpaid orders are cancelled after that.</p>}
        </section>
      )}
      {o.status === 'awaiting_confirmation' && (
        <section className="op-card">
          <h2>Confirm cash on delivery</h2>
          <p>You’ll pay <b>{cents(o.total_cents, o.currency)}</b> in cash when the courier arrives{o.phone && <> — we’ll call <b>{o.phone}</b> if we need to reach you</>}.</p>
          <div className="buy"><button className="btn full" disabled={!!busy} onClick={() => act('yes', () => api('respond', { ...ref, confirm: true }))}><UI.check className="inl" /> Yes, send my order</button><button className="btn ghost full" disabled={!!busy} onClick={() => confirm('Cancel this order?') && act('no', () => api('respond', { ...ref, confirm: false }))}>No, cancel it</button></div>
          {o.expires_at && <p className="fine left">Unconfirmed orders are cancelled automatically after {when(o.expires_at)}.</p>}
        </section>
      )}
      {o.status === 'payment_review' && <section className="op-card"><p>Screenshot received {when(proofs.filter((p) => p.status === 'pending')[0]?.created_at || o.updated_at)}. We’ll email you as soon as it’s approved.</p></section>}
      {o.status === 'dispatched' && (o.courier || o.tracking_number) && <section className="op-card"><h2>Tracking</h2><p>{o.courier}{o.tracking_number && <> · <code>{o.tracking_number}</code></>}</p></section>}
      {err && <p className="err" role="alert">{err}</p>}

      <section className="op-card">
        <h2>Items</h2>
        <ul className="op-items">{items.map((i) => <li key={i.id}><span className="op-img"><Tin p={products.find((p) => p.id === i.product_id) || { tin: ['#fdcd62', '#73c3f5'] }} label={null} /></span><span>{i.name}<small>{i.variant_title} · {cents(i.unit_price_cents, o.currency)} × {i.quantity}</small></span><b>{cents(i.unit_price_cents * i.quantity, o.currency)}</b></li>)}</ul>
        <dl className="co-totals">
          <div><dt>Subtotal</dt><dd>{cents(o.subtotal_cents, o.currency)}</dd></div>
          {o.discount_cents > 0 && <div><dt>Discount {o.discount_code}</dt><dd>−{cents(o.discount_cents, o.currency)}</dd></div>}
          <div><dt>Shipping</dt><dd>{o.shipping_cents ? cents(o.shipping_cents, o.currency) : 'Free'}</dd></div>
          <div><dt>Tax</dt><dd>{cents(o.tax_cents, o.currency)}</dd></div>
          <div className="total"><dt>Total</dt><dd>{cents(o.total_cents, o.currency)}</dd></div>
        </dl>
        <p className="fine left">Delivering to {o.shipping_address?.name}, {[o.shipping_address?.line1, o.shipping_address?.city].filter(Boolean).join(', ')}{o.gift_note && <> · Gift note: “{o.gift_note}”</>}</p>
      </section>

      {t && !session && (
        <section className="op-card op-save">
          <h2>Keep track of this order</h2>
          <p>This page is private to you — bookmark it. Or create an account with <b>{o.email}</b> and every order will show up under <Link to="/account">Your account</Link>.</p>
          <Link className="btn sm" to={`/account?tab=signup&email=${encodeURIComponent(o.email)}&next=${encodeURIComponent(`/order?t=${t}`)}`}>Create account</Link>
        </section>
      )}
      <p className="center"><Link className="link" to="/collections/all">Continue shopping</Link></p>
    </article>
  )
}
