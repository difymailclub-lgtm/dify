import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Navigation, Pagination, Autoplay, Mousewheel, EffectCoverflow, Keyboard, A11y } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/navigation'
import 'swiper/css/pagination'
import 'swiper/css/effect-coverflow'
import { Illustration, UI } from './art'
import { BRAND, nav, collections, inCollection, bySlug, products, makeLine, totals, money, settings } from './data'

/* ---------- Placeholder imagery (watermarked) ---------- */
export function Tin({ p, label = p?.name, ratio = '1 / 1', round, scene }) {
  return (
    <div className="ph" style={{ aspectRatio: ratio, background: p?.tin?.[1], borderRadius: round ? '50%' : undefined }}>
      <Illustration p={p} scene={scene} />
      {label && <span className="ph-label">{label}</span>}
      <span className="ph-wm">SAMPLE</span>
    </div>
  )
}

/* ---------- Cart ---------- */
const CartCtx = createContext()
export const useCart = () => useContext(CartCtx)
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* storage unavailable */ } }

export function CartProvider({ children }) {
  const [lines, setLines] = useState(() => load('cart-lines', []))
  const [note, setNote] = useState(() => load('cart-note', ''))
  const [code, setCode] = useState(() => load('cart-code', ''))
  const [buyNow, setBuyNow] = useState(null)
  const [open, setOpen] = useState(false)
  useEffect(() => { save('cart-lines', lines) }, [lines])
  useEffect(() => { save('cart-note', note) }, [note])
  useEffect(() => { save('cart-code', code) }, [code])
  const setQty = (id, q) => setLines((ls) => (q > 0 ? ls.map((l) => (l.id === id ? { ...l, q } : l)) : ls.filter((l) => l.id !== id)))
  const add = (line, q = 1, { silent } = {}) => {
    setLines((ls) => (ls.some((l) => l.id === line.id) ? ls.map((l) => (l.id === line.id ? { ...l, q: l.q + q } : l)) : [...ls, { ...line, q }]))
    if (!silent) setOpen(true)
  }
  const addSlug = (slug, q = 1) => add(makeLine(bySlug(slug)), q)
  const clear = () => { setLines([]); setNote(''); setCode(''); setBuyNow(null) }
  const count = lines.reduce((a, l) => a + l.q, 0)
  const t = totals(lines, code)
  return <CartCtx.Provider value={{ lines, add, addSlug, setQty, count, ...t, open, setOpen, note, setNote, code, setCode, buyNow, setBuyNow, clear }}>{children}</CartCtx.Provider>
}

export function ShipBar({ subtotal }) {
  const left = settings.freeShip - subtotal
  return (
    <div className="ship-bar" role="status">
      <p>{left <= 0 ? <><UI.party className="inl" /> You unlocked free shipping!</> : <>You're <b>{money(left)}</b> away from free shipping</>}</p>
      <div className="bar"><span style={{ width: `${Math.min(100, (subtotal / settings.freeShip) * 100)}%` }} /></div>
    </div>
  )
}

export const PayIn4 = ({ total }) => <p className="pay4">or 4 interest-free payments of <b>{money(total / 4)}</b> with <i>Pay in 4</i> (demo)</p>

export function CartLine({ l, onNav }) {
  const { setQty } = useCart()
  return (
    <div className="line">
      <div className="line-img"><Tin p={bySlug(l.slug)} label={null} /></div>
      <div className="line-info">
        <Link to={`/products/${l.slug}`} onClick={onNav}>{l.name}</Link>
        {l.label && <small className="variant">{l.label}</small>}
        <div className="qty">
          <button onClick={() => setQty(l.id, l.q - 1)} aria-label={`Decrease ${l.name}`}>−</button><span aria-live="polite">{l.q}</span><button onClick={() => setQty(l.id, l.q + 1)} aria-label={`Increase ${l.name}`}>+</button>
        </div>
        <button className="remove" onClick={() => setQty(l.id, 0)}>Remove</button>
      </div>
      <div className="line-price">{l.compare > l.unit && <s>{money(l.compare * l.q)}</s>}<b>{money(l.unit * l.q)}</b></div>
    </div>
  )
}

export function Upsells({ max = 3 }) {
  const { lines, addSlug } = useCart()
  const have = new Set(lines.map((l) => l.slug))
  const list = products.filter((p) => p.price > 0 && p.stock !== 0 && !have.has(p.slug)).slice(0, max)
  if (!list.length) return null
  return (
    <div className="upsells">
      <h5 className="upsell-h">Complete your order</h5>
      {list.map((p) => (
        <div className="line upsell" key={p.slug}>
          <div className="line-img"><Tin p={p} label={null} /></div>
          <div className="line-info"><span>{p.name}</span><small>{money(p.price)}</small></div>
          <button className="btn sm" onClick={() => addSlug(p.slug)} aria-label={`Add ${p.name}`}>+ Add</button>
        </div>
      ))}
    </div>
  )
}

function CartDrawer() {
  const { lines, subtotal, savings, open, setOpen, note, setNote } = useCart()
  const [noteOn, setNoteOn] = useState(!!note)
  const navigate = useNavigate()
  const ref = useRef()
  useEffect(() => {
    if (!open) return
    ref.current?.querySelector('.x')?.focus()
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, setOpen])
  const close = () => setOpen(false)
  return (
    <>
      <div className={`overlay ${open ? 'on' : ''}`} onClick={close} />
      <aside ref={ref} className={`drawer ${open ? 'on' : ''}`} role="dialog" aria-modal="true" aria-label="Cart" aria-hidden={!open}>
        <div className="drawer-head">
          <h3>Your Cart <small>({lines.reduce((a, l) => a + l.q, 0)})</small></h3>
          <button className="x" onClick={close} aria-label="Close cart">×</button>
        </div>
        <ShipBar subtotal={subtotal} />
        <div className="drawer-body">
          {!lines.length && <div className="empty"><h4>Time to add some tins!</h4><Link className="btn" to="/collections/best-sellers" onClick={close}>Shop Best Sellers</Link></div>}
          {lines.map((l) => <CartLine key={l.id} l={l} onNav={close} />)}
          <Upsells max={2} />
        </div>
        <div className="drawer-foot">
          <label className="check"><input type="checkbox" checked={noteOn} onChange={(e) => setNoteOn(e.target.checked)} /> This is a gift — add a note</label>
          {noteOn && <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={250} placeholder="Your gift message (250 characters)" aria-label="Gift note" />}
          {savings > 0 && <div className="row save"><span>You're saving</span><b>{money(savings)}</b></div>}
          <div className="row"><span>Subtotal</span><b>{money(subtotal)}</b></div>
          <PayIn4 total={subtotal} />
          <button className="btn full" disabled={!lines.length} onClick={() => { close(); navigate('/checkout') }}>Checkout · {money(subtotal)}</button>
          <Link className="view-cart" to="/cart" onClick={close}>View full cart</Link>
        </div>
      </aside>
    </>
  )
}

/* ---------- Layout ---------- */

// Reference: Swiper slide 750ms ease, 3000ms dwell, loops, pauses on hover
function Announcement() {
  const items = settings.announcements.length ? settings.announcements : ['']
  const n = items.length
  const [i, setI] = useState(0)
  const [anim, setAnim] = useState(true)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused || n < 2) return
    const t = setTimeout(() => { setAnim(true); setI((x) => x + 1) }, 3750)
    return () => clearTimeout(t)
  }, [i, paused, n])
  const jump = (to, then) => { setAnim(false); setI(to); requestAnimationFrame(() => requestAnimationFrame(() => { setAnim(true); setI(then) })) }
  const prev = () => (i === 0 ? jump(n, n - 1) : (setAnim(true), setI(i - 1)))
  const next = () => { setAnim(true); setI(i >= n ? 1 : i + 1) }
  const onEnd = () => { if (i >= n) { setAnim(false); setI(0) } }
  return (
    <div className="announce" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} role="region" aria-roledescription="carousel" aria-label="Announcements">
      <button className="a-prev" onClick={prev} aria-label="Previous announcement"><Icon.left /></button>
      <div className="announce-view">
        <div className="announce-track" onTransitionEnd={onEnd} style={{ transform: `translateX(-${i * 100}%)`, transition: anim ? undefined : 'none' }}>
          {[...items, items[0]].map((t, k) => <span key={k} aria-hidden={k !== i % n || k === n}>{t}</span>)}
        </div>
      </div>
      <button className="a-next" onClick={next} aria-label="Next announcement"><Icon.right /></button>
      <button className="pause" onClick={() => setPaused(!paused)} aria-label={paused ? 'Resume auto rotation' : 'Pause auto rotation'}>{paused ? <UI.play /> : <UI.pause />}</button>
    </div>
  )
}

function EmailPopup() {
  const [show, setShow] = useState(false)
  const [done, setDone] = useState(false)
  const [pill, setPill] = useState(() => { try { return sessionStorage.getItem('pill-off') !== '1' } catch { return true } })
  const close = () => { setShow(false); save('popup-seen', true) }
  const killPill = () => { setPill(false); try { sessionStorage.setItem('pill-off', '1') } catch { /* storage unavailable */ } }
  useEffect(() => {
    if (load('popup-seen', false)) return
    const t = setTimeout(() => setShow(true), 8000)
    return () => clearTimeout(t)
  }, [])
  useEffect(() => {
    if (!show) return
    const onKey = (e) => e.key === 'Escape' && close()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [show])
  if (!show) return pill && !done ? (
    <div className="teaser">
      <button className="teaser-open" onClick={() => setShow(true)}>Mystery Discount</button>
      <button className="teaser-x" onClick={killPill} aria-label="Dismiss mystery discount">×</button>
    </div>
  ) : null
  return (
    <div className="popup-wrap" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="popup" role="dialog" aria-modal="true" aria-labelledby="popup-h">
        <button className="x" onClick={close} aria-label="Close">×</button>
        <Tin p={{ tin: ['#f04a49', '#fdcd62'], art: 'box' }} label={null} ratio="4 / 3" />
        <div>
          <span className="eyebrow">Unlock</span>
          <h2 id="popup-h">10% off your first order</h2>
          {done ? <p>Use code <b>WELCOME10</b> at checkout. Welcome aboard!</p> : (
            <form onSubmit={(e) => { e.preventDefault(); setDone(true); save('popup-seen', true) }}>
              <input type="email" required placeholder="Email address" aria-label="Email address" autoFocus />
              <button className="btn full">Get My Code</button>
              <button type="button" className="link small" onClick={close}>No thanks, I'll pay full price</button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------- Icons (1.5px line, currentColor) ---------- */
const I = (d, vb = '0 0 24 24') => function Icon(props) { return <svg viewBox={vb} width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>{d}</svg> }
export const Icon = {
  search: I(<><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 20 20" /></>),
  user: I(<><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c1.2-3.6 4-5 7-5s5.8 1.4 7 5" /></>),
  bag: I(<><path d="M5 8h14l-1.2 12H6.2z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></>),
  chev: I(<path d="m6 9 6 6 6-6" />),
  burger: I(<path d="M4 7h16M4 12h16M4 17h16" />),
  left: I(<path d="M19 12H5m6-6-6 6 6 6" />),
  right: I(<path d="M5 12h14m-6-6 6 6-6 6" />),
  fish: I(<><path d="M3 12c3-4 9-5 13-2l4-3v10l-4-3c-4 3-10 2-13-2z" /><circle cx="8" cy="11.5" r=".6" fill="currentColor" /></>),
}

function Logo() {
  return (
    <Link to="/" className="logo" aria-label={`${BRAND} home`}>
      <svg viewBox="0 0 64 64" className="emblem" aria-hidden>
        <circle cx="32" cy="32" r="30" fill="#f04a49" stroke="#010101" strokeWidth="2" />
        <circle cx="32" cy="32" r="22" fill="#fdcd62" stroke="#010101" strokeWidth="1.5" />
        <path d="M16 33c6-9 18-10 26-4l7-5v18l-7-5c-8 6-20 5-26-4z" fill="#73c3f5" stroke="#010101" strokeWidth="1.8" />
        <circle cx="24" cy="31" r="1.8" fill="#010101" />
      </svg>
      <span>{BRAND}</span>
    </Link>
  )
}

function Header() {
  const { count, setOpen } = useCart()
  const [menu, setMenu] = useState(false)
  const loc = useLocation()
  const [hidden, setHidden] = useState(false)
  const [rowHidden, setRowHidden] = useState(false)
  useEffect(() => { setMenu(false) }, [loc.pathname])
  useEffect(() => {
    let last = window.scrollY
    // desktop: hide past 600px while scrolling down. phone: pill row collapses past 80px, returns at <=10px
    const on = () => { const y = window.scrollY; setHidden(y > 600 && y > last); setRowHidden((h) => (y > 80 ? true : y <= 10 ? false : h)); last = y }
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  useEffect(() => {
    if (!menu) return
    const onKey = (e) => e.key === 'Escape' && setMenu(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menu])
  const cta = nav.find((n) => n.cta)
  return (
    <header className={`header ${hidden && !menu ? 'hide' : ''}`}>
      <div className="header-in">
        <div className="h-left">
          <button className="ico burger" onClick={() => setMenu(!menu)} aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu} aria-controls="site-nav"><Icon.burger /></button>
          <Link to="/collections/all" className="ico m-only" aria-label="Search"><Icon.search /></Link>
        </div>
        <Logo />
        <nav id="site-nav" className={`nav ${menu ? 'on' : ''}`} aria-label="Main">
          {nav.map((n) => (
            <div className="nav-item" key={n.label}>
              <NavLink to={n.to} className={`pill ${n.cta ? 'cta' : ''}`}>{n.label}{n.cta && <Icon.fish />}{n.mega && <Icon.chev className="chev" />}</NavLink>
              {n.mega && (
                <div className="mega">
                  <div className="mega-links">
                    {n.mega.map((c) => <Link key={c} to={`/collections/${c}`}>{collections[c].title}</Link>)}
                  </div>
                  <div className="mega-cards">
                    {inCollection(n.mega[0]).slice(0, 3).map((p) => (
                      <Link key={p.slug} to={`/products/${p.slug}`} className="mega-card"><Tin p={p} label={null} /><span>{p.name}</span></Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="icons">
          <Link to="/collections/all" className="ico d-only" aria-label="Search"><Icon.search /></Link>
          <a href="#" className="ico" aria-label="Account" onClick={(e) => e.preventDefault()}><Icon.user /></a>
          <button className="ico cart-btn" onClick={() => setOpen(true)} aria-label={`Cart, ${count} items`}>
            <Icon.bag />
            {count > 0 && <em>{count}</em>}
          </button>
        </div>
      </div>
      <div className={`m-row ${rowHidden ? 'gone' : ''}`} aria-hidden={rowHidden}>
        <div className="m-row-in">
          <Link className="pill" to="/collections/tinned-fish" tabIndex={rowHidden ? -1 : 0}>Shop Fish</Link>
          <Link className="pill" to="/collections/gifts" tabIndex={rowHidden ? -1 : 0}>Shop Gifts</Link>
          <Link className="pill cta wide" to={cta.to} tabIndex={rowHidden ? -1 : 0}>{cta.label} <Icon.fish /></Link>
        </div>
      </div>
    </header>
  )
}

function Footer() {
  const [done, setDone] = useState(false)
  const cols = {
    Shop: [['Shop All', '/collections/all'], ['Best Sellers', '/collections/best-sellers'], ['Bundles & Gifts', '/collections/gifts'], ['Store Locator', '/pages/store-locator']],
    Learn: [['Our Story', '/pages/story'], ['Recipes', '/blogs/recipes'], ['FAQ', '/pages/faq']],
    Connect: [['Corporate Gifting', '/pages/corporate-gifting'], ['Refer a Friend', '/pages/refer'], ['Instagram', '#'], ['TikTok', '#']],
    Info: [['Terms of Service', '/pages/terms'], ['Privacy Policy', '/pages/privacy'], ['Accessibility', '/pages/accessibility']],
  }
  return (
    <footer>
      <section className="signup" aria-labelledby="signup-h">
        <div className="signup-mark"><svg viewBox="0 0 64 64" aria-hidden><circle cx="32" cy="32" r="30" fill="#f04a49" stroke="#010101" strokeWidth="2" /><circle cx="32" cy="32" r="22" fill="#fdcd62" stroke="#010101" strokeWidth="1.5" /><path d="M16 33c6-9 18-10 26-4l7-5v18l-7-5c-8 6-20 5-26-4z" fill="#73c3f5" stroke="#010101" strokeWidth="1.8" /><circle cx="24" cy="31" r="1.8" fill="#010101" /></svg></div>
        <p id="signup-h">Get first dibs on new tins, recipes and limited drops.</p>
        {done ? <p className="thanks" role="status">You're in! Check your inbox.</p> : (
          <form onSubmit={(e) => { e.preventDefault(); setDone(true) }}>
            <label htmlFor="signup-email" className="sr-only">Email address (required)</label>
            <input id="signup-email" type="email" required placeholder="Your email*" />
            <button className="btn">Subscribe</button>
          </form>
        )}
        <small>* required</small>
      </section>
      <div className="foot">
        <p className="foot-statement">{BRAND} is a small, independent tinned-fish company on a mission to make traceable, chef-seasoned seafood a pantry staple. (Demo brand.)</p>
        <div className="foot-cols">
          {Object.entries(cols).map(([h, links]) => (
            <nav key={h} className="foot-col" aria-label={h}><h4>{h}</h4>{links.map(([l, to]) => <Link key={l} to={to}>{l}</Link>)}</nav>
          ))}
        </div>
      </div>
      <div className="copy">
        <span>© {new Date().getFullYear()} {BRAND} Tinned Fish Co. (demo)</span>
        <Link to="/pages/terms">Terms of Service</Link><Link to="/pages/accessibility">Accessibility</Link>
        <div className="socials">{['IG', 'TT', 'YT'].map((x) => <a key={x} href="#" aria-label={x} onClick={(e) => e.preventDefault()}>{x}</a>)}</div>
      </div>
    </footer>
  )
}

export function Layout({ children }) {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  if (pathname.startsWith('/admin')) return children
  if (pathname.startsWith('/checkout')) return <main id="main">{children}</main>
  return (
    <>
      <a href="#main" className="skip">Skip to content</a>
      <Announcement /><Header /><main id="main" tabIndex={-1}>{children}</main><Footer /><CartDrawer /><EmailPopup />
    </>
  )
}

/* ---------- Shared pieces ---------- */
export function ProductCard({ p }) {
  const { addSlug } = useCart()
  const out = p.stock === 0
  return (
    <div className="card">
      <Link to={`/products/${p.slug}`} className="card-img">
        {(out || p.badge) && <span className={`badge ${out ? 'out' : ''}`}>{out ? 'Out of Stock' : p.badge}</span>}
        <Tin p={p} label={null} />
        <div className="card-alt" aria-hidden><Tin p={{ ...p, tin: [...(p.tin || ['#fdcd62', '#73c3f5'])].reverse() }} label={null} /></div>
      </Link>
      <div className="card-body">
        <div className="card-rating"><Stars n={4.9} /><span>4.9</span></div>
        <Link to={`/products/${p.slug}`} className="card-title">{p.name}</Link>
        <span className="card-price">{p.price ? money(p.price) : 'From $54'}{p.stock > 0 && p.stock < settings.lowStock && <small className="low"> · Only {p.stock} left</small>}</span>
      </div>
      {!p.price ? <Link className="card-btn" to="/pages/bundles">Build Your Box</Link>
        : out ? <Link className="card-btn ghost" to={`/products/${p.slug}`}>Notify Me</Link>
        : <button className="card-btn" onClick={() => addSlug(p.slug)} aria-label={`Add ${p.name} to cart`}>Add to Cart</button>}
    </div>
  )
}

export const reviewCount = (slug) => 40 + ([...slug].reduce((a, c) => a + c.charCodeAt(0), 0) % 400)
export function Stars({ n, count }) {
  return <div className="stars" aria-label={`Rated ${n} out of 5${count ? `, ${count} sample reviews` : ''}`}><span aria-hidden className="star-row">{[1, 2, 3, 4, 5].map((k) => <UI.star key={k} className={k <= Math.round(n) ? 'on' : ''} />)}</span>{count != null && <small> {n} ({count})</small>}</div>
}

const presets = {
  collection: { modules: [Navigation, Mousewheel, A11y], speed: 300, slidesPerView: 1.35, spaceBetween: 24, slidesOffsetBefore: 30, slidesOffsetAfter: 30, mousewheel: { forceToAxis: true }, navigation: true, breakpoints: { 768: { slidesPerView: 4, slidesOffsetBefore: 60, slidesOffsetAfter: 60 } } },
  press: { modules: [Autoplay, Navigation, Pagination, A11y], slidesPerView: 1.5, spaceBetween: 10, centeredSlides: true, loop: true, speed: 1000, autoplay: { delay: 6500, disableOnInteraction: false, pauseOnMouseEnter: true }, navigation: true, pagination: { clickable: true }, breakpoints: { 480: { slidesPerView: 3.1, spaceBetween: 20 }, 768: { slidesPerView: 4.5, spaceBetween: 50 } } },
  recipes: { modules: [Navigation, Pagination, A11y], slidesPerView: 1, loop: true, speed: 1000, autoHeight: true, navigation: true, pagination: { clickable: true } },
  coverflow: { modules: [EffectCoverflow, Pagination, Keyboard, A11y], effect: 'coverflow', coverflowEffect: { rotate: 0, depth: 175, modifier: 2, slideShadows: false }, slidesPerView: 1.25, spaceBetween: 20, centeredSlides: true, loop: true, speed: 500, grabCursor: true, keyboard: { enabled: true }, pagination: { clickable: true }, slideToClickedSlide: true, breakpoints: { 640: { slidesPerView: 2.39 }, 1024: { slidesPerView: 2.31 } } },
  gallery: { modules: [Navigation, Pagination, A11y], slidesPerView: 1, loop: true, speed: 300, navigation: true, pagination: { clickable: true } },
}

export function Slider({ kind = 'collection', children, className = '', ...rest }) {
  const [paused, setPaused] = useState(false)
  const sw = useRef()
  const toggle = () => { const a = sw.current?.autoplay; if (!a) return; paused ? a.start() : a.stop(); setPaused(!paused) }
  return (
    <div className={`slider-wrap ${kind} ${className}`}>
      <Swiper {...presets[kind]} {...rest} onSwiper={(s) => { sw.current = s }} a11y={{ enabled: true }}>
        {[].concat(children).map((c, i) => <SwiperSlide key={c?.key ?? i}>{c}</SwiperSlide>)}
      </Swiper>
      {presets[kind].autoplay && <button className="sw-pause" onClick={toggle} aria-label={paused ? 'Play slideshow' : 'Pause slideshow'}>{paused ? <UI.play /> : <UI.pause />}</button>}
    </div>
  )
}

// Controlled (open/onToggle) for one-open-at-a-time groups, else self-managed
export function Accordion({ q, a, open: o, onToggle, icon = '›' }) {
  const [self, setSelf] = useState(!!o)
  const open = onToggle ? o : self
  return (
    <div className={`acc ${open ? 'on' : ''} i-${icon === '+' ? 'plus' : icon === 'arrow' ? 'arrow' : 'chev'}`}>
      <button onClick={() => (onToggle ? onToggle() : setSelf(!self))} aria-expanded={open}>{q}<span aria-hidden>{icon === 'arrow' ? <UI.arrowDown /> : icon}</span></button>
      <div className="acc-a" inert={open ? undefined : ''}><div><p>{a}</p></div></div>
    </div>
  )
}

export function PageHero({ title, blurb }) {
  return <header className="page-hero"><h1>{title}</h1>{blurb && <p>{blurb}</p>}</header>
}

/* ---------- Scroll motion (matches reference ScrollTrigger timings) ---------- */
export function useReveal() {
  const ref = useRef()
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add('in'); io.disconnect() } }, { rootMargin: '0px 0px -10% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return ref
}

// Words darken one by one as the heading travels from 90% to 70% of the viewport
export function ScrubWords({ text, as: Tag = 'h2' }) {
  const ref = useRef()
  const words = text.split(' ')
  const [n, setN] = useState(0)
  useEffect(() => {
    const on = () => {
      const top = ref.current.getBoundingClientRect().top, vh = window.innerHeight
      setN(Math.round(Math.min(1, Math.max(0, (0.9 * vh - top) / (0.2 * vh))) * words.length))
    }
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [words.length])
  return <Tag ref={ref} aria-label={text} className="scrub">{words.map((w, i) => <span key={i} aria-hidden className={i < n ? 'lit' : ''}>{w} </span>)}</Tag>
}
