import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { BRAND, codes, shipping, totals, money, orders, products, commit, bySlug } from './data'
import { UI } from './art'
import { useCart, CartLine, Upsells, ShipBar, PayIn4, Tin, PageHero } from './components'

/* ================= CART PAGE ================= */
export function CartPage() {
  const { lines, subtotal, savings, note, setNote } = useCart()
  const navigate = useNavigate()
  if (!lines.length) return (
    <section className="sec center"><h1>Your cart is empty</h1><p>Time to add some tins!</p><Link className="btn" to="/collections/best-sellers">Shop Best Sellers</Link></section>
  )
  return (
    <>
      <PageHero title="Your Cart" bg="#fdcd62" />
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
          {savings > 0 && <div className="row save"><span>Bundle & subscription savings</span><b>−{money(savings)}</b></div>}
          <div className="row"><span>Subtotal</span><b>{money(subtotal)}</b></div>
          <p className="fine left">Shipping, taxes and discount codes calculated at checkout.</p>
          <PayIn4 total={subtotal} />
          <button className="btn full" onClick={() => navigate('/checkout')}>Checkout</button>
          <button className="btn full express" onClick={() => navigate('/checkout?express=1')}>Express Pay <UI.bolt className="inl" /> (demo)</button>
          <ul className="trust"><li><UI.lock /> Secure checkout</li><li><UI.back /> 30-day happiness promise</li><li><UI.truck /> Ships in 2 business days</li></ul>
          <Upsells max={3} />
        </aside>
      </section>
    </>
  )
}

/* ================= CHECKOUT ================= */
const STEPS = ['Information', 'Shipping', 'Payment']
const blank = { email: '', news: true, first: '', last: '', address: '', apt: '', city: '', state: '', zip: '', phone: '' }

export function Checkout() {
  const cart = useCart()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const lines = params.get('buy') && cart.buyNow ? cart.buyNow : cart.lines
  const [step, setStep] = useState(params.get('express') ? 2 : 0)
  const [info, setInfo] = useState(blank)
  const [errors, setErrors] = useState({})
  const [ship, setShip] = useState('standard')
  const [pay, setPay] = useState('card')
  const [code, setCode] = useState(cart.code)
  const [codeInput, setCodeInput] = useState('')
  const [codeMsg, setCodeMsg] = useState('')
  const [showSummary, setShowSummary] = useState(false)
  const headRef = useRef()
  const t = totals(lines, code, ship)

  useEffect(() => { headRef.current?.focus() }, [step])
  if (!lines.length) return <section className="sec center"><h1>Nothing to check out</h1><Link className="btn" to="/collections/all">Continue Shopping</Link></section>

  const req = { email: 'Enter an email', first: 'Enter a first name', last: 'Enter a last name', address: 'Enter an address', city: 'Enter a city', state: 'Enter a state', zip: 'Enter a ZIP code' }
  const validate = () => {
    const e = {}
    Object.entries(req).forEach(([k, m]) => { if (!info[k].trim()) e[k] = m })
    if (info.email && !/^\S+@\S+\.\S+$/.test(info.email)) e.email = 'Enter a valid email'
    if (info.zip && !/^\d{5}(-\d{4})?$/.test(info.zip)) e.zip = 'Enter a valid 5-digit ZIP code'
    setErrors(e)
    return !Object.keys(e).length
  }
  const next = () => {
    if (step === 0 && !validate()) { setTimeout(() => document.querySelector('.err-summary')?.focus()); return }
    setStep(step + 1)
  }
  const applyCode = (e) => {
    e.preventDefault()
    const k = codeInput.trim().toUpperCase()
    if (codes[k]?.active) { setCode(k); cart.setCode(k); setCodeMsg(`${k} applied: ${codes[k].label}`) } else setCodeMsg('That code is not valid.')
  }
  const place = () => {
    if (step === 2 && !info.email) { setStep(0); return }
    const id = `${1000 + orders.length + 1}`
    orders.push({ id, date: new Date().toISOString(), customer: info, lines, ship, pay, code: code || null, note: cart.note, ...t, status: 'Paid', fulfillment: 'Unfulfilled', notes: [] })
    lines.forEach((l) => { const p = products.find((x) => x.slug === l.slug); if (p?.stock != null) p.stock = Math.max(0, p.stock - l.q * l.pack) })
    if (code && codes[code]) codes[code].uses = (codes[code].uses || 0) + 1
    commit()
    if (lines === cart.lines) cart.clear(); else cart.setBuyNow(null)
    navigate(`/checkout/thank-you/${id}`)
  }
  const field = (k, label, props = {}) => (
    <div className={`field ${props.half ? 'half' : ''}`}>
      <label htmlFor={`f-${k}`}>{label}{req[k] && <span aria-hidden> *</span>}</label>
      <input id={`f-${k}`} value={info[k]} onChange={(e) => setInfo({ ...info, [k]: e.target.value })} aria-invalid={!!errors[k]} aria-describedby={errors[k] ? `e-${k}` : undefined} required={!!req[k]} autoComplete={props.ac} type={props.type || 'text'} inputMode={props.im} />
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
      <form className="code" onSubmit={applyCode}>
        <label htmlFor="code" className="sr-only">Discount code</label>
        <input id="code" placeholder="Discount code" value={codeInput} onChange={(e) => setCodeInput(e.target.value)} />
        <button className="btn sm" disabled={!codeInput.trim()}>Apply</button>
      </form>
      <p className="code-msg" role="status">{codeMsg}</p>
      <div className="row"><span>Subtotal</span><span>{money(t.subtotal)}</span></div>
      {t.discount > 0 && <div className="row save"><span>Discount ({code})</span><span>−{money(t.discount)}</span></div>}
      <div className="row"><span>Shipping</span><span>{step < 1 ? 'Calculated next step' : t.shipCost ? money(t.shipCost) : 'FREE'}</span></div>
      <div className="row"><span>Estimated tax</span><span>{money(t.tax)}</span></div>
      <div className="row total"><span>Total</span><b>USD {money(t.total)}</b></div>
      {t.savings > 0 && <p className="save-note"><UI.party className="inl" /> You're saving {money(t.savings + t.discount)} on this order</p>}
    </div>
  )

  return (
    <div className="checkout">
      <div className="co-main">
        <Link to="/" className="logo">{BRAND}</Link>
        <nav className="co-steps" aria-label="Checkout steps">
          <ol>
            <li><Link to="/cart">Cart</Link></li>
            {STEPS.map((s, i) => <li key={s} aria-current={i === step ? 'step' : undefined}>{i < step ? <button onClick={() => setStep(i)}>{s}</button> : <span>{s}</span>}</li>)}
          </ol>
        </nav>

        <button className="co-toggle" onClick={() => setShowSummary(!showSummary)} aria-expanded={showSummary} aria-controls="co-summary-m">
          {showSummary ? 'Hide' : 'Show'} order summary <b>{money(t.total)}</b>
        </button>
        {showSummary && <div id="co-summary-m" className="co-summary mobile">{Summary}</div>}

        <h1 ref={headRef} tabIndex={-1} className="co-h">{STEPS[step]}</h1>

        {step === 0 && (
          <div className="express-row">
            <p>Express checkout</p>
            <div><button className="btn express" onClick={() => setStep(2)}>Express Pay <UI.bolt className="inl" /></button><button className="btn ghost" onClick={() => setStep(2)}>Pay in 4</button></div>
            <span className="or">OR</span>
          </div>
        )}

        {step === 0 && (
          <form onSubmit={(e) => { e.preventDefault(); next() }} noValidate>
            {!!Object.keys(errors).length && (
              <div className="err-summary" tabIndex={-1} role="alert">
                <b>Please fix {Object.keys(errors).length} {Object.keys(errors).length === 1 ? 'field' : 'fields'}:</b>
                <ul>{Object.entries(errors).map(([k, m]) => <li key={k}><a href={`#f-${k}`}>{m}</a></li>)}</ul>
              </div>
            )}
            <h2>Contact</h2>
            {field('email', 'Email', { type: 'email', ac: 'email' })}
            <label className="check"><input type="checkbox" checked={info.news} onChange={(e) => setInfo({ ...info, news: e.target.checked })} /> Email me with news and offers</label>
            <h2>Shipping address</h2>
            <div className="fields">
              {field('first', 'First name', { half: true, ac: 'given-name' })}
              {field('last', 'Last name', { half: true, ac: 'family-name' })}
              {field('address', 'Address', { ac: 'address-line1' })}
              {field('apt', 'Apartment, suite, etc. (optional)', { ac: 'address-line2' })}
              {field('city', 'City', { half: true, ac: 'address-level2' })}
              {field('state', 'State', { half: true, ac: 'address-level1' })}
              {field('zip', 'ZIP code', { half: true, ac: 'postal-code', im: 'numeric' })}
              {field('phone', 'Phone (optional)', { half: true, type: 'tel', ac: 'tel' })}
            </div>
            <div className="co-nav"><Link to="/cart">‹ Return to cart</Link><button className="btn">Continue to shipping</button></div>
          </form>
        )}

        {step === 1 && (
          <>
            <Review info={info} setStep={setStep} />
            <fieldset className="radios"><legend><h2>Shipping method</h2></legend>
              {shipping.map((s) => {
                const cost = t.free && s.id === 'standard' ? 0 : s.price
                return <label key={s.id} className={ship === s.id ? 'on' : ''}><input type="radio" name="ship" checked={ship === s.id} onChange={() => setShip(s.id)} /><span>{s.label}</span><b>{cost ? money(cost) : 'FREE'}</b></label>
              })}
            </fieldset>
            <div className="co-nav"><button className="link" onClick={() => setStep(0)}>‹ Return to information</button><button className="btn" onClick={next}>Continue to payment</button></div>
          </>
        )}

        {step === 2 && (
          <>
            {info.email ? <Review info={info} ship={ship} setStep={setStep} /> : <p className="notice">Express checkout (demo): we'll still need your details. <button className="link" onClick={() => setStep(0)}>Add them →</button></p>}
            <fieldset className="radios"><legend><h2>Payment</h2></legend>
              <p className="fine left"><UI.lock className="inl" /> Demo store: no payment details are collected and no charge is made.</p>
              {[['card', 'Credit card (demo)'], ['pay4', `Pay in 4 — ${money(t.total / 4)} today (demo)`], ['express', 'Express Pay (demo)']].map(([id, l]) => (
                <label key={id} className={pay === id ? 'on' : ''}><input type="radio" name="pay" checked={pay === id} onChange={() => setPay(id)} /><span>{l}</span></label>
              ))}
            </fieldset>
            <div className="co-nav"><button className="link" onClick={() => setStep(1)}>‹ Return to shipping</button><button className="btn" onClick={place} disabled={!info.email}>Pay now · {money(t.total)}</button></div>
          </>
        )}
        <footer className="co-foot"><Link to="/pages/terms">Terms</Link><Link to="/pages/privacy">Privacy</Link><Link to="/pages/faq">Shipping & returns</Link></footer>
      </div>
      <aside className="co-summary desktop" aria-label="Order summary">{Summary}</aside>
    </div>
  )
}

function Review({ info, ship, setStep }) {
  const s = shipping.find((x) => x.id === ship)
  return (
    <dl className="co-review">
      <div><dt>Contact</dt><dd>{info.email}</dd><button className="link" onClick={() => setStep(0)}>Change<span className="sr-only"> contact</span></button></div>
      <div><dt>Ship to</dt><dd>{[info.address, info.apt, info.city, info.state, info.zip].filter(Boolean).join(', ')}</dd><button className="link" onClick={() => setStep(0)}>Change<span className="sr-only"> address</span></button></div>
      {s && <div><dt>Method</dt><dd>{s.label}</dd><button className="link" onClick={() => setStep(1)}>Change<span className="sr-only"> shipping method</span></button></div>}
    </dl>
  )
}

/* ================= THANK YOU ================= */
export function ThankYou() {
  const { id } = useParams()
  const o = orders.find((x) => x.id === id)
  if (!o) return <section className="sec center"><h1>Order not found</h1><Link className="btn" to="/">Home</Link></section>
  return (
    <div className="checkout thanks-page">
      <div className="co-main">
        <Link to="/" className="logo">{BRAND}</Link>
        <div className="ty-head"><span className="ty-check" aria-hidden><UI.check /></span><div><small>Order #{o.id}</small><h1 tabIndex={-1} ref={(el) => el?.focus()}>Thank you, {o.customer.first || 'friend'}!</h1></div></div>
        <div className="card-box"><h2>Your order is confirmed</h2><p>We've sent a confirmation to <b>{o.customer.email}</b>. Tins ship in about 2 business days.</p></div>
        <div className="card-box">
          <h2>Order details</h2>
          <dl className="ty-grid">
            <div><dt>Shipping address</dt><dd>{o.customer.first} {o.customer.last}<br />{o.customer.address}<br />{o.customer.city}, {o.customer.state} {o.customer.zip}</dd></div>
            <div><dt>Shipping method</dt><dd>{shipping.find((s) => s.id === o.ship)?.label}</dd></div>
            <div><dt>Payment</dt><dd>{o.pay} (demo) · {money(o.total)}</dd></div>
            {o.note && <div><dt>Gift note</dt><dd>“{o.note}”</dd></div>}
          </dl>
        </div>
        <div className="card-box refer"><h2>Give 20%, get 20%</h2><p>Share your link and you both save on the next box.</p><button className="btn sm" onClick={() => navigator.clipboard?.writeText(`${location.origin}/?ref=${o.id}`)}>Copy referral link</button></div>
        <div className="co-nav"><span>Need help? <Link to="/pages/faq">Contact us</Link></span><Link className="btn" to="/collections/all">Continue shopping</Link></div>
      </div>
      <aside className="co-summary desktop" aria-label="Order summary">
        <div className="co-summary-in">
          {o.lines.map((l) => <div key={l.id} className="co-line"><div className="co-img"><Tin p={bySlug(l.slug)} label={null} /><em>{l.q}</em></div><div><b>{l.name}</b>{l.label && <small>{l.label}</small>}</div><span>{money(l.unit * l.q)}</span></div>)}
          <div className="row"><span>Subtotal</span><span>{money(o.subtotal)}</span></div>
          {o.discount > 0 && <div className="row save"><span>Discount</span><span>−{money(o.discount)}</span></div>}
          <div className="row"><span>Shipping</span><span>{o.shipCost ? money(o.shipCost) : 'FREE'}</span></div>
          <div className="row"><span>Tax</span><span>{money(o.tax)}</span></div>
          <div className="row total"><span>Total</span><b>{money(o.total)}</b></div>
        </div>
      </aside>
    </div>
  )
}

