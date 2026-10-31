import { useState, useEffect, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { BRAND, products, collections, featured, valueProps, canneries, press, recipes, articles, bundleIncludes, boxSizes, faqs, stores, bySlug, inCollection, makeLine, money, packsFor, canGiftTin, canSubscribe, settings, reviewsFor } from './data'
import { UI } from './art'
import { subscribeEmail } from './components'
import { Tin, ProductCard, Slider, Accordion, PageHero, useCart, Stars, reviewCount, useReveal, ScrubWords, Icon } from './components'

/* ================= HOME ================= */
// Original line illustrations for the value props (thick ink outline, flat fills)
const Art = {
  chef: <svg viewBox="0 0 120 120" aria-hidden><path d="M34 62c-12 0-18-20-4-26 2-14 20-18 30-8 10-10 28-6 30 8 14 6 8 26-4 26v26H34z" fill="#fff7e9" stroke="#010101" strokeWidth="3" strokeLinejoin="round" /><rect x="34" y="78" width="52" height="16" rx="3" fill="#f04a49" stroke="#010101" strokeWidth="3" /><path d="M48 62v16m12-16v16m12-16v16" stroke="#010101" strokeWidth="2.5" /></svg>,
  compass: <svg viewBox="0 0 120 120" aria-hidden><circle cx="60" cy="62" r="34" fill="#73c3f5" stroke="#010101" strokeWidth="3" /><circle cx="60" cy="62" r="25" fill="#fff7e9" stroke="#010101" strokeWidth="2.5" /><path d="m60 40 8 22-8 22-8-22z" fill="#f04a49" stroke="#010101" strokeWidth="2.5" strokeLinejoin="round" /><circle cx="60" cy="62" r="3" fill="#010101" /><rect x="54" y="20" width="12" height="8" rx="2" fill="#fdcd62" stroke="#010101" strokeWidth="2.5" /></svg>,
  tin: <svg viewBox="0 0 120 120" aria-hidden><rect x="18" y="46" width="84" height="44" rx="12" fill="#fdcd62" stroke="#010101" strokeWidth="3" /><path d="M24 46c10-14 62-14 72 0" fill="#c7e0c3" stroke="#010101" strokeWidth="3" /><circle cx="90" cy="34" r="7" fill="#fff7e9" stroke="#010101" strokeWidth="2.5" /><path d="M42 68c8-9 22-9 30 0-8 9-22 9-30 0zm30 0 8-6v12z" fill="#73c3f5" stroke="#010101" strokeWidth="2.5" strokeLinejoin="round" /></svg>,
  jar: <svg viewBox="0 0 120 120" aria-hidden><rect x="32" y="30" width="56" height="12" rx="3" fill="#f04a49" stroke="#010101" strokeWidth="3" /><path d="M36 42h48v46a8 8 0 0 1-8 8H44a8 8 0 0 1-8-8z" fill="#c7e0c3" stroke="#010101" strokeWidth="3" /><rect x="44" y="56" width="32" height="22" rx="3" fill="#fff7e9" stroke="#010101" strokeWidth="2.5" /><path d="m54 62 4 4 8-8" stroke="#010101" strokeWidth="2.5" fill="none" strokeLinecap="round" /></svg>,
}
const Star = ({ fill = '#fdcd62' }) => <svg viewBox="0 0 40 40" className="h-star" aria-hidden><path d="m20 3 5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z" fill={fill} stroke="#010101" strokeWidth="2" strokeLinejoin="round" /></svg>
const Yes = () => <svg viewBox="0 0 36 36" className="mark" role="img" aria-label="Yes"><circle cx="18" cy="18" r="15" fill="#fdcd62" stroke="#010101" strokeWidth="2" /><path d="m11 18 5 5 9-10" fill="none" stroke="#010101" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
const No = () => <svg viewBox="0 0 36 36" className="mark" role="img" aria-label="No"><circle cx="18" cy="18" r="15" fill="none" stroke="#010101" strokeWidth="2" /><path d="m12 12 12 12m0-12L12 24" stroke="#010101" strokeWidth="2.5" strokeLinecap="round" /></svg>

const compareCols = [BRAND, 'Chicken', 'Steak', 'Fresh Fish']
const compareRows = [
  ['Zero cooking required', [1, 0, 0, 0]],
  ['Keeps in the pantry for years', [1, 0, 0, 0]],
  ['Packed with omega-3s', [1, 0, 0, 1]],
  ['Endlessly recyclable tin', [1, 0, 0, 0]],
  ['Time to the table', ['Open the lid', '30–45 min', '25–40 min', '15–40 min']],
  ['Traceable to the boat', ['Every tin', 'Rarely', 'Rarely', 'Sometimes']],
]

// Phone: one column per step, 0.5s smooth scroll, progress bar
function CompareScroller({ children }) {
  const ref = useRef()
  const [pct, setPct] = useState(0)
  const step = (d) => { const el = ref.current; const col = el.querySelector('thead th:nth-child(3)')?.offsetWidth || 160; el.scrollBy({ left: d * col, behavior: 'smooth' }) }
  const onScroll = () => { const el = ref.current; setPct(el.scrollLeft / Math.max(1, el.scrollWidth - el.clientWidth)) }
  return (
    <>
      <div className="table-wrap" ref={ref} onScroll={onScroll} tabIndex={0} aria-label="Comparison table, scrolls sideways">{children}</div>
      <div className="cmp-nav">
        <button onClick={() => step(-1)} aria-label="Previous column"><Icon.left /></button>
        <div className="cmp-prog" aria-hidden><span style={{ width: `${25 + pct * 75}%` }} /></div>
        <button onClick={() => step(1)} aria-label="Next column"><Icon.right /></button>
      </div>
    </>
  )
}

function Includes({ items }) {
  const [open, setOpen] = useState(-1)
  return (
    <ul className="includes">
      {items.map((p, i) => (
        <li key={p.slug} className={open === i ? 'on' : ''}>
          <button aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}><span>{p.name}</span><Icon.right /></button>
          <div className="inc-a" inert={open === i ? undefined : ''}><div><p>{p.desc} <Link to={`/products/${p.slug}`}>Shop it →</Link></p></div></div>
        </li>
      ))}
    </ul>
  )
}

// Illustrated banner with a centered translucent green card (collection/story/recipes/bundles)
const Pin = () => <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden><path d="M12 22c-5-7-7-10-7-13a7 7 0 0 1 14 0c0 3-2 6-7 13z" fill="#010101" /><circle cx="12" cy="9" r="2.6" fill="#fffcf3" /></svg>
const StarIcon = ({ x, y }) => <svg viewBox="0 0 40 40" className="deco-star" style={{ left: x, top: y }}><path d="m20 3 5 11 12 1-9 8 3 12-11-6-11 6 3-12-9-8 12-1z" fill="#fdcd62" stroke="#010101" strokeWidth="2" strokeLinejoin="round" /></svg>

export function Banner({ title, sub, scene = 'banner', tint = ['#fdcd62', '#fff7e9'], as: H = 'h1' }) {
  return (
    <section className="coll-banner">
      <Tin p={{ tin: tint }} scene={scene} label="Banner image placeholder" ratio="auto" />
      <div className="coll-banner-card"><H>{title}</H>{sub && <p>{sub}</p>}</div>
    </section>
  )
}

function Values() {
  const ref = useReveal()
  return (
    <section ref={ref} className="sec values">
      <h2 className="star-h"><Star /> Tins Worth Bragging About <Star fill="#3ba76b" /></h2>
      <div className="vgrid">
        {valueProps.map((v, i) => <div key={v.title} className="vprop"><div className="vicon">{Object.values(Art)[i % 4]}</div><h3>{v.title}</h3><p>{v.text}</p></div>)}
      </div>
    </section>
  )
}

function WhatsInside({ slugs }) {
  const items = slugs.map(bySlug)
  const [i, setI] = useState(0)
  const go = (d) => setI((i + d + items.length) % items.length)
  const cur = items[i]
  return (
    <section className="inside">
      <div className="inside-card">
        <div className="inside-list">
          <h2>What's Inside</h2>
          <p>A little bit of everything, from smoky to bright.</p>
          <div className="inside-tiles" role="tablist" aria-label="Items in this box">
            {items.map((p, k) => (
              <button key={p.slug} role="tab" aria-selected={k === i} className={k === i ? 'on' : ''} onClick={() => setI(k)}>
                <span className="t-img"><Tin p={p} label={null} /></span><span>{p.name}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="inside-detail" role="tabpanel" aria-live="polite">
          <div className="inside-stage">
            <button className="round-btn" onClick={() => go(-1)} aria-label="Previous item"><Icon.left /></button>
            <div className="inside-img" key={cur.slug}><Tin p={cur} label={null} /></div>
            <button className="round-btn" onClick={() => go(1)} aria-label="Next item"><Icon.right /></button>
          </div>
          <h3>{cur.name}</h3>
          <p>{cur.desc}</p>
        </div>
      </div>
    </section>
  )
}

export function Home() {
  const cal = bySlug('countdown-calendar')
  return (
    <>
      <section className="hero">
        <div className="hero-media"><Tin p={cal} scene="hero" label="Hero image placeholder" ratio="16 / 9" /></div>
        <div className="hero-card">
          <h1>Say Hello to the Countdown Calendar!</h1>
          <div className="hero-rating"><Stars n={5} /> <span>Seven surprises, one per day</span></div>
          <Link className="btn hero-btn" to="/products/countdown-calendar">Shop {BRAND}</Link>
        </div>
      </section>

      <Link className="strip" to="/products/countdown-calendar"><Icon.fish /> <span>Open a door a day with the <u>Countdown Calendar</u>. Seven tiny surprises.</span> <Icon.right /></Link>

      <section className="sec colls">
        <div className="sec-head"><h2>Shop Featured Collections</h2><Link className="btn d-shop-all" to="/collections/all">Shop All</Link></div>
        <Slider kind="collection">
          {featured.map((c, i) => (
            <Link key={c} to={`/collections/${c}`} className="coll-card">
              <div className="coll-img"><Tin p={inCollection(c)[i % 2]} label={null} ratio="1 / 1" /></div>
              <h3>{collections[c].title}</h3>
              <p>{collections[c].blurb}</p>
            </Link>
          ))}
        </Slider>
        <div className="m-shop-all"><Link className="btn" to="/collections/all">Shop All</Link></div>
      </section>

      <Values />

      <section className="feature">
        <div className="feature-img"><Tin p={cal} label="Product lifestyle placeholder" ratio="1 / 1" /></div>
        <div className="feature-copy">
          <p className="eyebrow">Fresh out of the cannery!</p>
          <h2>{cal.name}</h2>
          <Link className="btn wide" to="/products/countdown-calendar">Explore More</Link>
          <p className="lede">{cal.desc}</p>
          <h3 className="inc-h">Behind the seven doors:</h3>
          <Includes items={['hot-smoked-coho', 'coho-black-garlic', 'sardines-orange-fennel', 'albacore-chili-oil', 'mussels-saffron', 'mackerel-peppercorn', 'serving-fork'].map(bySlug)} />
        </div>
      </section>

      <section className="sec compare-sec">
        <ScrubWords text="Choose Your Protein!" />
        <CompareScroller>
          <table className="compare">
            <caption className="sr-only">How tinned fish compares with other proteins</caption>
            <thead><tr><td />{compareCols.map((c, i) => <th key={c} scope="col" className={i === 0 ? 'us' : ''}>{i === 0 ? <span className="us-logo">{c}</span> : c}</th>)}</tr></thead>
            <tbody>
              {compareRows.map(([label, vals]) => (
                <tr key={label}><th scope="row">{label}</th>{vals.map((v, i) => <td key={i} className={i === 0 ? 'us' : ''}>{v === 1 ? <Yes /> : v === 0 ? <No /> : v}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </CompareScroller>
      </section>

      <Canneries />

      <Press />

      <section className="recipes-sec" aria-label="Recipes">
        <Slider kind="recipes">{recipes.map((r) => <HomeRecipe key={r.slug} r={r} />)}</Slider>
      </section>
    </>
  )
}

function Canneries() {
  const [i, setI] = useState(0)
  const c = canneries[i]
  const p = bySlug(c.product)
  return (
    <section className="sec canneries">
      <h2>Meet Our Producers</h2>
      <Slider kind="coverflow" onSlideChange={(sw) => setI(sw.realIndex)}>
        {canneries.map((x) => (
          <article key={x.name} className="cannery-card" tabIndex={0} aria-label={`${x.name}, ${x.place}`}>
            <div className="flip">
              <div className="face front"><Tin p={bySlug(x.product)} scene="boat" label="Producer photo placeholder" ratio="4 / 3" /></div>
              <div className="face back"><p>{x.text}</p></div>
            </div>
          </article>
        ))}
      </Slider>
      <div className="cannery-cap" aria-live="polite">
        <h3>{p.name}</h3>
        <dl><div><dt>Packed by</dt><dd>{c.name}</dd></div><div><dt>Found in</dt><dd>{c.place}</dd></div></dl>
        <Link className="btn" to={`/products/${p.slug}`}>Shop Now</Link>
      </div>
    </section>
  )
}

function Press() {
  const [i, setI] = useState(0)
  return (
    <section className="press-sec">
      <p className="press-quote" aria-live="polite">“{press[i].quote}”</p>
      <Slider kind="press" onSlideChange={(sw) => setI(sw.realIndex)}>
        {press.map((q, k) => <div key={q.outlet} className={`wordmark w${k % 5}`}>{q.outlet}</div>)}
      </Slider>
    </section>
  )
}

function HomeRecipe({ r }) {
  return (
    <div className="home-recipe">
      <div className="hr-copy">
        <Link to="/blogs/recipes" className="hr-eyebrow">{BRAND} Recipes</Link>
        <h2>{r.title}</h2>
        <p>{r.steps[0]}</p>
        <Link className="btn wide" to={`/blogs/recipes/${r.slug}`}>View Recipe</Link>
        <dl className="hr-stats"><div><dt>Serves</dt><dd>{r.serves}</dd></div><div><dt>Cook time</dt><dd>{r.time}</dd></div></dl>
      </div>
      <Tin p={{ tin: ['#fff7e9', r.color] }} scene="dish" label="Recipe photo placeholder" ratio="auto" />
    </div>
  )
}

function RecipeCard({ r }) {
  return (
    <Link to={`/blogs/recipes/${r.slug}`} className="recipe-card">
      <Tin p={{ tin: ['#fff7e9', r.color] }} scene="dish" label={null} ratio="4 / 3" />
      <div><small>{r.time} · Serves {r.serves}</small><h3>{r.title}</h3><span className="link">View Recipe →</span></div>
    </Link>
  )
}

/* ================= COMING SOON (bare "/") ================= */
export function ComingSoon() {
  const [state, setState] = useState('idle')
  const [err, setErr] = useState('')
  useEffect(() => { const t = document.title; document.title = 'dify.homes — coming soon'; return () => { document.title = t } }, [])
  const submit = async (e) => {
    e.preventDefault()
    setState('busy'); setErr('')
    try { await subscribeEmail(e.currentTarget.email.value, 'coming-soon'); setState('done') } catch (er) { setErr(er.message); setState('idle') }
  }
  return (
    <main className="soon">
      <div className="soon-art" aria-hidden><Tin p={{ tin: ['#fdcd62', '#73c3f5'] }} scene="hero" label={null} ratio="auto" /></div>
      <section className="soon-card">
        <p className="eyebrow">dify.homes</p>
        <h1>Coming soon.</h1>
        <p className="soon-lede">Something good is on its way. Leave your email and you’ll be the first to know when we open.</p>
        {state === 'done' ? <p className="notice" role="status">You’re on the list. See you soon!</p> : (
          <form onSubmit={submit} className="soon-form">
            <label htmlFor="soon-email" className="sr-only">Email address</label>
            <input id="soon-email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
            <button className="btn" disabled={state === 'busy'}>{state === 'busy' ? 'Adding…' : 'Notify me'}</button>
          </form>
        )}
        {err && <p className="err" role="alert">{err}</p>}
      </section>
      <footer className="soon-foot">© {new Date().getFullYear()} dify.homes</footer>
    </main>
  )
}

/* ================= COLLECTION ================= */
export function Collection() {
  const { handle = 'all' } = useParams()
  const c = collections[handle]
  const [fish, setFish] = useState('All')
  useEffect(() => { setFish('All') }, [handle])
  if (!c) return <NotFound />
  let list = inCollection(handle)
  const fishes = [...new Set(list.map((p) => p.fish).filter((f) => f && f !== 'Mixed'))]
  if (fish !== 'All') list = list.filter((p) => p.fish === fish)
  return (
    <>
      <Banner as="h2" title={`Shop ${c.title} & More!`} sub="Find all your favorite fish, bundles and merch." tint={[c.bg === '#fdcd62' ? '#f04a49' : '#fdcd62', c.bg]} />
      <nav className="coll-tabs" aria-label="Collections">{Object.entries(collections).map(([k, v]) => <Link key={k} to={`/collections/${k}`} className={`box ${k === handle ? 'on' : ''}`} aria-current={k === handle ? 'page' : undefined}>{v.title}</Link>)}</nav>
      <header className="coll-head"><h1>{c.title}</h1><p>{c.blurb}</p></header>
      {fishes.length > 1 && (
        <div className="coll-tabs sub" role="group" aria-label="Filter by species">
          {['All', ...fishes].map((f) => <button key={f} className={`box ${f === fish ? 'on' : ''}`} aria-pressed={f === fish} onClick={() => setFish(f)}>{f}</button>)}
        </div>
      )}
      <section className="sec grid-sec">
        <p className="sr-only" role="status">{list.length} products</p>
        <div className="grid">{list.map((p) => <ProductCard key={p.slug} p={p} />)}</div>
      </section>
    </>
  )
}

/* ================= PRODUCT ================= */
export function Product() {
  const { slug } = useParams()
  const p = bySlug(slug)
  const { add, setBuyNow } = useCart()
  const navigate = useNavigate()
  const [q, setQ] = useState(1)
  const [pack, setPack] = useState(1)
  const [gift, setGift] = useState(false)
  const [sub, setSub] = useState(false)
  const [notified, setNotified] = useState(false)
  const [stuck, setStuck] = useState(false)
  const buyRef = useRef()
  useEffect(() => {
    setQ(1); setPack(1); setGift(false); setSub(false); setNotified(false)
  }, [slug])
  useEffect(() => {
    const el = buyRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting && e.boundingClientRect.top < 0))
    io.observe(el)
    return () => io.disconnect()
  }, [slug])
  if (!p) return <NotFound />
  if (p.slug === 'bundle-builder') return <Bundles />
  const out = p.stock === 0
  const line = makeLine(p, { pack, gift, sub })
  const oneTime = makeLine(p, { pack, gift })
  const related = products.filter((x) => x.slug !== p.slug && x.price > 0 && x.cat.some((c) => p.cat.includes(c))).slice(0, 4)
  const recipe = recipes.find((r) => r.product === p.slug)
  const addIt = () => add(line, q)
  const buyNow = () => { setBuyNow([{ ...line, q }]); navigate('/checkout?buy=1') }
  const tinFor = (i) => ({ ...p, tin: i % 2 ? [...p.tin].reverse() : p.tin })
  return (
    <>
      <section className="pdp">
        <div className="pdp-gallery" aria-label="Product images">
          {[0, 1, 2, 3, 4].map((i) => <div key={i} className="g-img"><Tin p={tinFor(i)} label={`Product image ${i + 1}`} /></div>)}
        </div>
        <div className="pdp-gallery-m"><Slider kind="gallery">{[0, 1, 2, 3, 4].map((i) => <Tin key={i} p={tinFor(i)} label={`Product image ${i + 1}`} />)}</Slider></div>
        <div className="pdp-info">
          <a href="#reviews" className="rating-link"><Stars n={4.9} /><span>4.9</span><span className="sr-only"> out of 5, see reviews</span></a>
          <h1>{p.name}</h1>
          <p>{p.desc}</p>
          {out && <p className="badge static out">Sold Out</p>}
          {p.stock > 0 && p.stock < settings.lowStock && <p className="low"><UI.flame className="inl" /> Selling fast — only {p.stock} left</p>}

          {(packsFor(p).length > 1 || canGiftTin(p)) && (
            <div className="variant-select">
              <label htmlFor="variant" className="sr-only">Choose an option</label>
              <select id="variant" value={`${pack}|${+gift}`} onChange={(e) => { const [n, g] = e.target.value.split('|'); setPack(+n); setGift(g === '1') }}>
                {packsFor(p).flatMap((n) => (canGiftTin(p) ? [0, 1] : [0]).map((g) => {
                  const l = makeLine(p, { pack: n, gift: !!g })
                  return <option key={`${n}|${g}`} value={`${n}|${g}`}>{[p.name, n > 1 && `${n}-Pack${n === 3 ? ' (save 10%)' : n === 6 ? ' (save 15%)' : ''}`, g && 'with Gift Tin'].filter(Boolean).join(' – ')} – {money(l.unit)}</option>
                }))}
              </select>
              <Icon.chev />
            </div>
          )}
          {canSubscribe(p) && !out && (
            <fieldset className="opt purchase"><legend>Purchase options</legend>
              <label className={!sub ? 'on' : ''}><input type="radio" name="plan" checked={!sub} onChange={() => setSub(false)} /> <span>One-time purchase</span><b>{money(oneTime.unit)}</b></label>
              <label className={sub ? 'on' : ''}><input type="radio" name="plan" checked={sub} onChange={() => setSub(true)} /> <span>Subscribe &amp; Save {settings.subOff * 100}%<small>Delivered every 4 weeks · skip or cancel anytime</small></span><b>{money(makeLine(p, { pack, gift, sub: true }).unit)}</b></label>
            </fieldset>
          )}

          {out ? (
            notified ? <p className="notice">Thanks! We'll email you the moment it's back.</p> : (
              <form className="notify" onSubmit={(e) => { e.preventDefault(); setNotified(true) }}>
                <label htmlFor="notify">Back soon! Get an email when it restocks.</label>
                <div><input id="notify" type="email" required placeholder="Email address" /><button className="btn">Notify Me</button></div>
              </form>
            )
          ) : (
            <div ref={buyRef} className="buy-wrap">
              <div className="buy">
                <div className="qty big"><button onClick={() => setQ(Math.max(1, q - 1))} aria-label="Decrease quantity">−</button><span aria-live="polite">{q}</span><button onClick={() => setQ(q + 1)} aria-label="Increase quantity">+</button></div>
                <button className="btn full" onClick={addIt}>Add to Cart — {money(line.unit * q)}</button>
              </div>
              <button className="btn full express" onClick={buyNow}>Buy it now <UI.bolt className="inl" /></button>
            </div>
          )}
          <div className="accs">
            <Accordion icon="+" q="Tasting Notes" a={p.desc} />
            {p.fish && <Accordion icon="+" q="Nutrition" a={`Approx. ${p.protein}g protein and ${p.omega}g omega-3s per tin. Mercury: ${p.mercury}. (Illustrative values.)`} />}
            {p.origin && <Accordion icon="+" q="Sourcing" a={`Caught and packed in ${p.origin}. Every tin lists the producer on the back.`} />}
            {canGiftTin(p) && <Accordion icon="+" q="Gift Tin" a="A reusable illustrated keepsake tin — perfect for gifting, then for stashing trinkets." />}
            <Accordion icon="+" q="Shipping & Returns" a="Ships in 2 business days. Unopened items can be returned within 30 days." />
          </div>
          <ul className="benefits">
            <li><UI.fish /> Protein Packed</li>
            <li><UI.flame /> Big Flavor</li>
            <li><UI.truck /> Free Ship $75+</li>
          </ul>
        </div>
      </section>

      {!out && (
        <div className={`sticky-atc ${stuck ? 'on' : ''}`} aria-hidden={!stuck}>
          <div className="sticky-in">
            <Tin p={p} label={null} />
            <div><b>{p.name}</b><small>{money(line.unit)}{line.label && ` · ${line.label}`}</small></div>
            <button className="btn sm" tabIndex={stuck ? 0 : -1} onClick={addIt}>Add to Cart</button>
          </div>
        </div>
      )}

      {bundleIncludes[p.slug] && <WhatsInside slugs={bundleIncludes[p.slug]} />}
      <Values />
      {recipe && (
        <section className="sec sage pairing">
          <Tin p={{ tin: ['#fff7e9', recipe.color] }} scene="dish" label="Recipe photo placeholder" ratio="4 / 3" />
          <div><span className="eyebrow">Try it in</span><h2>{recipe.title}</h2><p>{recipe.time} · Serves {recipe.serves}</p><Link className="btn" to={`/blogs/recipes/${recipe.slug}`}>View Recipe</Link></div>
        </section>
      )}
      <Reviews slug={p.slug} />
      <section className="sec cream">
        <h2>You May Also Like</h2>
        <div className="grid">{related.map((x) => <ProductCard key={x.slug} p={x} />)}</div>
      </section>
    </>
  )
}

function Reviews({ slug }) {
  const all = reviewsFor(slug)
  const [sort, setSort] = useState('recent')
  const [stars, setStars] = useState(0)
  const [votes, setVotes] = useState({})
  const [writing, setWriting] = useState(false)
  const [mine, setMine] = useState([])
  let list = [...mine, ...all].filter((r) => !stars || r.stars === stars)
  list.sort(sort === 'helpful' ? (a, b) => b.helpful - a.helpful : sort === 'high' ? (a, b) => b.stars - a.stars : sort === 'low' ? (a, b) => a.stars - b.stars : (a, b) => b.date.localeCompare(a.date))
  const dist = [5, 4, 3, 2, 1].map((n) => [n, [...mine, ...all].filter((r) => r.stars === n).length])
  const total = all.length + mine.length
  return (
    <section className="sec reviews" id="reviews">
      <h2>What Fish Fans Say</h2>
      <p className="fine">Sample reviews for demonstration only.</p>
      <div className="rev-top">
        <div className="rev-score"><b>4.9</b><Stars n={4.9} /><small>{reviewCount(slug)} reviews</small></div>
        <div className="rev-dist">{dist.map(([n, c]) => (
          <button key={n} className={stars === n ? 'on' : ''} onClick={() => setStars(stars === n ? 0 : n)} aria-pressed={stars === n}>
            <span>{n} <UI.star className="inl on" /></span><span className="bar"><span style={{ width: `${(c / total) * 100}%` }} /></span><span>{c}</span>
          </button>
        ))}</div>
        <button className="btn" onClick={() => setWriting(!writing)}>{writing ? 'Cancel' : 'Write a Review'}</button>
      </div>
      {writing && (
        <form className="rev-form" onSubmit={(e) => {
          e.preventDefault()
          const f = new FormData(e.target)
          setMine([{ id: `m${Date.now()}`, stars: +f.get('stars'), title: f.get('title'), body: f.get('body'), name: 'You', date: new Date().toISOString().slice(0, 10), helpful: 0 }, ...mine])
          setWriting(false)
        }}>
          <label>Rating <select name="stars" defaultValue="5">{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} stars</option>)}</select></label>
          <label>Title <input name="title" required maxLength={80} /></label>
          <label>Review <textarea name="body" required maxLength={800} /></label>
          <button className="btn">Submit Review</button>
        </form>
      )}
      <div className="rev-bar">
        <span>{list.length} shown</span>
        <label>Sort <select value={sort} onChange={(e) => setSort(e.target.value)}><option value="recent">Most Recent</option><option value="helpful">Most Helpful</option><option value="high">Highest Rating</option><option value="low">Lowest Rating</option></select></label>
      </div>
      <div className="rev-list">{list.map((r) => (
        <article key={r.id} className="review">
          <header><b>{r.name}</b> <span className="verified"><UI.check className="inl" /> {r.name === 'You' ? 'Your review' : 'Sample'}</span><time>{r.date}</time></header>
          <Stars n={r.stars} />
          <h4>{r.title}</h4>
          <p>{r.body}</p>
          <button className="helpful" disabled={votes[r.id]} onClick={() => setVotes({ ...votes, [r.id]: true })}><UI.thumb className="inl" /> Helpful ({r.helpful + (votes[r.id] ? 1 : 0)})</button>
        </article>
      ))}</div>
    </section>
  )
}

/* ================= BUILD YOUR OWN BOX ================= */
export function Bundles() {
  const { add } = useCart()
  const tins = products.filter((p) => p.cat.includes('tinned-fish'))
  const [size, setSize] = useState(boxSizes[0])
  const [picks, setPicks] = useState([])
  const [msg, setMsg] = useState('')
  const [sheet, setSheet] = useState(false)
  const full = picks.length >= size.n
  const pick = (slug) => { if (full) return setMsg(`Your box holds ${size.n} tins. Remove one or pick a bigger box.`); setMsg(''); setPicks([...picks, slug]) }
  const unpick = (k) => setPicks(picks.filter((_, j) => j !== k))
  const changeSize = (b) => { setSize(b); setPicks(picks.slice(0, b.n)); setMsg('') }
  const sum = picks.reduce((s, k) => s + bySlug(k).price, 0)
  const total = sum
  const complete = () => {
    const counts = picks.reduce((m, k) => ({ ...m, [k]: (m[k] || 0) + 1 }), {})
    Object.entries(counts).forEach(([k, q]) => add(makeLine(bySlug(k)), q))
    setMsg('')
    setPicks([])
  }
  return (
    <>
      <Banner title="Build Your Own Box" sub="Pick 6, 9 or 12 tins — mix and match your favorites." scene="banner" tint={['#f04a49', '#fdcd62']} />
      <section className="builder">
        <div className="b-sizes b-sizes-m" role="radiogroup" aria-label="Box size">
          {boxSizes.map((b) => <button key={b.n} role="radio" aria-checked={size.n === b.n} className={size.n === b.n ? 'on' : ''} onClick={() => changeSize(b)}>{b.n} Tins</button>)}
        </div>
        <div className="b-grid">
          {tins.map((p) => {
            const out = p.stock === 0
            return (
              <div key={p.slug} className={`b-item ${out ? 'out' : ''}`}>
                <div className="b-img"><Tin p={p} label={null} />{out && <span className="sold">Sold Out</span>}</div>
                <h3>{p.name}</h3>
                <Link to={`/products/${p.slug}`} className="b-info">Product Info</Link>
                <button className="btn full" disabled={out} onClick={() => pick(p.slug)}>{out ? 'Out of Stock' : 'Add to Box'}</button>
              </div>
            )
          })}
        </div>
        <aside className={`b-panel ${sheet ? 'open' : ''}`} aria-label="Your box">
          <button className="b-sheet-bar" onClick={() => setSheet(!sheet)} aria-expanded={sheet}><span>{picks.length}/{size.n} Tins Selected</span><Icon.chev /><b>{money(total)}</b></button>
          <div className="b-step">
            <h2><span className="num">1</span> Pick Your Box Size</h2>
            <div className="b-sizes" role="radiogroup" aria-label="Box size">
              {boxSizes.map((b) => <button key={b.n} role="radio" aria-checked={size.n === b.n} className={size.n === b.n ? 'on' : ''} onClick={() => changeSize(b)}>{b.n} Tins</button>)}
            </div>
          </div>
          <div className="b-step">
            <h2><span className="num">2</span> Pick Your Tins</h2>
            <div className="b-prog" aria-label={`${picks.length} of ${size.n} tins picked`}><span style={{ width: `${(picks.length / size.n) * 100}%` }} /><i>{picks.length}</i><i>{size.n}</i></div>
            <div className="b-slots">
              {Array.from({ length: size.n }, (_, k) => picks[k] ? (
                <button key={k} className="slot filled" onClick={() => unpick(k)} aria-label={`Remove ${bySlug(picks[k]).name}`}><Tin p={bySlug(picks[k])} label={null} /><span>Remove</span></button>
              ) : <div key={k} className="slot"><span>Add your next tin</span></div>)}
            </div>
            <p className="b-msg" role="status">{msg}</p>
          </div>
          <div className="b-total"><span>Total:</span>{total >= settings.freeShip && <em className="tag-free">Free Shipping</em>}<b>{money(total)}</b></div>
          <button className="btn full" disabled={!full} onClick={complete}>{full ? 'Complete Your Box' : `Add ${size.n - picks.length} more tin${size.n - picks.length === 1 ? '' : 's'}`}</button>
          <p className="fine left">Free shipping on orders over {money(settings.freeShip)}.</p>
        </aside>
      </section>
    </>
  )
}

/* ================= STORY ================= */
export function Story() {
  const parts = [
    ['Where it started', 'Two friends, one tiny kitchen and a pile of tins that tasted like cardboard. We knew it could be better — so we started calling small smokehouses and canneries.', 'boat', ['#fdcd62', '#73c3f5']],
    ['How we source', 'We only work with producers who can tell us the boat, the bay and the season. If we can’t trace it, we don’t tin it.', 'map', ['#fdcd62', '#73c3f5']],
    ['Why flavor matters', 'Good fish deserves good seasoning. Every recipe is developed and tasted until it works on toast, rice, pasta and straight from the tin.', 'dish', ['#fdcd62', '#c7e0c3']],
    ['Why we love tins', 'A tin is protein you can keep for years, carry anywhere and open in seconds. It turns a plain salad or a bowl of rice into dinner.', 'hero', ['#73c3f5', '#fdcd62']],
  ]
  return (
    <>
      <Banner title={`Welcome to ${BRAND}`} sub="Pantry food, but make it a party." scene="banner" />
      {parts.map(([h, t, scene, tint], i) => (
        <section key={h} className={`story-row ${i % 2 ? 'rev' : ''}`}>
          <Tin p={{ tin: tint }} scene={scene} label="Story photo placeholder" ratio="5 / 4" />
          <div><h2><span className="num">{i + 1}</span> {h}</h2><p>{t}</p></div>
        </section>
      ))}
      <Canneries />
    </>
  )
}

/* ================= RECIPES ================= */
export function Recipes() {
  const [q, setQ] = useState('')
  const [f, setF] = useState('all')
  const [shown, setShown] = useState(8)
  const all = [...recipes.map((r) => ({ ...r, type: 'recipe' })), ...articles]
  const list = all.filter((x) => (f === 'all' || x.type === f) && x.title.toLowerCase().includes(q.toLowerCase()))
  const [feat1, feat2] = [all.find((x) => x.type === 'recipe'), all.find((x) => x.type === 'article')]
  return (
    <>
      <Banner title={`${BRAND} Recipe Library`} sub="Flavorful ideas designed to make the most of every tin." scene="dish" tint={['#fff7e9', '#73c3f5']} />
      <section className="sec blog">
        <label className="blog-search"><Icon.search /><span className="sr-only">Search recipes and stories</span><input type="search" placeholder="Search our recipes and stories..." value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <div className="blog-filter" role="group" aria-label="Filter posts">
          {[['all', 'All Posts'], ['recipe', 'Recipes'], ['article', 'Articles']].map(([k, l]) => <button key={k} className={`pill ${f === k ? 'on' : ''}`} aria-pressed={f === k} onClick={() => setF(k)}>{l}</button>)}
        </div>
        {!q && f === 'all' && (
          <div className="blog-feat">
            {[feat1, feat2].map((x, k) => (
              <Link key={x.slug} to={`/blogs/recipes/${x.slug}`} className={`feat-card ${k ? 'green' : 'blue'}`}>
                <div className="fc-img"><Tin p={{ tin: ['#fff7e9', x.color] }} scene={x.type === 'recipe' ? 'dish' : 'boat'} label={null} ratio="auto" /><span className="tag">Featured {x.type}</span></div>
                <div className="fc-copy"><h3>{x.title}</h3><p>{x.type === 'recipe' ? x.steps[0] : x.body[0]}</p><span className="btn sm">{x.type === 'recipe' ? 'View Recipe' : 'Read the Story'}</span></div>
              </Link>
            ))}
          </div>
        )}
        <div className="blog-grid">
          {list.slice(0, shown).map((x) => (
            <Link key={x.slug} to={`/blogs/recipes/${x.slug}`} className="post">
              <div className="post-img"><Tin p={{ tin: ['#fff7e9', x.color] }} scene={x.type === 'recipe' ? 'dish' : 'boat'} label={null} /><span className={`tag ${x.type}`}>{x.type}</span></div>
              <h3>{x.title}</h3>
            </Link>
          ))}
        </div>
        {!list.length && <p className="center">No posts match “{q}”.</p>}
        {list.length > shown && <div className="center"><button className="btn" onClick={() => setShown(shown + 8)}>Load more</button></div>}
      </section>
    </>
  )
}

export function Recipe() {
  const { slug } = useParams()
  const { addSlug } = useCart()
  const r = recipes.find((x) => x.slug === slug) || articles.find((x) => x.slug === slug)
  if (!r) return <NotFound />
  const p = r.product && bySlug(r.product)
  const Features = p && (
    <div className="features">
      <h3>This Recipe Features:</h3>
      <div className="feat-prod"><Link to={`/products/${p.slug}`} className="fp-img"><Tin p={p} label={null} /></Link><div><Link to={`/products/${p.slug}`}><h4>{p.name}</h4></Link><p>{money(p.price)}</p><button className="btn full" onClick={() => addSlug(p.slug)}>Quick Add</button></div></div>
    </div>
  )
  return (
    <article className="recipe">
      <div className="r-top">
        <div className="r-head">
          <Link to="/blogs/recipes" className="hr-eyebrow">{r.type === 'article' ? 'Stories' : 'Recipes'}</Link>
          <h1>{r.title}</h1>
          <p className="r-by">{r.type === 'article' ? 'Words' : 'Recipe'} by <u>the {BRAND} kitchen</u></p>
          <dl className="hr-stats">{r.serves && <div><dt>Serves</dt><dd>{r.serves}</dd></div>}<div><dt>{r.type === 'article' ? 'Read time' : 'Cook time'}</dt><dd>{r.time}</dd></div></dl>
          <p className="r-intro">{r.type === 'article' ? r.body[0] : `A tin-first take that comes together in ${r.time}. ${r.steps[0]}`}</p>
        </div>
        <div className="r-media">
          <Tin p={{ tin: ['#fff7e9', r.color] }} scene={r.type === 'article' ? 'boat' : 'dish'} label="Recipe photo placeholder" ratio="auto" />
          {Features}
        </div>
      </div>
      {r.type === 'article' ? (
        <div className="r-body article">{r.body.slice(1).map((t) => <p key={t}>{t}</p>)}</div>
      ) : (
        <div className="r-body">
          <div><h3>Ingredients</h3><ul>{r.ingredients.map((x) => <li key={x}>{x}</li>)}</ul></div>
          <div><h3>Directions</h3><ol>{r.steps.map((x) => <li key={x}>{x}</li>)}</ol></div>
        </div>
      )}
      {Features && <div className="features-wide">{Features}</div>}
    </article>
  )
}

/* ================= STORE LOCATOR ================= */
export function StoreLocator() {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(null)
  const list = stores.filter((s) => (s.name + s.city + s.addr).toLowerCase().includes(q.toLowerCase()))
  return (
    <>
      <section className="finder">
        <div className="finder-deco" aria-hidden><StarIcon x="4%" y="20%" /><StarIcon x="30%" y="40%" /><StarIcon x="72%" y="16%" /><StarIcon x="92%" y="54%" /></div>
        <h1>Find a Store!</h1>
        <p className="finder-sub">Type in your city or store name to find a shelf near you.</p>
        <div className="finder-ui">
          <div className="finder-list">
            <form className="finder-search" onSubmit={(e) => e.preventDefault()}><label className="sr-only" htmlFor="loc-q">City or store</label><input id="loc-q" placeholder="Type a city or store name..." value={q} onChange={(e) => setQ(e.target.value)} /><button aria-label="Search"><Icon.search /></button></form>
            <ul>
              {list.map((s) => <li key={s.name}><button className={sel === s.name ? 'on' : ''} onClick={() => setSel(s.name)}><Pin /><span><b>{s.name}</b><br />{s.addr}<br />{s.city}</span></button></li>)}
              {!list.length && <li className="none">No stores found.</li>}
            </ul>
          </div>
          <div className="finder-map"><Tin p={{ tin: ['#fdcd62', '#73c3f5'] }} scene="map" label={sel ? `Selected: ${sel}` : 'Map placeholder'} ratio="auto" /></div>
        </div>
      </section>
      <section className="retail-band" aria-label="Retail partners">
        <Slider kind="press">{stores.map((s, k) => <div key={s.name} className={`wordmark w${k % 5}`}>{s.name}</div>)}</Slider>
      </section>
      <section className="sec where">
        <p className="where-pre">where to find us in</p>
        <h2 className="where-h">RETAIL STORES</h2>
        <div className="where-grid">
          {[['Tinned Goods Aisle', 'Look for us near the olives, capers and other pantry heroes.', 'hero'], ['Cheese & Specialty', 'Building a snack board? We’re often right beside the fancy crackers.', 'dish'], ['Seafood Counter', 'Some shops keep us by the fresh fish. Shelf-stable, still counter-worthy.', 'boat']].map(([h, t, sc]) => (
            <div key={h} className="where-card"><Tin p={{ tin: ['#fdcd62', '#c7e0c3'] }} scene={sc} label={null} /><h3>{h}</h3><p>{t}</p></div>
          ))}
        </div>
      </section>
      <section className="online">
        <p className="where-pre">shop with our</p>
        <h2 className="where-h">ONLINE PARTNERS</h2>
        <p><b>Demo partner names — swap in your real retailers.</b></p>
      </section>
      <section className="online-logos" aria-label="Online partners">
        {['Cartwheel', 'Pantry Post', 'Grocer Box', 'Basket & Co'].map((n, k) => <span key={n} className={`wordmark w${k}`}>{n}</span>)}
      </section>
    </>
  )
}

/* ================= FAQ ================= */
export function FAQ() {
  return (
    <section className="faq">
      <h1>FAQ</h1>
      {faqs.map((g, i) => <FaqGroup key={g.group} g={g} first={i === 0} />)}
    </section>
  )
}

function FaqGroup({ g, first }) {
  const [open, setOpen] = useState(first ? 0 : -1)
  return (
    <div className="faq-group">
      <h2>{g.group}</h2>
      {g.items.map(([q, a], i) => <Accordion key={q} q={q} a={a} icon="arrow" open={open === i} onToggle={() => setOpen(open === i ? -1 : i)} />)}
    </div>
  )
}

/* ================= INFO / LEGAL ================= */
const info = {
  terms: ['Terms of Service', 'This is a demo storefront. No real orders are processed, and these placeholder terms have no legal effect.'],
  privacy: ['Privacy Policy', 'This demo stores your cart only in your own browser. No data is collected or sent anywhere.'],
  accessibility: ['Accessibility', 'We aim for clear contrast, keyboard-navigable menus and descriptive labels throughout this demo.'],
  'corporate-gifting': ['Corporate Gifting', 'Sending 25+ boxes? We offer custom notes, branded sleeves and bulk pricing. (Demo copy.)'],
  refer: ['Refer a Friend', 'Give a friend 15% off their first box and get $10 when they order. (Demo copy.)'],
}
export function Info() {
  const { page } = useParams()
  const x = info[page]
  if (!x) return <NotFound />
  return (<><PageHero title={x[0]} bg="#fff7e9" /><section className="sec narrow"><p>{x[1]}</p></section></>)
}

export function NotFound() {
  return <section className="sec center notfound"><h1>404</h1><p>This page swam away.</p><Link className="btn" to="/home">Back to Home</Link></section>
}
