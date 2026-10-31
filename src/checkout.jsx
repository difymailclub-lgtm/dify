import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BRAND, money, settings } from './data'
import { useCart, useAuth, api, supabase, CartLine, Upsells, ShipBar, Tin, PageHero } from './components'
import { AuthForms, PW_HINT, normalizeLocalPhone } from './account'
import { bySlug } from './data'
import { UI } from './art'

/* ================= CART PAGE ================= */
export function CartPage() {
  const { lines, subtotal, savings, note, setNote } = useCart()
  const navigate = useNavigate()
  if (!lines.length) return (
    <section className="sec center"><h1>Your cart is empty</h1><p>Time to add some tins!</p><Link className="btn" to="/collections/best-sellers">Shop Best Sellers</Link></section>
  )
  return (
    <>
      <PageHero title="Your Cart" />
      <section className="sec cart-page">
        <div>
          <ShipBar subtotal={subtotal} />
          <div className="cart-lines">{lines.map((l) => <CartLine key={l.id} l={l} />)}</div>
          <label className="field">Gift note (optional)
            <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={250} placeholder="We'll print it on a card inside the box." />
          </label>
        </div>
        <aside className="summary-card">
          <h2>Order Summary</h2>
          {savings > 0 && <div className="row save"><span>Pack savings</span><b>−{money(savings)}</b></div>}
          <div className="row"><span>Subtotal</span><b>{money(subtotal)}</b></div>
          <p className="fine left">Shipping, tax and discount codes are applied at checkout.</p>
          <button className="btn full" onClick={() => navigate('/checkout')}>Checkout</button>
          <ul className="trust"><li><UI.card /> Bank transfer or cash on delivery</li><li><UI.back /> 30-day happiness promise</li><li><UI.truck /> Ships in 2 business days</li></ul>
          <Upsells max={3} />
        </aside>
      </section>
    </>
  )
}

/* ================= CHECKOUT ================= */
const STEPS = ['Details', 'Payment', 'Review']
const blank = { email: '', name: '', phone: '', line1: '', line2: '', city: '', region: '', postal_code: '', country: 'PK', news: true, whatsapp: true }
const COUNTRIES = [['PK', 'Pakistan'], ['AE', 'United Arab Emirates'], ['GB', 'United Kingdom'], ['US', 'United States'], ['SA', 'Saudi Arabia'], ['CA', 'Canada'], ['AU', 'Australia']]
const newKey = () => `ck-${crypto.randomUUID()}`
const sessionGet = (k) => { try { return sessionStorage.getItem(k) } catch { return null } }
const sessionSet = (k, v) => { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v) } catch { /* unavailable */ } }

export function Checkout() {
  const cart = useCart()
  const { user } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const lines = params.get('buy') && cart.buyNow ? cart.buyNow : cart.lines
  const [step, setStep] = useState(0)
  const [info, setInfo] = useState(() => ({ ...blank, ...(JSON.parse(sessionGet('checkout-info') || 'null') || {}) }))
  const [errors, setErrors] = useState({})
  const [method, setMethod] = useState(settings.codOn ? 'cod' : 'bank_transfer')
  const [code, setCode] = useState(cart.code || '')
  const [account, setAccount] = useState(false)
  const [password, setPassword] = useState('')
  const [placing, setPlacing] = useState(false)
  const [serverErr, setServerErr] = useState('')
  const [showSummary, setShowSummary] = useState(false)
  // one key per checkout attempt: a double click, retry or refresh returns the same order instead of a second one
  const key = useMemo(() => { const k = sessionGet('checkout-key') || newKey(); sessionSet('checkout-key', k); return k }, [])

  useEffect(() => { sessionSet('checkout-info', JSON.stringify(info)) }, [info])
  useEffect(() => { if (user && !info.email) setInfo((i) => ({ ...i, email: user.email, name: i.name || user.user_metadata?.full_name || '' })) }, [user]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { // prefill from the saved profile / last order for signed-in customers
    if (!user) return
    supabase.from('profiles').select('full_name, phone').eq('id', user.id).maybeSingle().then(({ data }) => data && setInfo((i) => ({ ...i, name: i.name || data.full_name || '', phone: i.phone || data.phone || '' })))
    supabase.from('orders').select('shipping_address, phone').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle().then(({ data }) => {
      if (!data) return
      const a = data.shipping_address || {}
      setInfo((i) => ({ ...i, line1: i.line1 || a.line1 || '', line2: i.line2 || a.line2 || '', city: i.city || a.city || '', region: i.region || a.region || '', postal_code: i.postal_code || a.postal_code || '', country: a.country || i.country, phone: i.phone || data.phone || '' }))
    })
  }, [user])

  const subtotal = lines.reduce((s, l) => s + l.unit * l.q, 0)
  const shipCost = subtotal >= settings.freeShip ? 0 : settings.shipFlat
  const tax = Math.round(subtotal * settings.taxRate * 100) / 100
  const estimate = subtotal + shipCost + tax
  const codBlocked = settings.codMax != null && estimate > settings.codMax
  if (!lines.length) return <section className="sec center"><h1>Nothing to check out</h1><Link className="btn" to="/collections/all">Continue Shopping</Link></section>

  const req = { email: 'Enter your email', name: 'Enter your full name', line1: 'Enter your street address', city: 'Enter your city' }
  const set = (k) => (e) => setInfo({ ...info, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const validate = () => {
    const e = {}
    Object.entries(req).forEach(([k, m]) => { if (!String(info[k]).trim()) e[k] = m })
    if (info.email && !/^\S+@\S+\.\S+$/.test(info.email)) e.email = 'Enter a valid email'
    if (info.phone.trim() && !normalizeLocalPhone(info.phone)) e.phone = 'Enter a valid phone number, e.g. 0300 1234567'
    if (method === 'cod' && !info.phone.trim()) e.phone = 'A phone number is required for cash on delivery'
    if (account && !user && password.length > 0 && !(password.length >= 10 && /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password))) e.password = PW_HINT
    if (account && !user && !password) e.password = 'Choose a password for your new account'
    setErrors(e)
    return !Object.keys(e).length
  }
  const next = () => { if (step === 0 && !validate()) { setTimeout(() => document.querySelector('.err-summary')?.focus()); return } setServerErr(''); setStep(step + 1) }
  const place = async () => {
    if (placing) return
    if (!validate()) { setStep(0); return }
    setPlacing(true); setServerErr('')
    try {
      if (account && !user) {
        const { data, error } = await supabase.auth.signUp({ email: info.email.trim(), password, options: { data: { full_name: info.name.trim() } } })
        if (error) throw new Error(/already registered/i.test(error.message) ? 'An account with this email already exists. Sign in first, or untick “Create an account”.' : error.message)
        if (data.user && info.phone.trim()) await supabase.from('profiles').update({ full_name: info.name.trim(), phone: normalizeLocalPhone(info.phone) }).eq('id', data.user.id)
      }
      const res = await api('checkout', {
        key, method, email: info.email.trim(), phone: info.phone.trim() || null, code: code.trim() || null, gift_note: cart.note || null,
        marketing: !!info.news, whatsapp: !!info.whatsapp && !!info.phone.trim(),
        address: { name: info.name, line1: info.line1, line2: info.line2, city: info.city, region: info.region, postal_code: info.postal_code, country: info.country },
        items: lines.map((l) => ({ sku: l.sku, quantity: l.q })),
      })
      sessionSet('checkout-key', null)
      if (lines === cart.lines) cart.clear(); else cart.setBuyNow(null)
      navigate(res.token ? `/order?t=${encodeURIComponent(res.token)}` : `/order?id=${res.id}`, { replace: true })
    } catch (e) {
      setServerErr(e.message)
      if (/code/i.test(e.message)) setStep(1)
    } finally { setPlacing(false) }
  }

  const field = (k, label, props = {}) => (
    <div className={`field ${props.half ? 'half' : ''}`}>
      <label htmlFor={`f-${k}`}>{label}{(req[k] || (k === 'phone' && method === 'cod')) && <span aria-hidden> *</span>}</label>
      <input id={`f-${k}`} value={info[k]} onChange={set(k)} aria-invalid={!!errors[k]} aria-describedby={errors[k] ? `e-${k}` : props.hint ? `h-${k}` : undefined} autoComplete={props.ac} type={props.type || 'text'} inputMode={props.im} placeholder={props.ph} />
      {props.hint && !errors[k] && <small id={`h-${k}`} className="hint">{props.hint}</small>}
      {errors[k] && <p className="err" id={`e-${k}`}>{errors[k]}</p>}
    </div>
  )
  const Summary = (
    <div className="co-summary-in">
      {lines.map((l) => (
        <div key={l.id} className="co-line">
          <div className="co-img"><Tin p={bySlug(l.slug)} label={null} /><em>{l.q}</em></div>
          <div><b>{l.name}</b>{l.label && <small>{l.label}</small>}</div>
          <span>{money(l.unit * l.q)}</span>
        </div>
      ))}
      <div className="row"><span>Subtotal</span><span>{money(subtotal)}</span></div>
      <div className="row"><span>Shipping</span><span>{shipCost ? money(shipCost) : 'FREE'}</span></div>
      <div className="row"><span>Estimated tax</span><span>{money(tax)}</span></div>
      {code.trim() && <div className="row save"><span>Code {code.trim().toUpperCase()}</span><span>applied when you place the order</span></div>}
      <div className="row total"><span>Total</span><b>{settings.currency} {money(estimate)}</b></div>
    </div>
  )

  return (
    <div className="checkout">
      <div className="co-main">
        <Link to="/home" className="logo"><span>{BRAND}</span></Link>
        <nav className="co-steps" aria-label="Checkout steps">
          <ol><li><Link to="/cart">Cart</Link></li>{STEPS.map((s, i) => <li key={s} aria-current={i === step ? 'step' : undefined}>{i < step ? <button onClick={() => setStep(i)}>{s}</button> : <span>{s}</span>}</li>)}</ol>
        </nav>
        <button className="co-toggle" onClick={() => setShowSummary(!showSummary)} aria-expanded={showSummary} aria-controls="co-summary-m">{showSummary ? 'Hide' : 'Show'} order summary <b>{money(estimate)}</b></button>
        {showSummary && <div id="co-summary-m" className="co-summary mobile">{Summary}</div>}
        <h1 className="co-h">{STEPS[step]}</h1>

        {step === 0 && (
          <form onSubmit={(e) => { e.preventDefault(); next() }} noValidate>
            {!!Object.keys(errors).length && (
              <div className="err-summary" tabIndex={-1} role="alert"><b>Please fix {Object.keys(errors).length} {Object.keys(errors).length === 1 ? 'field' : 'fields'}:</b>
                <ul>{Object.entries(errors).map(([k, m]) => <li key={k}><a href={`#f-${k}`}>{m}</a></li>)}</ul></div>
            )}
            {!user && (
              <div className="co-signin">
                <p>Have an account? <button type="button" className="link" onClick={() => setAccount('signin')}>Sign in</button> for faster checkout.</p>
                {account === 'signin' && <AuthForms compact defaultTab="signin" email={info.email} onDone={() => setAccount(false)} />}
              </div>
            )}
            {user && <p className="notice">Signed in as <b>{user.email}</b>. <Link to="/account">Not you?</Link></p>}
            <h2>Contact</h2>
            {field('email', 'Email', { type: 'email', ac: 'email' })}
            {field('phone', 'Phone', { type: 'tel', ac: 'tel', im: 'tel', ph: '0300 1234567', hint: method === 'cod' ? 'Required for cash on delivery so the courier can reach you.' : 'Optional. We’ll only call about this order.' })}
            {!!info.phone.trim() && <label className="check"><input type="checkbox" checked={info.whatsapp} onChange={set('whatsapp')} /> Send order updates on WhatsApp</label>}
            <label className="check"><input type="checkbox" checked={info.news} onChange={set('news')} /> Email me about new tins and offers</label>
            <h2>Shipping address</h2>
            <div className="fields">
              {field('name', 'Full name', { ac: 'name' })}
              {field('line1', 'Street address', { ac: 'address-line1' })}
              {field('line2', 'Apartment, floor, landmark (optional)', { ac: 'address-line2' })}
              {field('city', 'City', { half: true, ac: 'address-level2' })}
              {field('region', 'Province / state', { half: true, ac: 'address-level1' })}
              {field('postal_code', 'Postal code (optional)', { half: true, ac: 'postal-code' })}
              <div className="field half"><label htmlFor="f-country">Country</label><select id="f-country" value={info.country} onChange={set('country')} autoComplete="country">{COUNTRIES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select></div>
            </div>
            {!user && (
              <div className="co-account">
                <label className="check"><input type="checkbox" checked={account === true} onChange={(e) => setAccount(e.target.checked)} /> <span><b>Create an account</b> <small>— track this order, reorder in one tap, and unlock 10% off your first order with code WELCOME10.</small></span></label>
                {account === true && (
                  <div className="field"><label htmlFor="f-password">Choose a password</label>
                    <input id="f-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" aria-invalid={!!errors.password} aria-describedby="h-password" />
                    <small id="h-password" className={errors.password ? 'err' : 'hint'}>{errors.password || PW_HINT}</small>
                  </div>
                )}
              </div>
            )}
            <div className="co-nav"><Link to="/cart">‹ Return to cart</Link><button className="btn">Continue to payment</button></div>
          </form>
        )}

        {step === 1 && (
          <>
            <Review info={info} setStep={setStep} />
            <fieldset className="radios"><legend><h2>How would you like to pay?</h2></legend>
              {settings.codOn && (
                <label className={`pay-opt ${method === 'cod' ? 'on' : ''} ${codBlocked ? 'off' : ''}`}><input type="radio" name="pay" disabled={codBlocked} checked={method === 'cod'} onChange={() => setMethod('cod')} />
                  <span><b>Cash on delivery</b><small>{codBlocked ? `Available for orders up to ${money(settings.codMax)}.` : 'Pay the courier in cash. We’ll ask you to confirm the order first.'}</small></span></label>
              )}
              {settings.bankOn && (
                <label className={`pay-opt ${method === 'bank_transfer' ? 'on' : ''}`}><input type="radio" name="pay" checked={method === 'bank_transfer'} onChange={() => setMethod('bank_transfer')} />
                  <span><b>Bank transfer</b><small>We show you the account details next. Upload a screenshot of the transfer and we confirm it within a few hours.</small></span></label>
              )}
            </fieldset>
            {method === 'cod' && !info.phone.trim() && <p className="err">Cash on delivery needs a phone number. <button className="link" onClick={() => setStep(0)}>Add one</button></p>}
            <div className="field"><label htmlFor="code">Discount code (optional)</label><input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder={user ? 'e.g. WELCOME10' : 'First-order codes need an account'} autoCapitalize="characters" /></div>
            {serverErr && <p className="err" role="alert">{serverErr}</p>}
            <div className="co-nav"><button className="link" onClick={() => setStep(0)}>‹ Back to details</button><button className="btn" onClick={() => (method === 'cod' && !info.phone.trim() ? setStep(0) : next())}>Review order</button></div>
          </>
        )}

        {step === 2 && (
          <>
            <Review info={info} setStep={setStep} method={method} />
            <div className="co-summary mobile always">{Summary}</div>
            {serverErr && <p className="err" role="alert">{serverErr}</p>}
            <p className="fine left">{method === 'cod' ? 'Nothing to pay now. Confirm the order on the next page and pay the courier in cash.' : 'Nothing is charged automatically. You’ll see the bank details on the next page.'}</p>
            <div className="co-nav"><button className="link" onClick={() => setStep(1)}>‹ Back to payment</button><button className="btn" onClick={place} disabled={placing} aria-busy={placing}>{placing ? 'Placing order…' : `Place order · ${money(estimate)}`}</button></div>
          </>
        )}
        <footer className="co-foot"><Link to="/pages/terms">Terms</Link><Link to="/pages/privacy">Privacy</Link><Link to="/pages/faq">Shipping & returns</Link></footer>
      </div>
      <aside className="co-summary desktop" aria-label="Order summary">{Summary}</aside>
    </div>
  )
}

function Review({ info, setStep, method }) {
  return (
    <dl className="co-review">
      <div><dt>Contact</dt><dd>{info.email}{info.phone && <> · {info.phone}</>}</dd><button className="link" onClick={() => setStep(0)}>Change<span className="sr-only"> contact</span></button></div>
      <div><dt>Ship to</dt><dd>{[info.name, info.line1, info.line2, info.city, info.region, info.postal_code].filter(Boolean).join(', ')}</dd><button className="link" onClick={() => setStep(0)}>Change<span className="sr-only"> address</span></button></div>
      {method && <div><dt>Payment</dt><dd>{method === 'cod' ? 'Cash on delivery' : 'Bank transfer'}</dd><button className="link" onClick={() => setStep(1)}>Change<span className="sr-only"> payment</span></button></div>}
    </dl>
  )
}

